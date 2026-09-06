import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database.models import Base, Route, DailyRouteAggregate, ApixIndexValue
from pipeline.index_builder import calculate_apix_index

def test_apix_index_calculation():
    # 1. Setup in-memory SQLite DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        # Seed Route
        route1 = Route(id=1, origin_code="DEL", origin_city="Delhi", destination_code="BOM", destination_city="Mumbai", dgca_traffic_weight=1.0, is_active=True)
        db.add(route1)
        db.commit()

        # Seed Daily Route Aggregates for Base Date (T-35)
        agg_base = DailyRouteAggregate(
            route_id=1, date=date(2026, 8, 1), advance_purchase_days=15,
            avg_fare=5000.0, median_fare=5000.0, min_fare=5000.0, max_fare=5000.0,
            sample_size=1, carrier_breakdown={}
        )
        db.add(agg_base)

        # Seed Daily Route Aggregates for Current Target Date (T-1) showing a 10% fare rise
        agg_current = DailyRouteAggregate(
            route_id=1, date=date(2026, 8, 30), advance_purchase_days=15,
            avg_fare=5500.0, median_fare=5500.0, min_fare=5500.0, max_fare=5500.0,
            sample_size=1, carrier_breakdown={}
        )
        db.add(agg_current)
        db.commit()

        # 2. Run index builder using date(2026, 8, 1) as base date
        calculate_apix_index(db, target_date=date(2026, 8, 30), base_date=date(2026, 8, 1))

        # 3. Retrieve computed daily index
        idx_val = db.query(ApixIndexValue).filter(
            ApixIndexValue.index_date == date(2026, 8, 30),
            ApixIndexValue.frequency == "daily"
        ).first()

        assert idx_val is not None
        # Since price increased from 5000 to 5500 (1.1x), index value should be 110.0
        assert abs(idx_val.index_value - 110.0) < 0.01
        
    finally:
        db.close()
