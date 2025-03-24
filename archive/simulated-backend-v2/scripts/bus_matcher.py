import pandas as pd
import numpy as np
import h3
import math

def get_h3_coords(lat, lng, resolution):
    lat = float(lat)
    lng = float(lng)
    return h3.geo_to_h3(lat, lng, resolution)

def match_gps_to_bus(phone_lat, phone_lon, bus_lat, bus_lon, resolution=10):
    phone_h3 = get_h3_coords(phone_lat, phone_lon, resolution)
    bus_h3 = get_h3_coords(bus_lat, bus_lon, resolution)
    return phone_h3 == bus_h3

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters
    """
    R = 6371000  # Earth's radius in meters

    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c