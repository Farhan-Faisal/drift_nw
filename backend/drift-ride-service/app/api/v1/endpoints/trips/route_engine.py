# app/routes/closest_routes.py
from fastapi import APIRouter, HTTPException, Query, Depends
import redis
import json
import h3

from app.api.v1.endpoints.trips.utils.position_utils import filter_positions_by_h3, extract_unique_routes
from app.api.v1.endpoints.trips.utils.geojson_helper import get_shape_by_route_id
from app.models.client_position import ClientPosition

import pandas as pd
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

stops_df = pd.read_csv("./data/gtfs_processed/stops_enriched.csv")
shapes_df = pd.read_csv("./data/gtfs_processed/shapes_enriched.csv")
trips_df = pd.read_csv("./data/gtfs_static/trips.txt")
with open("./data/gtfs_processed/shapes.geojson", "r") as f:
    shapes_geojson = json.load(f)   

router = APIRouter()

def get_redis_client():
    return redis.Redis(
        host="redis",
        port=6379,
        decode_responses=True
    )

@router.get("/closest_routes")
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
    
    Returns:

    {
        "routes": [
            {
                "id": "10232",
                "route_long_name": "Whitby Estate/Park Royal/Spuraway",
                "route_short_name": "256",
                "shape": GEOJSON_FILE,
            }
        ]
    }

    """
    client_position = ClientPosition(latitude=latitude, longitude=longitude)
    client_h3 = client_position.to_h3(resolution=7)
    
    h3_kring_list = h3.k_ring(client_h3, 2)

    shapes_in_radius = list(shapes_df[shapes_df['h3_7'].isin(h3_kring_list)]['shape_id'].unique())

    logger.info(f"Shapes in radius: {len(shapes_in_radius)}")

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


    current_trips = []
    for pos in positions:
        if pos['trip_id']:
            current_trips.append(int(pos['trip_id']))


    routes_in_radius = trips_df[(trips_df['shape_id'].isin(shapes_in_radius)) & (trips_df['trip_id'].isin(current_trips))]
    
    logger.info(f"Routes in radius: {len(routes_in_radius)}")
    routes_in_radius = routes_in_radius[['route_id', 'shape_id','trip_id',  'trip_headsign']]
    routes_in_radius['geojson'] = routes_in_radius['shape_id'].apply(lambda x: get_shape_by_route_id(shapes_geojson, int(x)))
    return {"routes": routes_in_radius.to_dict(orient='records')}

@router.get("/closest_stops")
async def get_closest_stops(
    latitude: float = Query(..., description="Client latitude", example=49.25330435585066),
    longitude: float = Query(..., description="Client longitude", example=-123.18454924698467)
):
    """
    Returns transit stops that are within the same H3 cell (resolution 8) as the client's location.

    Query parameters:
    - latitude: float (required) - Client's latitude coordinate
    - longitude: float (required) - Client's longitude coordinate

    Example: /api/v1/trips/route_engine/closest_stops?latitude=49.25330435585066&longitude=-123.18454924698467

    Returns:
    {
        "stops": [
            {
                "stop_id": "10000",
                "stop_name": "Northbound No. 5 Rd @ McNeely Dr",
                "stop_lat": 49.25330435585066,
                "stop_lon": -123.18454924698467,
            }
        ]
    }
    """
    client_position = ClientPosition(latitude=latitude, longitude=longitude)
    client_h3 = client_position.to_h3(resolution=8)

    stops_in_h3 = stops_df[stops_df['h3_8'] == client_h3]

    stops_in_h3 = stops_in_h3[['stop_id', 'stop_name', 'stop_lat', 'stop_lon']]

    stops_in_h3_dict = stops_in_h3.to_dict(orient='records')
    template_dict = dict()
    template_dict['stops'] = stops_in_h3_dict

    logger.info(f"Stops in H3: {len(stops_in_h3_dict)}")
    
    return template_dict

