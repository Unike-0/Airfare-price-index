import os
import logging
from datetime import date
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

logger = logging.getLogger("apix.scraper.airindia")

class AirIndiaScraper(BaseScraper):
    def fetch_fares(self, origin: str, destination: str, target_date: date, advance_days: int) -> list[dict]:
        date_str = target_date.strftime("%Y-%m-%d")
        
        mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
        if mock_mode:
            url = f"http://localhost:8000/mock/airindia?origin={origin}&dest={destination}&date={date_str}"
        else:
            url = f"{self.base_url}/search?from={origin}&to={destination}&date={date_str}"
            
        logger.info(f"AirIndiaScraper fetching from URL: {url}")
        
        results = []
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
                page = context.new_page()
                page.goto(url, timeout=15000, wait_until="domcontentloaded")
                
                # Wait for card layouts
                page.wait_for_selector(".flight-card", timeout=5000)
                
                cards = page.query_selector_all(".flight-card")
                for card in cards:
                    flight_num = card.query_selector(".flight-no").inner_text().strip()
                    
                    # Read fares text and strip currency symbols
                    base_txt = card.query_selector(".base-price").inner_text().replace("₹", "").strip()
                    tax_txt = card.query_selector(".tax-price").inner_text().replace("₹", "").strip()
                    conv_txt = card.query_selector(".conv-fee").inner_text().replace("₹", "").strip()
                    total_txt = card.query_selector(".total-price").inner_text().replace("₹", "").strip()
                    
                    btn = card.query_selector(".select-btn")
                    is_sold_out = btn.is_disabled() if btn else True
                    
                    results.append({
                        "flight_number": flight_num,
                        "departure_date": target_date,
                        "advance_purchase_days": advance_days,
                        "base_fare": float(base_txt or 0.0),
                        "taxes_fees": float(tax_txt or 0.0),
                        "convenience_fee": float(conv_txt or 0.0),
                        "total_fare": float(total_txt or 0.0),
                        "seats_available": None if is_sold_out else 4, # Placeholder default
                        "is_sold_out": is_sold_out,
                        "raw_payload": {
                            "flight_number": flight_num,
                            "scrape_url": url,
                            "is_sold_out": is_sold_out
                        }
                    })
                    
                browser.close()
        except Exception as e:
            logger.error(f"AirIndiaScraper failed during scrape: {e}")
            raise e
            
        return results
