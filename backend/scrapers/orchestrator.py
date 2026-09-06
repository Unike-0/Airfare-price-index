import os
import time
import random
import logging
from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session

from database.models import Route, Source, Carrier, RawFareQuote, ScrapeJob
from scrapers.robots import is_scraping_allowed
from scrapers.concrete_indigo import IndigoScraper
from scrapers.concrete_airindia import AirIndiaScraper
from scrapers.concrete_makemytrip import MakeMyTripScraper
from pipeline.cleaner import clean_raw_quotes, create_daily_aggregates
from pipeline.index_builder import calculate_apix_index

logger = logging.getLogger("apix.orchestrator")

# Map database Source name to scraper class implementation
SCRAPER_MAPPING = {
    "IndiGo Direct": IndigoScraper,
    "Air India Direct": AirIndiaScraper,
    "MakeMyTrip": MakeMyTripScraper
}

class ScraperOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    def run_all_scrapes(self):
        """
        Runs the full scraping cycle:
        1. Fetch fares for active routes x advance-windows x active sources.
        2. Clean raw records.
        3. Create aggregates.
        4. Re-calculate APIx price indices.
        """
        scraping_enabled = os.getenv("SCRAPING_ENABLED", "true").lower() == "true"
        if not scraping_enabled:
            logger.info("Scraping is globally disabled via configuration.")
            return

        # Fetch active components
        routes = self.db.query(Route).filter(Route.is_active == True).all()
        sources = self.db.query(Source).filter(Source.is_active == True).all()
        carriers = self.db.query(Carrier).filter(Carrier.is_active == True).all()
        
        carrier_map = {c.code: c.id for c in carriers}
        
        advance_windows = [1, 7, 15, 30, 45]
        today = date.today()
        
        raw_quotes_batch = []
        logger.info(f"Starting scraping cycle. Tracked routes: {len(routes)}, Sources: {len(sources)}")

        for source in sources:
            scraper_class = SCRAPER_MAPPING.get(source.name)
            if not scraper_class:
                # Log warning for stubs (Yatra, SpiceJet direct, etc.)
                logger.warning(f"Scraper implementation for '{source.name}' is a STUB. Skipping.")
                continue

            scraper = scraper_class(source_id=source.id, base_url=source.base_url)
            
            for route in routes:
                # Check robots.txt compliance
                target_path = f"/search?origin={route.origin_code}&dest={route.destination_code}"
                if not is_scraping_allowed(source.base_url, target_path):
                    logger.warning(f"Scraping disallowed by robots.txt for {source.name} on path {target_path}")
                    continue
                
                # Start job log
                job = ScrapeJob(
                    source_id=source.id,
                    route_id=route.id,
                    started_at=datetime.utcnow(),
                    status="running",
                    ip_used="127.0.0.1"
                )
                self.db.add(job)
                self.db.commit()

                records_found = 0
                errors = []
                
                try:
                    for adv in advance_windows:
                        target_date = today + timedelta(days=adv)
                        
                        logger.info(f"Fetching {source.name} for {route.origin_code}-{route.destination_code} T+{adv}")
                        
                        # Call scraper fetch logic
                        fares = scraper.fetch_fares(
                            origin=route.origin_code,
                            destination=route.destination_code,
                            target_date=target_date,
                            advance_days=adv
                        )
                        
                        # Save raw quotes
                        for fare in fares:
                            # Map carrier code to database ID
                            ccode = fare["flight_number"].split("-")[0]
                            cid = carrier_map.get(ccode)
                            if not cid:
                                # Auto-seed carrier if missing
                                carrier = Carrier(code=ccode, name=f"Airline {ccode}")
                                self.db.add(carrier)
                                self.db.commit()
                                carrier_map[ccode] = carrier.id
                                cid = carrier.id

                            raw_quote = RawFareQuote(
                                route_id=route.id,
                                carrier_id=cid,
                                source_id=source.id,
                                flight_number=fare["flight_number"],
                                departure_date=fare["departure_date"],
                                scrape_timestamp=datetime.utcnow(),
                                advance_purchase_days=fare["advance_purchase_days"],
                                base_fare=fare["base_fare"],
                                taxes_fees=fare["taxes_fees"],
                                convenience_fee=fare["convenience_fee"],
                                total_fare=fare["total_fare"],
                                seats_available=fare["seats_available"],
                                is_sold_out=fare["is_sold_out"],
                                raw_payload=fare["raw_payload"],
                                scrape_status="success"
                            )
                            self.db.add(raw_quote)
                            raw_quotes_batch.append(raw_quote)
                            records_found += 1
                        
                        # Random delay to respect rate limit limits (1s to 2s)
                        time.sleep(random.uniform(0.5, 1.5))
                        
                    # Update job success status
                    job.status = "success"
                    job.records_collected = records_found
                    job.completed_at = datetime.utcnow()
                    
                except Exception as e:
                    logger.error(f"Scraper Job failed: {e}")
                    job.status = "failed"
                    job.errors_logged = str(e)
                    job.completed_at = datetime.utcnow()
                
                self.db.commit()
                
        # If we successfully collected new quotes, clean and recalculate
        if raw_quotes_batch:
            logger.info(f"Scraping complete. Running cleaning pipeline on {len(raw_quotes_batch)} new raw quotes.")
            cleaned_quotes = clean_raw_quotes(self.db, raw_quotes_batch)
            self.db.add_all(cleaned_quotes)
            self.db.commit()
            
            logger.info("Re-calculating daily route aggregates and index values...")
            # Aggregate and calculate index for all distinct departure dates in the scraped batch
            distinct_dates = set(q.departure_date for q in raw_quotes_batch)
            for d in distinct_dates:
                create_daily_aggregates(self.db, d)
                calculate_apix_index(self.db, d)
                
            logger.info("Cleaning pipeline and index update completed.")
            
        return len(raw_quotes_batch)
