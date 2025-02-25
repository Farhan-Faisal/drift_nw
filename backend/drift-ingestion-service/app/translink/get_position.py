#!/usr/bin/env python3
"""
Translink Position Data Fetcher & Enricher

This script fetches GTFS position data from Translink's API, writes it to Redis
as the source of truth, and then immediately enriches it by computing bearings
(using the previous raw data message for comparison). The enriched message is
written to a separate Redis stream.
"""

from pathlib import Path
import json
import math
import requests
import pandas as pd
from datetime import datetime, timezone
import os

from app.translink.utils.secrets import SecretsManager
from app.translink.utils.parser import parse_gtfs_position_data
from app.translink.utils.redis_client import drift_redis_client, store_with_history

import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define Redis stream keys.
RAW_STREAM = "translink:position:stream"
ENRICHED_STREAM = "translink_enriched:position:stream"

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the initial bearing between two geographic coordinates.
    Returns a bearing in degrees (0-360).
    """
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dLon = lon2 - lon1
    x = math.sin(dLon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon)
    initial_bearing = math.atan2(x, y)
    initial_bearing = math.degrees(initial_bearing)
    return (initial_bearing + 360) % 360

class TranslinkPositionFetcher:
    def __init__(self, output_dir: str = "/tmp"):
        # Get cloud provider from environment (default to 'local')
        cloud_provider = os.getenv('CLOUD_PROVIDER', 'local')
        
        # Retrieve API key using SecretsManager
        logger.info(f"Using cloud provider: {cloud_provider} for secrets")
        self.secrets_manager = SecretsManager(cloud_provider=cloud_provider)
        
        # Get the Translink API key
        translink_secret_name = os.getenv('TRANSLINK_SECRET_NAME', 'TRANSLINK_KEY')
        self.api_key = self.secrets_manager.get_parameter(translink_secret_name)
        
        if not self.api_key:
            logger.error(f"Failed to retrieve Translink API key using cloud provider: {cloud_provider}")
            raise ValueError("Could not retrieve Translink API key")
            
        self.position_url = f"https://gtfsapi.translink.ca/v3/gtfsposition?apikey={self.api_key}"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def fetch_gtfs_data(self, url: str) -> bytes:
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.content
        except requests.RequestException as e:
            logger.error(f"Error fetching GTFS data: {e}")
            return None
    
    def write_to_redis(self, position_data: list, tag: str):
        """
        Writes the given position data to Redis as the source of truth and appends it
        to a stream.
        """
        client = drift_redis_client()
        key = f"translink:{tag}"
        stream_key = f"translink:{tag}:stream"
        
        # Convert position data to JSON.
        data_json = json.dumps(position_data)
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Store the current state.
        store_with_history(client, key, data_json)
        
        # Append to stream.
        client.xadd(
            stream_key,
            {
                "data": data_json,
                "timestamp": current_time
            },
            maxlen=20,
            approximate=True
        )
    
    def enrich_latest_message(self):
        """
        Reads the two most recent messages from the raw stream, computes a bearing
        for each position (using the previous message for comparison), and writes the
        enriched message to the enriched stream.
        If any coordinate is missing or there is no previous message, the bearing defaults to 90.
        """
        client = drift_redis_client()
        messages = client.xrevrange(RAW_STREAM, count=2)
        if not messages:
            logger.warning("No messages in raw stream")
            return
        
        # Latest message (most recent).
        latest_msg_id, latest_msg_data = messages[0]
        latest_data_str = latest_msg_data.get("data")
        if not latest_data_str:
            logger.error("Latest message missing 'data'")
            return
        
        try:
            latest_positions = json.loads(latest_data_str)
        except Exception as e:
            logger.error(f"Error decoding latest message data: {e}")
            return
        
        # Get previous message if available.
        if len(messages) > 1:
            _, prev_msg_data = messages[1]
            prev_data_str = prev_msg_data.get("data")
            try:
                prev_positions = json.loads(prev_data_str)
            except Exception as e:
                logger.error(f"Error decoding previous message data: {e}")
                prev_positions = None
        else:
            prev_positions = None
        
        enriched_positions = []
        for idx, pos in enumerate(latest_positions):
            lat = pos.get("latitude")
            lon = pos.get("longitude")
            # Set default bearing if any coordinate is missing.
            if lat is None or lon is None:
                pos["bearing"] = 90
            else:
                if prev_positions and idx < len(prev_positions):
                    prev_pos = prev_positions[idx]
                    prev_lat = prev_pos.get("latitude")
                    prev_lon = prev_pos.get("longitude")
                    if prev_lat is not None and prev_lon is not None:
                        try:
                            pos["bearing"] = calculate_bearing(prev_lat, prev_lon, lat, lon)
                        except Exception as e:
                            logger.error(f"Error calculating bearing for index {idx}: {e}")
                            pos["bearing"] = 90
                    else:
                        pos["bearing"] = 90
                else:
                    pos["bearing"] = 90
            enriched_positions.append(pos)
        
        enriched_data_json = json.dumps(enriched_positions)
        current_time = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"Writing {len(enriched_positions)} enriched positions to Redis")

        client.xadd(
            ENRICHED_STREAM,
            {
                "data": enriched_data_json,
                "timestamp": current_time
            },
            maxlen=20,
            approximate=True
        )
        logger.info(f"Enriched message written to {ENRICHED_STREAM} based on raw message {latest_msg_id}")
    
    def run(self):
        # Fetch raw GTFS data.
        raw_data = self.fetch_gtfs_data(self.position_url)
        if not raw_data:
            logger.error("No raw data fetched.")
            return
        
        # Parse the raw data.
        position_data = parse_gtfs_position_data(raw_data)
        
        logger.info(f"Writing {len(position_data)} positions to Redis")

        # Write raw data to Redis as source of truth.
        self.write_to_redis(position_data, "position")
        


        # Immediately enrich the latest raw message.
        self.enrich_latest_message()

async def get_position():
    """Async wrapper for the fetcher/enricher."""
    fetcher = TranslinkPositionFetcher()
    fetcher.run()

if __name__ == "__main__":
    fetcher = TranslinkPositionFetcher()
    fetcher.run()
