import os
import logging
import httpx
from datetime import date
from scrapers.base import BaseScraper

logger = logging.getLogger("apix.scraper.makemytrip")

class MakeMyTripScraper(BaseScraper):
    def fetch_fares(self, origin: str, destination: str, target_date: date, advance_days: int) -> list[dict]:
        date_str = target_date.strftime("%Y-%m-%d")
        
        mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
        if mock_mode:
            url = f"http://localhost:8000/mock/makemytrip?origin={origin}&dest={destination}&date={date_str}"
        else:
            url = f"{self.base_url}/api/flights?from={origin}&to={destination}&date={date_str}"
            
        logger.info(f"MakeMyTripScraper fetching JSON from URL: {url}")
        
        results = []
        
        try:
            # Query the API endpoint directly using HTTP requests
            response = httpx.get(url, timeout=10.0)
            if response.status_code != 200:
                raise Exception(f"HTTP error {response.status_code} fetching MMT")
                
            data = response.json()
            flights = data.get("flights", [])
            
            for f in flights:
                flight_num = f.get("flightNumber")
                pricing = f.get("pricing", {})
                inventory = f.get("inventory", {})
                
                results.append({
                    "flight_number": flight_num,
                    "departure_date": target_date,
                    "advance_purchase_days": advance_days,
                    "base_fare": float(pricing.get("base", 0.0)),
                    "taxes_fees": float(pricing.get("taxes", 0.0)),
                    "convenience_fee": float(pricing.get("convenience", 0.0)),
                    "total_fare": float(pricing.get("total", 0.0)),
                    "seats_available": inventory.get("seats"),
                    "is_sold_out": bool(inventory.get("soldOut", False)),
                    "raw_payload": {
                        "json_entry": f,
                        "scrape_url": url
                    }
                })
        except Exception as e:
            logger.error(f"MakeMyTripScraper failed: {e}")
            raise e
            
        return results
