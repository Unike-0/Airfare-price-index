import os
import logging
from datetime import date
from playwright.sync_api import sync_playwright
from scrapers.base import BaseScraper

logger = logging.getLogger("apix.scraper.indigo")

class IndigoScraper(BaseScraper):
    def fetch_fares(self, origin: str, destination: str, target_date: date, advance_days: int) -> list[dict]:
        # Formulate URL
        date_str = target_date.strftime("%Y-%m-%d")
        
        # Determine URL based on mock mode settings
        mock_mode = os.getenv("MOCK_MODE", "true").lower() == "true"
        if mock_mode:
            url = f"http://localhost:8000/mock/indigo?origin={origin}&dest={destination}&date={date_str}"
        else:
            # Placeholder for Indigo's real search page URL
            url = f"{self.base_url}/search?origin={origin}&destination={destination}&date={date_str}"
            
        logger.info(f"IndigoScraper fetching from URL: {url}")
        
        results = []
        
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                # Set dynamic user agent
                context = browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    viewport={"width": 1280, "height": 800}
                )
                page = context.new_page()
                
                # Navigate with a reasonable timeout
                page.goto(url, timeout=15000, wait_until="domcontentloaded")
                
                # Wait for results row selector
                page.wait_for_selector(".flight-row", timeout=5000)
                
                # Parse DOM rows
                rows = page.query_selector_all(".flight-row")
                for row in rows:
                    flight_num = row.query_selector(".flight-number").inner_text().strip()
                    
                    # Read attribute data values if available (fallback to raw text parsing)
                    base_val = float(row.query_selector(".fare-base").get_attribute("data-val") or 0.0)
                    tax_val = float(row.query_selector(".fare-taxes").get_attribute("data-val") or 0.0)
                    conv_val = float(row.query_selector(".fare-convenience").get_attribute("data-val") or 0.0)
                    total_val = float(row.query_selector(".fare-total").get_attribute("data-val") or 0.0)
                    
                    status_elem = row.query_selector(".status")
                    status_text = status_elem.inner_text().strip() if status_elem else ""
                    
                    is_sold_out = "SOLD OUT" in status_text
                    seats = 0
                    if not is_sold_out and "left" in status_text:
                        try:
                            seats = int(status_text.split()[0])
                        except ValueError:
                            seats = 5
                            
                    results.append({
                        "flight_number": flight_num,
                        "departure_date": target_date,
                        "advance_purchase_days": advance_days,
                        "base_fare": base_val,
                        "taxes_fees": tax_val,
                        "convenience_fee": conv_val,
                        "total_fare": total_val,
                        "seats_available": None if is_sold_out else seats,
                        "is_sold_out": is_sold_out,
                        "raw_payload": {
                            "flight_number": flight_num,
                            "scrape_url": url,
                            "status_text": status_text
                        }
                    })
                    
                browser.close()
        except Exception as e:
            logger.error(f"IndigoScraper failed during scrape: {e}")
            # Raise exception so orchestrator can capture and audit failures
            raise e
            
        return results
