from fastapi import HTTPException, Header
import os

# Retrieve API key from either environment variable
API_KEY = os.environ.get('API_KEY') or os.environ.get('DRIFT_TESTING_API_KEY')
if not API_KEY:
    raise ValueError("No API key provided. Set API_KEY or DRIFT_TESTING_API_KEY in your .env file")

class WebSocketAuthError(Exception):
    """Custom exception for WebSocket authentication errors."""
    pass

async def verify_api_key(x_api_key: str = Header(None)):
    """HTTP header-based API key verification."""
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

async def verify_websocket_api_key(provided_key: str) -> bool:
    """WebSocket API key verification function.
    
    Returns True if the provided key is valid, otherwise False.
    """
    return provided_key == API_KEY