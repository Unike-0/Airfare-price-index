from datetime import datetime, date, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.models import Route, DailyRouteAggregate, ApixIndexValue

# Default base fares for routes if we can't find them in the database for the base date.
# Prevents divide-by-zero or empty calculations.
DEFAULT_BASE_FARES = {
    "DEL-BOM": 5500.0,
    "DEL-BLR": 6500.0,
    "BOM-BLR": 4800.0,
    "DEL-CCU": 5800.0,
    "BLR-HYD": 3800.0,
    "MAA-DEL": 5200.0
}

def get_base_fares(db: Session, base_date: date) -> dict[int, float]:
    """
    Get base fares for all routes on the base date.
    Returns a dict mapping route_id to base price.
    """
    routes = db.query(Route).filter(Route.is_active == True).all()
    base_fares = {}
    
    for r in routes:
        route_key = f"{r.origin_code}-{r.destination_code}"
        # Query average median fare on the base date across all advance purchase windows
        median_fare = db.query(func.avg(DailyRouteAggregate.median_fare)).filter(
            DailyRouteAggregate.route_id == r.id,
            DailyRouteAggregate.date == base_date
        ).scalar()
        
        if median_fare:
            base_fares[r.id] = float(median_fare)
        else:
            base_fares[r.id] = DEFAULT_BASE_FARES.get(route_key, 5000.0)
            
    return base_fares

def calculate_apix_index(db: Session, target_date: date, base_date: date = None):
    """
    Calculates the APIx index value for a target date.
    Saves daily, weekly (7-day average), and monthly (30-day average) records.
    """
    # 1. Determine base date (if none provided, use the oldest date in daily_route_aggregates or fallback to 35 days ago)
    if not base_date:
        oldest_date = db.query(func.min(DailyRouteAggregate.date)).scalar()
        if oldest_date:
            base_date = oldest_date
        else:
            base_date = target_date - timedelta(days=35)

    base_fares = get_base_fares(db, base_date)
    
    # 2. Get active routes & normalize traffic weights
    routes = db.query(Route).filter(Route.is_active == True).all()
    if not routes:
        return
        
    total_weight = sum(r.dgca_traffic_weight for r in routes)
    if total_weight == 0:
        total_weight = 1.0
        
    normalized_weights = {r.id: r.dgca_traffic_weight / total_weight for r in routes}

    # 3. Fetch daily median fares for target_date (across all advance windows combined)
    weighted_relative_sum = 0.0
    active_routes_count = 0
    route_weights_audit = {}

    for r in routes:
        # Get average median fare across the different advance windows (T+1, T+7, etc.) on target_date
        avg_median = db.query(func.avg(DailyRouteAggregate.median_fare)).filter(
            DailyRouteAggregate.route_id == r.id,
            DailyRouteAggregate.date == target_date
        ).scalar()

        if avg_median:
            avg_median = float(avg_median)
            base_p = base_fares.get(r.id, 5000.0)
            price_relative = (avg_median / base_p) * 100
            weight = normalized_weights[r.id]
            weighted_relative_sum += price_relative * weight
            route_weights_audit[r.id] = {
                "code": f"{r.origin_code}-{r.destination_code}",
                "weight": weight,
                "base_fare": base_p,
                "current_fare": avg_median,
                "relative": price_relative
            }
            active_routes_count += 1

    if active_routes_count == 0:
        # No quotes found for this day, skip calculations
        return

    # Calculate index
    daily_index = weighted_relative_sum

    # Save daily index
    # Delete existing if we are recalculating
    db.query(ApixIndexValue).filter(
        ApixIndexValue.index_date == target_date,
        ApixIndexValue.frequency == "daily"
    ).delete()

    # Calculate changes
    prev_day = db.query(ApixIndexValue).filter(
        ApixIndexValue.index_date == target_date - timedelta(days=1),
        ApixIndexValue.frequency == "daily"
    ).first()
    
    pct_change_dod = None
    if prev_day and prev_day.index_value > 0:
        pct_change_dod = ((daily_index - prev_day.index_value) / prev_day.index_value) * 100

    prev_month = db.query(ApixIndexValue).filter(
        ApixIndexValue.index_date == target_date - timedelta(days=30),
        ApixIndexValue.frequency == "daily"
    ).first()
    
    pct_change_mom = None
    if prev_month and prev_month.index_value > 0:
        pct_change_mom = ((daily_index - prev_month.index_value) / prev_month.index_value) * 100

    # Year-on-year (placeholder for now)
    pct_change_yoy = None

    db_daily = ApixIndexValue(
        index_date=target_date,
        frequency="daily",
        index_value=daily_index,
        base_period_value=100.0,
        pct_change_dod=pct_change_dod,
        pct_change_mom=pct_change_mom,
        pct_change_yoy=pct_change_yoy,
        methodology_version="1.0",
        route_weights_used=route_weights_audit
    )
    db.add(db_daily)
    db.commit()

    # 4. Weekly Index (7-day rolling average of daily index)
    weekly_avg = db.query(func.avg(ApixIndexValue.index_value)).filter(
        ApixIndexValue.frequency == "daily",
        ApixIndexValue.index_date >= target_date - timedelta(days=6),
        ApixIndexValue.index_date <= target_date
    ).scalar()

    if weekly_avg:
        db.query(ApixIndexValue).filter(
            ApixIndexValue.index_date == target_date,
            ApixIndexValue.frequency == "weekly"
        ).delete()
        
        db_weekly = ApixIndexValue(
            index_date=target_date,
            frequency="weekly",
            index_value=float(weekly_avg),
            base_period_value=100.0,
            pct_change_dod=None,
            pct_change_mom=None,
            pct_change_yoy=None,
            methodology_version="1.0",
            route_weights_used=route_weights_audit
        )
        db.add(db_weekly)

    # 5. Monthly Index (30-day rolling average of daily index)
    monthly_avg = db.query(func.avg(ApixIndexValue.index_value)).filter(
        ApixIndexValue.frequency == "daily",
        ApixIndexValue.index_date >= target_date - timedelta(days=29),
        ApixIndexValue.index_date <= target_date
    ).scalar()

    if monthly_avg:
        db.query(ApixIndexValue).filter(
            ApixIndexValue.index_date == target_date,
            ApixIndexValue.frequency == "monthly"
        ).delete()
        
        db_monthly = ApixIndexValue(
            index_date=target_date,
            frequency="monthly",
            index_value=float(monthly_avg),
            base_period_value=100.0,
            pct_change_dod=None,
            pct_change_mom=None,
            pct_change_yoy=None,
            methodology_version="1.0",
            route_weights_used=route_weights_audit
        )
        db.add(db_monthly)

    db.commit()
