# from fastapi import APIRouter, Depends, Request
# from pydantic import BaseModel
# from typing import Union
# from datetime import datetime
# from slowapi import Limiter
# import pandas as pd
# from app.core.auth import verify_api_key
# from app.core.utils import get_h3_coords, calculate_haversine_distance
# from app.core.config import BUS_CSV

# router = APIRouter()
# limiter = Limiter(key_func=lambda: "global")

# ## Phone actual
# class LocationPoint(BaseModel):
#     first_timestamp: str 
#     timestamp: str 
#     lat: float
#     lon: float
#     elapsed_seconds: Union[float, None] = None
#     h3: Union[str, None] = None

# class LocationMatchResponse(BaseModel):
#     is_on_bus: bool
#     message: str

# @router.post("/detection/",  dependencies=[Depends(verify_api_key)])
# @limiter.limit("100/minute")
# async def receive_user_location(
#     request: Request,
#     locations: list[LocationPoint]
# ):

#     first_timestamp = datetime.strptime(locations[0].first_timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S")
    
#     for location in locations:
#         location.elapsed_seconds = (datetime.strptime(location.timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S") - first_timestamp).total_seconds()
#         location.h3 = get_h3_coords(location.lat, location.lon, 10)
    
#     elapsed_seconds = [loc.elapsed_seconds for loc in locations]
#     elapsed_seconds.sort()

#     lower_bound = elapsed_seconds[0] + 3
#     upper_bound = elapsed_seconds[-1] - 3

#     start_pos = locations[0]
#     end_pos = locations[-1]
    
#     user_distance = calculate_haversine_distance(
#         start_pos.lat, start_pos.lon,
#         end_pos.lat, end_pos.lon
#     )   

#     if user_distance < 200:
#         return LocationMatchResponse(
#             is_on_bus=False,
#             message ='Not enough distance travelled'
#         )

#     # Convert locations to a DataFrame for efficient matching
#     locations_df = pd.DataFrame([{
#         'elapsed_seconds': loc.elapsed_seconds,
#         'h3': loc.h3,
#     } for loc in locations])

#     # Load and prepare bus data, only selecting needed columns
#     df = pd.read_csv(BUS_CSV, usecols=['manual_timediff', 'latitude', 'longitude'])
    
#     # Pre-filter time range to reduce data before h3 calculation
#     mask = (df['manual_timediff'] > lower_bound) & (df['manual_timediff'] < upper_bound)
#     time_filtered_df = df[mask].copy()
    
#     # Calculate h3 only for time-filtered data
#     time_filtered_df['h3'] = time_filtered_df.apply(
#         lambda x: get_h3_coords(x['latitude'], x['longitude'], 10), 
#         axis=1
#     )

#     # Create index on h3 for faster joining
#     time_filtered_df.set_index('h3', inplace=True)
#     locations_df.set_index('h3', inplace=True)

#     # Use join instead of merge (faster with indexes)
#     matches = locations_df.join(
#         time_filtered_df,
#         how='left'
#     )

#     # Vectorized time difference calculation
#     time_diff = abs(matches['elapsed_seconds'] - matches['manual_timediff'])
#     matched_locations = (time_diff <= 2).sum()
    
#     total_locations = len(locations_df)
#     match_percentage = (matched_locations / total_locations) * 100

#     return LocationMatchResponse(
#         is_on_bus=matched_locations >= (total_locations * 0.7),
#         message=f'Matched {matched_locations}/{total_locations} points ({match_percentage:.1f}%)'
#     )