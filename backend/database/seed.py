import os
import random
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
import bcrypt

from database.session import engine, SessionLocal
from database.models import Base, User, Route, Carrier, Source, RawFareQuote, DgcaBenchmarkData
from pipeline.cleaner import clean_raw_quotes, create_daily_aggregates, decompose_fare
from pipeline.index_builder import calculate_apix_index

# CryptContext replaced by direct bcrypt calls

def seed_static_data(db: Session):
    print("Seeding static data (users, routes, carriers, sources)...")
    
    # 1. Users with distinct roles
    users_to_seed = [
        {"username": "admin", "password": "admin123", "role": "admin"},
        {"username": "analyst", "password": "analyst123", "role": "analyst"},
        {"username": "nso_user", "password": "nso123", "role": "api_user", "api_key": "apix_key_nso_bronze", "api_tier": "bronze", "api_limit": 100},
        {"username": "rbi_user", "password": "rbi123", "role": "api_user", "api_key": "apix_key_rbi_silver", "api_tier": "silver", "api_limit": 1000},
        {"username": "gov_bulk", "password": "gov123", "role": "api_user", "api_key": "apix_key_gov_gold", "api_tier": "gold", "api_limit": 5000},
    ]

    for u_data in users_to_seed:
        user = db.query(User).filter(User.username == u_data["username"]).first()
        if not user:
            hashed_password = bcrypt.hashpw(u_data["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            user = User(
                username=u_data["username"],
                hashed_password=hashed_password,
                role=u_data["role"],
                api_key=u_data.get("api_key"),
                api_tier=u_data.get("api_tier", "bronze"),
                api_limit=u_data.get("api_limit", 0),
                is_active=True
            )
            db.add(user)

    # 2. Routes (city-pairs) with DGCA weights
    routes_data = [
        {"origin_code": "DEL", "origin_city": "Delhi", "destination_code": "BOM", "destination_city": "Mumbai", "dgca_traffic_weight": 0.25},
        {"origin_code": "DEL", "origin_city": "Delhi", "destination_code": "BLR", "destination_city": "Bengaluru", "dgca_traffic_weight": 0.18},
        {"origin_code": "BOM", "origin_city": "Mumbai", "destination_code": "BLR", "destination_city": "Bengaluru", "dgca_traffic_weight": 0.15},
        {"origin_code": "DEL", "origin_city": "Delhi", "destination_code": "CCU", "destination_city": "Kolkata", "dgca_traffic_weight": 0.12},
        {"origin_code": "BLR", "origin_city": "Bengaluru", "destination_code": "HYD", "destination_city": "Hyderabad", "dgca_traffic_weight": 0.10},
        {"origin_code": "MAA", "origin_city": "Chennai", "destination_code": "DEL", "destination_city": "Delhi", "dgca_traffic_weight": 0.20},
    ]
    
    routes = []
    for r in routes_data:
        db_route = db.query(Route).filter(
            Route.origin_code == r["origin_code"],
            Route.destination_code == r["destination_code"]
        ).first()
        if not db_route:
            db_route = Route(**r)
            db.add(db_route)
        routes.append(db_route)

    # 3. Carriers
    carriers_data = [
        {"code": "6E", "name": "IndiGo"},
        {"code": "AI", "name": "Air India"},
        {"code": "SG", "name": "SpiceJet"},
        {"code": "QP", "name": "Akasa Air"},
        {"code": "IX", "name": "Air India Express"},
    ]
    
    carriers = []
    for c in carriers_data:
        db_carrier = db.query(Carrier).filter(Carrier.code == c["code"]).first()
        if not db_carrier:
            db_carrier = Carrier(**c)
            db.add(db_carrier)
        carriers.append(db_carrier)

    # 4. Sources
    sources_data = [
        {"name": "IndiGo Direct", "source_type": "airline_website", "base_url": "https://www.goindigo.in"},
        {"name": "Air India Direct", "source_type": "airline_website", "base_url": "https://www.airindia.com"},
        {"name": "MakeMyTrip", "source_type": "ota", "base_url": "https://www.makemytrip.com"},
        {"name": "Yatra", "source_type": "ota", "base_url": "https://www.yatra.com"},
    ]
    
    sources = []
    for s in sources_data:
        db_source = db.query(Source).filter(Source.name == s["name"]).first()
        if not db_source:
            db_source = Source(**s)
            db.add(db_source)
        sources.append(db_source)

    db.commit()
    print("Static data seeding completed.")
    return routes, carriers, sources

def seed_historical_quotes(db: Session, routes, carriers, sources):
    print("Generating 35 days of historical airfare data...")
    
    # Check if we already have fare quotes to prevent double seeding
    existing_quotes = db.query(RawFareQuote).limit(1).first()
    if existing_quotes:
        print("Historical airfare data already exists, skipping quote generation.")
        return

    # Seed parameters
    start_date = date.today() - timedelta(days=35)
    end_date = date.today()
    
    # Base median prices per route
    route_base_fares = {
        "DEL-BOM": 4800.0,
        "DEL-BLR": 5800.0,
        "BOM-BLR": 4200.0,
        "DEL-CCU": 5200.0,
        "BLR-HYD": 3200.0,
        "MAA-DEL": 4700.0
    }
    
    advance_windows = [1, 7, 15, 30, 45]
    
    # Advance purchase multipliers
    window_multipliers = {
        1: 2.5,   # Lead time T+1: heavy premium
        7: 1.6,   # Lead time T+7
        15: 1.3,  # Lead time T+15
        30: 1.05, # Lead time T+30
        45: 0.95  # Lead time T+45
    }

    # Generate data day-by-day
    current_date = start_date
    while current_date <= end_date:
        raw_quotes_to_add = []
        
        # We iterate over routes, carriers, and windows to simulate scrapes
        for r in routes:
            route_key = f"{r.origin_code}-{r.destination_code}"
            base_f = route_base_fares.get(route_key, 4500.0)
            
            # Simulate slight overall seasonal index trend over the 35 days (e.g. rising by 5% towards today)
            days_since_start = (current_date - start_date).days
            trend_factor = 1.0 + (days_since_start / 35.0) * 0.08
            
            for c in carriers:
                # Different carriers have slightly different pricing
                carrier_factor = 1.0
                if c.code == "AI":
                    carrier_factor = 1.15  # Air India is full service, higher pricing
                elif c.code == "SG":
                    carrier_factor = 0.90  # SpiceJet is budget, lower pricing
                elif c.code == "6E":
                    carrier_factor = 1.02  # Indigo is budget-medium
                
                for s in sources:
                    # Filter matching sources (IndiGo source only scrapes IndiGo, MMT scrapes all)
                    if s.name == "IndiGo Direct" and c.code != "6E":
                        continue
                    if s.name == "Air India Direct" and c.code != "AI":
                        continue
                        
                    for adv in advance_windows:
                        # Baseline price
                        multiplier = window_multipliers[adv]
                        flight_num = f"{c.code}-{random.randint(100, 999)}"
                        
                        # Add variance
                        variance = random.uniform(0.92, 1.08)
                        total_fare = base_f * trend_factor * carrier_factor * multiplier * variance
                        
                        # Apply occasional outliers
                        is_outlier_sim = False
                        outlier_val = total_fare
                        
                        # 0.8% fat-finger high price
                        if random.random() < 0.008:
                            outlier_val = total_fare * 10
                            is_outlier_sim = True
                        # 0.4% extremely low price
                        elif random.random() < 0.004:
                            outlier_val = 180.0
                            is_outlier_sim = True
                            
                        # Decompose fare
                        base, tax, conv = decompose_fare(outlier_val)
                        
                        # Sold out condition (1.5% probability)
                        is_sold_out = random.random() < 0.015
                        
                        raw = RawFareQuote(
                            route_id=r.id,
                            carrier_id=c.id,
                            source_id=s.id,
                            flight_number=flight_num,
                            departure_date=current_date,
                            scrape_timestamp=datetime.combine(current_date, datetime.min.time()) + timedelta(hours=random.randint(0, 23)),
                            advance_purchase_days=adv,
                            fare_class="economy",
                            base_fare=base,
                            taxes_fees=tax,
                            convenience_fee=conv,
                            total_fare=outlier_val,
                            currency="INR",
                            seats_available=None if is_sold_out else random.randint(1, 9),
                            is_sold_out=is_sold_out,
                            raw_payload={"flight": flight_num, "carrier": c.code, "source": s.name},
                            scrape_status="success"
                        )
                        raw_quotes_to_add.append(raw)
        
        # Batch insert raw quotes for the day
        db.add_all(raw_quotes_to_add)
        db.commit()
        
        # Run daily cleaning pipeline to create CleanedFareQuote
        cleaned_quotes = clean_raw_quotes(db, raw_quotes_to_add)
        db.add_all(cleaned_quotes)
        db.commit()
        
        # Run daily aggregates creation
        create_daily_aggregates(db, current_date)
        
        # Calculate index values
        calculate_apix_index(db, current_date, base_date=start_date)
        
        current_date += timedelta(days=1)
        
    print("Historical quote generation completed successfully.")

def seed_dgca_benchmarks(db: Session, routes):
    print("Seeding DGCA benchmark comparison data...")
    # Check if already seeded
    existing_benchmark = db.query(DgcaBenchmarkData).first()
    if existing_benchmark:
        print("DGCA benchmark data already seeded, skipping.")
        return

    # Seed data for current and previous months
    today = date.today()
    prev_month = today - timedelta(days=30)
    
    months = [prev_month.strftime("%Y-%m"), today.strftime("%Y-%m")]
    
    # We set average reported fares close to our base fares (4000-8000 INR)
    route_benchmark_fares = {
        "DEL-BOM": 7500.0,
        "DEL-BLR": 9100.0,
        "BOM-BLR": 6800.0,
        "DEL-CCU": 8200.0,
        "BLR-HYD": 5100.0,
        "MAA-DEL": 7300.0
    }
    
    for month in months:
        for r in routes:
            route_key = f"{r.origin_code}-{r.destination_code}"
            # Benchmark values (slightly different from computed values for realistic MAPE validation)
            avg_reported = route_benchmark_fares.get(route_key, 6000.0) * random.uniform(0.94, 1.06)
            
            bench = DgcaBenchmarkData(
                route_id=r.id,
                month=month,
                avg_fare_reported=round(avg_reported, 2),
                source_doc_url="https://dgca.gov.in/digigov-portal/web-traffic-report-summary",
                uploaded_at=datetime.utcnow()
            )
            db.add(bench)
            
    db.commit()
    print("DGCA benchmark seeding completed.")

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        routes, carriers, sources = seed_static_data(db)
        seed_historical_quotes(db, routes, carriers, sources)
        seed_dgca_benchmarks(db, routes)
        print("Database fully seeded and pre-calculated!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
