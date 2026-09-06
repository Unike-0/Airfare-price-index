from abc import ABC, abstractmethod
from datetime import date

class BaseScraper(ABC):
    """
    Abstract base class for all scrapers.
    Forces standard interfaces for fetching and parsing airfare data.
    """
    
    def __init__(self, source_id: int, base_url: str):
        self.source_id = source_id
        self.base_url = base_url

    @abstractmethod
    def fetch_fares(self, origin: str, destination: str, target_date: date, advance_days: int) -> list[dict]:
        """
        Executes the network request (via Playwright or httpx) to obtain flight prices.
        Returns a list of normalized fare dictionaries:
        [
            {
                "flight_number": "6E-101",
                "departure_date": date(2026, 9, 5),
                "base_fare": 3400.0,
                "taxes_fees": 800.0,
                "convenience_fee": 350.0,
                "total_fare": 4550.0,
                "seats_available": 5,
                "is_sold_out": False,
                "raw_payload": {...}
            },
            ...
        ]
        """
        pass
