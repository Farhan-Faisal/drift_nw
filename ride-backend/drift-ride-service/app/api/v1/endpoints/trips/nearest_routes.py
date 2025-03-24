# app/routes/closest_routes.py
from fastapi import APIRouter, HTTPException, Query, Depends
import redis
import json
import h3
import pandas as pd

from app.api.v1.endpoints.trips.utils.position_utils import filter_positions_by_h3, extract_unique_routes
from app.models.client_position import ClientPosition



color_df = pd.read_csv("./data/gtfs_static/unique_route_colors.csv")

router = APIRouter()

def get_redis_client():
    return redis.Redis(
        host="redis",
        port=6379,
        decode_responses=True
    )

@router.get("")
async def get_closest_routes(
    latitude: float = Query(..., description="Client latitude", example=49.2827),
    longitude: float = Query(..., description="Client longitude", example=-123.1207)
):
    """
    Returns unique route IDs from the most recent positions that are within
    the specified h3 k-ring of the client's location.
    
    Query parameters:
    - latitude: float (required)
    - longitude: float (required)
    
    Example: /api/v1/trips/nearest_routes?latitude=49.2827&longitude=-123.1207
    """
    client_position = ClientPosition(latitude=latitude, longitude=longitude)
    client_h3 = client_position.to_h3(resolution=7)
    
    redis_client = get_redis_client()
    stream_key = "translink:position:stream"

    try:
        last_messages = redis_client.xrevrange(stream_key, count=1)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching data from Redis")

    if not last_messages:
        return {"routes": []}

    message_id, message_data = last_messages[0]
    try:
        positions = json.loads(message_data['data'])
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail="Invalid message data")

    filtered_positions = filter_positions_by_h3(positions, client_h3)
    unique_routes = extract_unique_routes(filtered_positions)
    res = color_df.loc[color_df['route_id'].isin(unique_routes)].to_dict("records")
    # print(res)
    # print(unique_routes)
    return {"routes": res}
