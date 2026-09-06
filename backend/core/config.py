import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./apix.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "apix_secret_key_change_in_prod_12345")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    SCRAPING_ENABLED: bool = True
    MOCK_MODE: bool = True
    METHODOLOGY_VERSION: str = "1.0"
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
