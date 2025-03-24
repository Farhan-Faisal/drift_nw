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

# Local imports
from scripts.bus_matcher import match_gps_to_bus, get_h3_coords, calculate_haversine_distance
from pydantic import BaseModel

# Server
import uvicorn

# Remove the hardcoded API key
from os import environ
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key from environment variable with a default value for development
API_KEY = environ.get('API_KEY')

if not API_KEY:
    raise ValueError("API_KEY environment variable is not set")

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

BUS_MATCH_DURATION = timedelta(minutes=5)

@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Welcome to the Bus Tracking API",
        "available_endpoints": {
            "API Documentation": "/docs",
            "Test Endpoint": "/test",
            "WebSocket Test Page": "/static/websocket_test.html",
            "Simulated WebSocket": "ws://localhost:8080/ws/simulated"
        }
    }


async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Mount the static directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BUS_CSV =  os.path.join(os.path.dirname(__file__), "data/simulated/simulated_buses.csv")

## Buses

async def simulated_sse_endpoint_buses(speed_multiplier: float = 1.0):
    # Load and prepare the data
    df = pd.read_csv(BUS_CSV)
    
    grouped_times = [int(x) for x in df['manual_timediff'].unique()]
    grouped_times.sort()
    wait_times = [int(x) for x in np.diff(grouped_times)]
    wait_times.insert(0, 0)
    
    for current_time, wait_time in zip(grouped_times, wait_times):
        current_data = df[df['manual_timediff'] == current_time]
        data_to_send = {
            # "timestamp": str(current_data['timestamp'].iloc[0]),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "manual_timediff": current_time,
            "data": current_data.to_dict(orient='records')
        }
        
        # Format the SSE data
        yield f"data: {json.dumps(data_to_send)}\n\n"
        
        # Wait before sending next update
        adjusted_wait_time = wait_time / speed_multiplier
        await asyncio.sleep(adjusted_wait_time)

@app.get("/stream/buses", dependencies=[Depends(verify_api_key)])
@limiter.limit("100/minute")
async def stream_buses(request: Request, speed_multiplier: float = 1.0):
    return StreamingResponse(
        simulated_sse_endpoint_buses(speed_multiplier), 
        media_type="text/event-stream"
    )

## Buses Websocket

@app.websocket("/ws/stream/buses")
async def simulated_websocket_endpoint(websocket: WebSocket, speed_multiplier: float = 1.0):
    # headers = dict(websocket.headers)
    # if headers.get('x-api-key') != API_KEY:
    #     await websocket.close(code=4003)
    #     return
        
    await websocket.accept()
    try:
        # Load and prepare the data
        # csv_path = os.path.join(os.path.dirname(__file__), "data/simulated/simulated_buses_multi.csv")
        df = pd.read_csv(BUS_CSV)
        # df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Convert numpy int64 to standard Python int
        df['manual_timediff'] = df['manual_timediff'].astype(int)
        df['elapsed_seconds'] = df['elapsed_seconds'].astype(int)
        
        grouped_times = [int(x) for x in df['manual_timediff'].unique()]
        grouped_times.sort()
        wait_times = [int(x) for x in np.diff(grouped_times)]
        wait_times.insert(0, 0)
        
        # Group data by elapsed_seconds
        for current_time, wait_time in zip(grouped_times, wait_times):
            # Get data for current timestamp
            current_data = df[df['manual_timediff'] == current_time]
            
            # Convert to list of dictionaries and ensure all values are JSON serializable
            data_to_send = current_data.to_dict(orient='records')
            # print(data_to_send)
            
            # Send the batch
            await websocket.send_json({
                "timestamp": str(current_data['timestamp'].iloc[0]),
                "manual_timediff": current_time,
                "data": data_to_send
            })
            
            # Apply speed multiplier to wait time (faster if multiplier > 1)
            adjusted_wait_time = wait_time / speed_multiplier
            await asyncio.sleep(adjusted_wait_time)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error in websocket: {str(e)}")
        await websocket.close()




## Person

async def simulated_sse_endpoint_person(speed_multiplier: float = 1.0):
    # Load and prepare the data
    csv_path = os.path.join(os.path.dirname(__file__), "data/simulated/person_1_with_bus.csv")
    df = pd.read_csv(csv_path)
    
    grouped_times = [int(x) for x in df['manual_timediff'].unique()]
    grouped_times.sort()
    wait_times = [int(x) for x in np.diff(grouped_times)]
    wait_times.insert(0, 0)
    
    for current_time, wait_time in zip(grouped_times, wait_times):
        current_data = df[df['manual_timediff'] == current_time]
        data_to_send = {
            # "timestamp": str(current_data['timestamp'].iloc[0]),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "manual_timediff": current_time,
            "data": current_data.to_dict(orient='records')
        }
        
        # Format the SSE data
        yield f"data: {json.dumps(data_to_send)}\n\n"
        
        # Wait before sending next update
        adjusted_wait_time = wait_time / speed_multiplier
        await asyncio.sleep(adjusted_wait_time)

@app.get("/stream/person", dependencies=[Depends(verify_api_key)])
@limiter.limit("100/minute")
async def stream_person(request: Request, speed_multiplier: float = 1.0):
    return StreamingResponse(
        simulated_sse_endpoint_person(speed_multiplier), 
        media_type="text/event-stream"
    )

## Persons Websocket 
@app.websocket("/ws/stream/person")
async def simulated_person_websocket(websocket: WebSocket, speed_multiplier: float = 1.0):
    # headers = dict(websocket.headers)
    # if headers.get('x-api-key') != API_KEY:
    #     await websocket.close(code=4003)
    #     return
        
    await websocket.accept()
    try:
        # Load and prepare the data
        csv_path = os.path.join(os.path.dirname(__file__), "data/simulated/person_1.csv")
        df = pd.read_csv(csv_path)
        
        # Convert numpy int64 to standard Python int
        df['manual_timediff'] = df['manual_timediff'].astype(int)
        
        grouped_times = [int(x) for x in df['manual_timediff'].unique()]
        grouped_times.sort()
        wait_times = [int(x) for x in np.diff(grouped_times)]
        wait_times.insert(0, 0)
        
        for current_time, wait_time in zip(grouped_times, wait_times):
            # Get data for current timestamp
            current_data = df[df['manual_timediff'] == current_time]
            
            # Convert to list of dictionaries
            data_to_send = current_data.to_dict(orient='records')
            
            # Send the batch
            await websocket.send_json({
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "manual_timediff": current_time,
                "data": data_to_send
            })
            
            # Apply speed multiplier to wait time
            adjusted_wait_time = wait_time / speed_multiplier
            await asyncio.sleep(adjusted_wait_time)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error in websocket: {str(e)}")
        await websocket.close()



## Phone actual
class LocationPoint(BaseModel):
    first_timestamp: str 
    timestamp: str 
    lat: float
    lon: float
    elapsed_seconds: Union[float, None] = None
    h3: Union[str, None] = None

class LocationMatchResponse(BaseModel):
    is_on_bus: bool
    message: str

@app.post("/location-match/rule-based",  dependencies=[Depends(verify_api_key)])
@limiter.limit("100/minute")
async def receive_user_location(
    request: Request,
    locations: list[LocationPoint]
):

    first_timestamp = datetime.strptime(locations[0].first_timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S")
    
    for location in locations:
        location.elapsed_seconds = (datetime.strptime(location.timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S") - first_timestamp).total_seconds()
        location.h3 = get_h3_coords(location.lat, location.lon, 10)
    
    elapsed_seconds = [loc.elapsed_seconds for loc in locations]
    elapsed_seconds.sort()

    lower_bound = elapsed_seconds[0] + 3
    upper_bound = elapsed_seconds[-1] - 3

    start_pos = locations[0]
    end_pos = locations[-1]
    
    user_distance = calculate_haversine_distance(
        start_pos.lat, start_pos.lon,
        end_pos.lat, end_pos.lon
    )   

    if user_distance < 200:
        return LocationMatchResponse(
            is_on_bus=False,
            message ='Not enough distance travelled'
        )

    # Convert locations to a DataFrame for efficient matching
    locations_df = pd.DataFrame([{
        'elapsed_seconds': loc.elapsed_seconds,
        'h3': loc.h3,
    } for loc in locations])

    # Load and prepare bus data, only selecting needed columns
    df = pd.read_csv(BUS_CSV, usecols=['manual_timediff', 'latitude', 'longitude'])
    
    # Pre-filter time range to reduce data before h3 calculation
    mask = (df['manual_timediff'] > lower_bound) & (df['manual_timediff'] < upper_bound)
    time_filtered_df = df[mask].copy()
    
    # Calculate h3 only for time-filtered data
    time_filtered_df['h3'] = time_filtered_df.apply(
        lambda x: get_h3_coords(x['latitude'], x['longitude'], 10), 
        axis=1
    )

    # Create index on h3 for faster joining
    time_filtered_df.set_index('h3', inplace=True)
    locations_df.set_index('h3', inplace=True)

    # Use join instead of merge (faster with indexes)
    matches = locations_df.join(
        time_filtered_df,
        how='left'
    )

    # Vectorized time difference calculation
    time_diff = abs(matches['elapsed_seconds'] - matches['manual_timediff'])
    matched_locations = (time_diff <= 2).sum()
    
    total_locations = len(locations_df)
    match_percentage = (matched_locations / total_locations) * 100

    return LocationMatchResponse(
        is_on_bus=matched_locations >= (total_locations * 0.7),
        message=f'Matched {matched_locations}/{total_locations} points ({match_percentage:.1f}%)'
    )


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
