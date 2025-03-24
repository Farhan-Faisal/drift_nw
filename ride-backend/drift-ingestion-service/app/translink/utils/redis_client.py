import redis
import json
from datetime import datetime

def drift_redis_client():
    return redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

def store_with_history(client, key: str, data: str, max_history: int = 5):
    """Store data with history using Redis List"""
    pipe = client.pipeline()
    # Push to the head of the list
    pipe.lpush(key, data)
    # Trim to keep only max_history items
    pipe.ltrim(key, 0, max_history - 1)
    pipe.execute()

