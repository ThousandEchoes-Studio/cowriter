# backend/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cowriter API"
    API_V1_STR: str = "/api/v1"
    FIREBASE_CREDENTIALS_PATH: str | None = None # Set this if using a local JSON key file
    # Add other configurations here as needed

    class Config:
        case_sensitive = True

settings = Settings()

