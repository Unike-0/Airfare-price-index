import pytest
from datetime import date, datetime
from database.models import RawFareQuote
from pipeline.cleaner import decompose_fare, clean_raw_quotes

def test_fare_decomposition():
    total = 5350.0
    base, tax, conv = decompose_fare(total)
    
    assert conv == 350.0
    assert base + tax + conv == total
    # Check ratios (base is ~83% of remaining, tax is ~17%)
    remaining = total - 350.0
    assert abs(base - remaining * 0.83) < 1.0
    assert abs(tax - remaining * 0.17) < 1.0

def test_outlier_detection_iqr():
    # Setup mock raw quotes with a statistical outlier
    # Need 3 or more records to trigger IQR calculations
    quotes = [
        RawFareQuote(
            id=1, route_id=1, carrier_id=1, source_id=1,
            flight_number="6E-101", departure_date=date(2026, 9, 5),
            advance_purchase_days=15, base_fare=4000.0, total_fare=5000.0,
            scrape_status="success", is_sold_out=False
        ),
        RawFareQuote(
            id=2, route_id=1, carrier_id=1, source_id=1,
            flight_number="6E-102", departure_date=date(2026, 9, 5),
            advance_purchase_days=15, base_fare=4100.0, total_fare=5100.0,
            scrape_status="success", is_sold_out=False
        ),
        RawFareQuote(
            id=3, route_id=1, carrier_id=1, source_id=1,
            flight_number="6E-103", departure_date=date(2026, 9, 5),
            advance_purchase_days=15, base_fare=4200.0, total_fare=5200.0,
            scrape_status="success", is_sold_out=False
        ),
        # Outlier quote (high)
        RawFareQuote(
            id=4, route_id=1, carrier_id=1, source_id=1,
            flight_number="6E-104", departure_date=date(2026, 9, 5),
            advance_purchase_days=15, base_fare=40000.0, total_fare=50000.0,
            scrape_status="success", is_sold_out=False
        )
    ]

    # Run clean quotes logic (db parameter can be None as it's not writing inside clean_raw_quotes)
    cleaned = clean_raw_quotes(None, quotes)
    
    assert len(cleaned) == 4
    
    # Verify non-outliers
    for c in cleaned[:3]:
        assert c.is_outlier is False
        assert c.quality_score == 100.0
        
    # Verify the outlier was correctly flagged
    outlier = cleaned[3]
    assert outlier.is_outlier is True
    assert "above threshold" in outlier.outlier_reason
    assert outlier.quality_score == 50.0
