from pydantic_settings import BaseSettings
import redis

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "DriftBus"

    class Config:
        case_sensitive = True

settings = Settings() 

redis_client = redis.Redis(host="localhost", port=6379, db=0)
