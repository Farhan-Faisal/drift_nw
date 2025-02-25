import pandas as pd
import json
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def gtfs_shapes_to_geojson(df):
    """
    Convert a GTFS shapes DataFrame into a GeoJSON object.

    Parameters:
        df (pandas.DataFrame): DataFrame with GTFS shapes data having columns:
            - shape_id
            - shape_pt_lat
            - shape_pt_lon
            - shape_pt_sequence
            - shape_dist_traveled

    Returns:
        dict: A GeoJSON-like dictionary with key "routes" mapping to a FeatureCollection.
    """
    features = []
    
    # Group the DataFrame by shape_id
    for shape_id, group in df.groupby("shape_id"):
        # Sort points by the sequence
        group_sorted = group.sort_values("shape_pt_sequence")
        # GeoJSON requires coordinates as [longitude, latitude]
        coordinates = group_sorted[['shape_pt_lon', 'shape_pt_lat']].values.tolist()
        
        # Create a GeoJSON Feature for the current route
        feature = {
            "type": "Feature",
            "properties": {"shape_id": shape_id},
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            }
        }
        features.append(feature)
    
    # Build the final GeoJSON object wrapped in a "routes" key
    geojson = {
        "routes": {
            "type": "FeatureCollection",
            "features": features
        }
    }
    
    return geojson


def get_shape_by_route_id(geojson, shape_id):
    """
    Given a GeoJSON dictionary with a "routes" key and a shape_id,
    return the geometry for that shape.

    Parameters:
        geojson (dict): A dictionary with a "routes" key containing a FeatureCollection.
        shape_id (str or int): The shape ID to query for.

    Returns:
        dict or None: The geometry of the matching route as a GeoJSON object, or None if not found.
    """
    features = geojson.get("routes", {}).get("features", [])
    for feature in features:
        if feature.get("properties", {}).get("shape_id") == shape_id:
            return feature.get("geometry")
    return None