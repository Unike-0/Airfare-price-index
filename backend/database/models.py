from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    JSON,
    ForeignKey,
    Index,
    Text,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="public")
    api_key = Column(String(100), unique=True, nullable=True, index=True)
    api_tier = Column(String(50), default="bronze")
    api_limit = Column(Integer, default=100)
    api_usage = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Route(Base):
    __tablename__ = "routes"
    
    id = Column(Integer, primary_key=True, index=True)
    origin_code = Column(String(10), nullable=False)
    origin_city = Column(String(100), nullable=False)
    destination_code = Column(String(10), nullable=False)
    destination_city = Column(String(100), nullable=False)
    dgca_traffic_weight = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    raw_quotes = relationship("RawFareQuote", back_populates="route", cascade="all, delete-orphan")
    cleaned_quotes = relationship("CleanedFareQuote", back_populates="route", cascade="all, delete-orphan")
    aggregates = relationship("DailyRouteAggregate", back_populates="route", cascade="all, delete-orphan")
    benchmark_data = relationship("DgcaBenchmarkData", back_populates="route", cascade="all, delete-orphan")
    scrape_jobs = relationship("ScrapeJob", back_populates="route", cascade="all, delete-orphan")

class Carrier(Base):
    __tablename__ = "carriers"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationships
    raw_quotes = relationship("RawFareQuote", back_populates="carrier")
    cleaned_quotes = relationship("CleanedFareQuote", back_populates="carrier")

class Source(Base):
    __tablename__ = "sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    source_type = Column(String(50), nullable=False)  # 'airline_website' or 'ota'
    base_url = Column(String(255), nullable=False)
    scraping_config = Column(JSON, nullable=True)  # Store rules or selector overrides
    is_active = Column(Boolean, default=True)

    # Relationships
    raw_quotes = relationship("RawFareQuote", back_populates="source")
    cleaned_quotes = relationship("CleanedFareQuote", back_populates="source")
    scrape_jobs = relationship("ScrapeJob", back_populates="source")

class RawFareQuote(Base):
    __tablename__ = "raw_fare_quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    carrier_id = Column(Integer, ForeignKey("carriers.id", ondelete="RESTRICT"), nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id", ondelete="RESTRICT"), nullable=False)
    flight_number = Column(String(20), nullable=False)
    departure_date = Column(Date, nullable=False)
    scrape_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    advance_purchase_days = Column(Integer, nullable=False)  # 1, 7, 15, 30, 45
    fare_class = Column(String(50), default="economy")
    base_fare = Column(Float, nullable=False)
    taxes_fees = Column(Float, nullable=False, default=0.0)
    convenience_fee = Column(Float, nullable=False, default=0.0)
    total_fare = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    seats_available = Column(Integer, nullable=True)
    is_sold_out = Column(Boolean, default=False)
    raw_payload = Column(JSON, nullable=True)
    scrape_status = Column(String(50), default="success")  # success, error, captcha_blocked

    # Relationships
    route = relationship("Route", back_populates="raw_quotes")
    carrier = relationship("Carrier", back_populates="raw_quotes")
    source = relationship("Source", back_populates="raw_quotes")
    cleaned_quotes = relationship("CleanedFareQuote", back_populates="raw_quote", cascade="all, delete-orphan")

    # Index for fast daily query retrieval
    __table_args__ = (
        Index('idx_raw_route_dept', 'route_id', 'departure_date'),
    )

class CleanedFareQuote(Base):
    __tablename__ = "cleaned_fare_quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    raw_quote_id = Column(Integer, ForeignKey("raw_fare_quotes.id", ondelete="CASCADE"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    carrier_id = Column(Integer, ForeignKey("carriers.id", ondelete="RESTRICT"), nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id", ondelete="RESTRICT"), nullable=False)
    departure_date = Column(Date, nullable=False)
    advance_purchase_days = Column(Integer, nullable=False)
    base_fare = Column(Float, nullable=False)
    total_fare = Column(Float, nullable=False)
    is_outlier = Column(Boolean, default=False)
    outlier_reason = Column(String(255), nullable=True)
    analyst_override = Column(Boolean, default=False)
    override_reason = Column(String(255), nullable=True)
    quality_score = Column(Float, default=100.0)  # Data audit metric
    processed_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    raw_quote = relationship("RawFareQuote", back_populates="cleaned_quotes")
    route = relationship("Route", back_populates="cleaned_quotes")
    carrier = relationship("Carrier", back_populates="cleaned_quotes")
    source = relationship("Source", back_populates="cleaned_quotes")

    __table_args__ = (
        Index('idx_cleaned_route_dept', 'route_id', 'departure_date'),
    )

class DailyRouteAggregate(Base):
    __tablename__ = "daily_route_aggregates"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    advance_purchase_days = Column(Integer, nullable=False)  # 1, 7, 15, 30, 45
    avg_fare = Column(Float, nullable=False)
    median_fare = Column(Float, nullable=False)
    min_fare = Column(Float, nullable=False)
    max_fare = Column(Float, nullable=False)
    sample_size = Column(Integer, nullable=False, default=0)
    carrier_breakdown = Column(JSON, nullable=True)  # { "6E": {"avg": 5400, "count": 2}, "AI": ... }

    # Relationships
    route = relationship("Route", back_populates="aggregates")

    __table_args__ = (
        Index('idx_agg_route_date_days', 'route_id', 'date', 'advance_purchase_days'),
    )

class ApixIndexValue(Base):
    __tablename__ = "apix_index_values"
    
    id = Column(Integer, primary_key=True, index=True)
    index_date = Column(Date, nullable=False)
    frequency = Column(String(20), nullable=False)  # daily, weekly, monthly
    index_value = Column(Float, nullable=False)
    base_period_value = Column(Float, nullable=False, default=100.0)
    pct_change_dod = Column(Float, nullable=True)
    pct_change_mom = Column(Float, nullable=True)
    pct_change_yoy = Column(Float, nullable=True)
    is_published = Column(Boolean, default=True)
    approved_by = Column(String(50), nullable=True)
    methodology_version = Column(String(20), default="1.0")
    route_weights_used = Column(JSON, nullable=False)  # Audit log of weights { "1": 0.25, "2": 0.15 }

    __table_args__ = (
        Index('idx_index_date_freq', 'index_date', 'frequency'),
    )

class ScrapeJob(Base):
    __tablename__ = "scrape_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id", ondelete="CASCADE"), nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="running")  # running, success, failed, rate_limited
    records_collected = Column(Integer, default=0)
    errors_logged = Column(Text, nullable=True)
    ip_used = Column(String(45), nullable=True)
    notes = Column(Text, nullable=True)

    # Relationships
    source = relationship("Source", back_populates="scrape_jobs")
    route = relationship("Route", back_populates="scrape_jobs")

class DgcaBenchmarkData(Base):
    __tablename__ = "dgca_benchmark_data"
    
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=True)  # Nullable if only sector or aggregate level
    month = Column(String(7), nullable=False)  # YYYY-MM
    avg_fare_reported = Column(Float, nullable=False)
    source_doc_url = Column(String(255), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    route = relationship("Route", back_populates="benchmark_data")
