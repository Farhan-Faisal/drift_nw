# Environment variables
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# FastAPI and related imports
from fastapi import (
    FastAPI,
    WebSocket,
    WebSocketDisconnect,
    Header,
    HTTPException,
    Depends,
    Request
)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# API
from app.api.v1.endpoints import router as api_v1_router

# Data processing
import pandas as pd
import numpy as np

# Python standard library
import asyncio
import os
import json
import math
from datetime import datetime, timedelta
from typing import Union


# Server
import uvicorn



# Get API key from environment variables -- try both names for flexibility
API_KEY = os.environ.get('API_KEY') or os.environ.get('DRIFT_TESTING_API_KEY')

if not API_KEY:
    raise ValueError("No valid API key found. Set API_KEY or DRIFT_TESTING_API_KEY in your .env file")

app = FastAPI(
    title="DriftBus Backend",
    version="1.0.0"
)


app.include_router(api_v1_router, prefix="/api/v1")

limiter = Limiter(key_func=get_remote_address)
# app.state.limiter = limiter
# app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Mount the static directory
# static_dir = os.path.join(os.path.dirname(__file__), "static")
# app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/api/v1/test-ws")
async def test_websocket(websocket: WebSocket):
    print("Test WebSocket connection attempt received")
    await websocket.accept()
    try:
        while True:
            # Send a test message every 5 seconds
            await websocket.send_json({"message": "Test connection successful"})
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        print("Client disconnected from test socket")
    except Exception as e:
        print(f"Error in test websocket: {str(e)}")

if __name__ == "__main__":
    uvicorn.run( app, 
        host="0.0.0.0", 
        port=8000,
        reload=True,  # Enable auto-reload
        reload_delay=1,  # Delay between reloads
        workers=1  # Use single worker for WebSocket support)
    )
