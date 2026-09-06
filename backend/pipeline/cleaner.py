import numpy as np
import pandas as pd
from datetime import datetime, date
from sqlalchemy.orm import Session
from database.models import RawFareQuote, CleanedFareQuote, DailyRouteAggregate

def decompose_fare(total_fare: float):
    """
    Decomposes total fare into base, taxes/fees, and convenience fees.
    Typically, taxes_fees are ~20% of base fare and convenience fee is fixed around 300 INR.
    """
    if total_fare <= 350:
        return total_fare, 0.0, 0.0
    
    convenience_fee = 350.0
    remaining = total_fare - convenience_fee
    
    # 83% base, 17% taxes
    base_fare = round(remaining * 0.83, 2)
    taxes_fees = round(remaining * 0.17, 2)
    
    return base_fare, taxes_fees, convenience_fee

def clean_raw_quotes(db: Session, raw_quotes: list[RawFareQuote]) -> list[CleanedFareQuote]:
    """
    Cleans a batch of raw quotes:
    1. Deduplicates (same flight_number, departure_date, carrier_id, source_id, total_fare).
    2. Filters out sold out flights (retains them in raw table, skips in cleaned).
    3. Flags outliers using IQR per route & advance purchase days.
    4. Performs missing value imputations.
    """
    cleaned_records = []
    if not raw_quotes:
        return cleaned_records

    # Convert to DataFrame for pandas vectorized calculations
    data = []
    for q in raw_quotes:
        if q.scrape_status != "success":
            continue
        # Skip sold out flights from aggregates
        if q.is_sold_out:
            continue
            
        data.append({
            "id": q.id,
            "route_id": q.route_id,
            "carrier_id": q.carrier_id,
            "source_id": q.source_id,
            "departure_date": q.departure_date,
            "advance_purchase_days": q.advance_purchase_days,
            "total_fare": q.total_fare,
            "base_fare": q.base_fare,
            "flight_number": q.flight_number,
        })

    if not data:
        return cleaned_records

    df = pd.DataFrame(data)

    # 1. Deduplicate by keeping the cheapest total_fare per flight, route, carrier, source, and date
    df = df.sort_values(by="total_fare")
    df = df.drop_duplicates(
        subset=["route_id", "carrier_id", "source_id", "departure_date", "flight_number", "advance_purchase_days"],
        keep="first"
    )

    # 2. Outlier detection using IQR grouped by route_id and advance_purchase_days
    df["is_outlier"] = False
    df["outlier_reason"] = None

    # We perform IQR only if there are enough points (e.g. >= 3 points), otherwise use static thresholds
    for (route_id, adv_days), group in df.groupby(["route_id", "advance_purchase_days"]):
        fares = group["total_fare"].values
        
        # Static thresholds
        static_low = 1200.0
        static_high = 60000.0
        
        if len(fares) >= 3:
            q25, q75 = np.percentile(fares, [25, 75])
            iqr = q75 - q25
            lower_bound = max(static_low, q25 - 1.5 * iqr)
            upper_bound = min(static_high, q75 + 1.5 * iqr)
        else:
            # Fallback to static boundaries if data size is small
            lower_bound = static_low
            upper_bound = static_high

        # Flag elements
        for idx in group.index:
            fare = df.loc[idx, "total_fare"]
            if fare < lower_bound:
                df.at[idx, "is_outlier"] = True
                df.at[idx, "outlier_reason"] = f"Price {fare} below threshold {lower_bound:.1f} (IQR)"
            elif fare > upper_bound:
                df.at[idx, "is_outlier"] = True
                df.at[idx, "outlier_reason"] = f"Price {fare} above threshold {upper_bound:.1f} (IQR)"

    # Create CleanedFareQuote objects
    for _, row in df.iterrows():
        cleaned = CleanedFareQuote(
            raw_quote_id=int(row["id"]),
            route_id=int(row["route_id"]),
            carrier_id=int(row["carrier_id"]),
            source_id=int(row["source_id"]),
            departure_date=row["departure_date"],
            advance_purchase_days=int(row["advance_purchase_days"]),
            base_fare=float(row["base_fare"]),
            total_fare=float(row["total_fare"]),
            is_outlier=bool(row["is_outlier"]),
            outlier_reason=row["outlier_reason"],
            quality_score=50.0 if row["is_outlier"] else 100.0,
            processed_at=datetime.utcnow()
        )
        cleaned_records.append(cleaned)

    return cleaned_records

def create_daily_aggregates(db: Session, target_date: date):
    """
    Aggregates CleanedFareQuotes for a given date into DailyRouteAggregate entries.
    Filters out outliers.
    If a route has no records for a specific advance_purchase_days, it attempts 
    to impute the fare by copying forward the previous day's aggregate median fare (forward fill).
    """
    from sqlalchemy import func
    
    # Get active routes
    from database.models import Route, Carrier
    routes = db.query(Route).filter(Route.is_active == True).all()
    carriers = db.query(Carrier).filter(Carrier.is_active == True).all()
    carrier_map = {c.id: c.code for c in carriers}
    
    advance_windows = [1, 7, 15, 30, 45]
    
    for route in routes:
        for adv_days in advance_windows:
            # Query non-outlier quotes for this route and window, departing on target_date
            quotes = db.query(CleanedFareQuote).filter(
                CleanedFareQuote.route_id == route.id,
                CleanedFareQuote.departure_date == target_date,
                CleanedFareQuote.advance_purchase_days == adv_days,
                CleanedFareQuote.is_outlier == False
            ).all()

            if not quotes:
                # Missing value handling: Imputation using last valid price (forward fill)
                # Look for the latest non-empty aggregate for this route and window in the past 7 days
                prev_agg = db.query(DailyRouteAggregate).filter(
                    DailyRouteAggregate.route_id == route.id,
                    DailyRouteAggregate.advance_purchase_days == adv_days,
                    DailyRouteAggregate.date < target_date
                ).order_by(DailyRouteAggregate.date.desc())
                prev_agg = prev_agg.first()

                if prev_agg:
                    # Impute using carry-forward with logged note
                    new_agg = DailyRouteAggregate(
                        route_id=route.id,
                        date=target_date,
                        advance_purchase_days=adv_days,
                        avg_fare=prev_agg.avg_fare,
                        median_fare=prev_agg.median_fare,
                        min_fare=prev_agg.min_fare,
                        max_fare=prev_agg.max_fare,
                        sample_size=0,  # 0 indicates imputed data
                        carrier_breakdown={"imputed": True, "source_date": str(prev_agg.date)}
                    )
                    db.add(new_agg)
                continue

            # Calculate stats
            fares = [q.total_fare for q in quotes]
            avg_fare = float(np.mean(fares))
            median_fare = float(np.median(fares))
            min_fare = float(np.min(fares))
            max_fare = float(np.max(fares))
            sample_size = len(fares)

            # Build carrier breakdown
            breakdown = {}
            for q in quotes:
                ccode = carrier_map.get(q.carrier_id, "UNK")
                if ccode not in breakdown:
                    breakdown[ccode] = []
                breakdown[ccode].append(q.total_fare)
            
            carrier_breakdown = {}
            for code, prices in breakdown.items():
                carrier_breakdown[code] = {
                    "avg": float(np.mean(prices)),
                    "median": float(np.median(prices)),
                    "min": float(np.min(prices)),
                    "max": float(np.max(prices)),
                    "count": len(prices)
                }

            # Save aggregate
            agg = DailyRouteAggregate(
                route_id=route.id,
                date=target_date,
                advance_purchase_days=adv_days,
                avg_fare=avg_fare,
                median_fare=median_fare,
                min_fare=min_fare,
                max_fare=max_fare,
                sample_size=sample_size,
                carrier_breakdown=carrier_breakdown
            )
            db.add(agg)
            
    db.commit()
