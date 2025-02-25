#!/usr/bin/env python3
"""
Translink Realtime Data Fetcher

This script defines a TranslinkDataFetcher class that fetches GTFS realtime data
from Translink's API and writes it to Redis.
"""

from pathlib import Path
import sys
import requests
import json
import pandas as pd
from datetime import datetime

from app.translink.utils.secrets import SecretsManager
from app.translink.utils.parser import parse_gtfs_realtime_data
from app.translink.utils.redis_client import drift_redis_client, store_with_history

class TranslinkRealtimeFetcher:
    def __init__(self, output_dir: str = "/tmp"):
        # Use SecretsManager to get the API key; adjust the cloud provider as needed
        self.api_key = SecretsManager(cloud_provider='local').get_parameter('TRANSLINK_KEY')
        self.realtime_url = f"https://gtfsapi.translink.ca/v3/gtfsrealtime?apikey={self.api_key}"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def fetch_gtfs_data(self, url: str) -> bytes:
        try:
            response = requests.get(url)
            response.raise_for_status()
            return response.content
        except requests.RequestException:
            return None

    def write_to_redis(self, df: pd.DataFrame, tag: str):
        client = drift_redis_client()
        key = f"translink:{tag}"
        
        # Convert DataFrame to JSON
        data_json = df.to_json(orient="records")
        # Store with history
        store_with_history(client, key, data_json)

    def run(self):
        realtime_data_raw = self.fetch_gtfs_data(self.realtime_url)
        if not realtime_data_raw:
            return 
        realtime_df = parse_gtfs_realtime_data(realtime_data_raw)
        self.write_to_redis(realtime_df, "realtime")

async def get_realtime():
    """Async wrapper for realtime fetcher"""
    fetcher = TranslinkRealtimeFetcher()
    fetcher.run()

if __name__ == "__main__":
    fetcher = TranslinkRealtimeFetcher()
    fetcher.run()