import urllib.robotparser
import logging
from urllib.parse import urlparse

logger = logging.getLogger("apix.robots")

# In-memory cache of RobotFileParser instances mapped by root domain
_robots_cache = {}

def get_robots_parser(base_url: str) -> urllib.robotparser.RobotFileParser:
    parsed_url = urlparse(base_url)
    root_domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
    
    if root_domain in _robots_cache:
        return _robots_cache[root_domain]
        
    robots_url = f"{root_domain}/robots.txt"
    parser = urllib.robotparser.RobotFileParser()
    
    try:
        # Fetch with a short timeout to prevent blocking orchestrator
        import httpx
        response = httpx.get(robots_url, timeout=3.0)
        if response.status_code == 200:
            parser.parse(response.text.splitlines())
        else:
            # If robots.txt doesn't exist, assume standard scraping is allowed
            parser.allow_all = True
    except Exception as e:
        logger.warning(f"Failed to fetch robots.txt for {robots_url}: {e}. Defaulting to allow all.")
        parser.allow_all = True
        
    _robots_cache[root_domain] = parser
    return parser

def is_scraping_allowed(base_url: str, target_path: str, user_agent: str = "*") -> bool:
    """
    Checks if a target path is allowed by robots.txt
    """
    # For mock domain testing, always allow
    if "localhost" in base_url or "127.0.0.1" in base_url:
        return True
        
    parser = get_robots_parser(base_url)
    if hasattr(parser, "allow_all") and parser.allow_all:
        return True
        
    return parser.can_fetch(user_agent, target_path)
