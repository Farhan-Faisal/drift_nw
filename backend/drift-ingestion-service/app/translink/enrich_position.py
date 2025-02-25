#!/usr/bin/env python3
"""
Translink Position Data Enricher

This script reads the two most recent messages from the raw Redis stream
"translink:position:stream", calculates the bearing for each position (by comparing
the latest message with the previous one), and writes the enriched message to the
enriched Redis stream "translink_enriched:position:stream".

If no previous message is found or for any missing value, the bearing is defaulted to 90.
"""

import json
import math
from datetime import datetime, timezone
import redis

from app.translink.utils.redis_client import drift_redis_client

# Define the stream keys
RAW_STREAM = "translink:position:stream"
ENRICHED_STREAM = "translink_enriched:position:stream"

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the initial bearing between two geographic coordinates.
    Returns a bearing in degrees (0-360).
    """
    # Convert degrees to radians.
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dLon = lon2 - lon1
    x = math.sin(dLon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLon)
    initial_bearing = math.atan2(x, y)
    # Convert from radians to degrees and normalize the angle to 0-360.
    initial_bearing = math.degrees(initial_bearing)
    return (initial_bearing + 360) % 360

def enrich_latest_message():
    """
    Reads the two most recent messages from the raw stream, computes a bearing
    for each position in the latest message using the previous message, and writes
    the enriched data to the enriched stream.
    """
    client = drift_redis_client()

    # Get the two most recent messages from the raw stream.
    # XREVRANGE returns messages in reverse order (most recent first).
    messages = client.xrevrange(RAW_STREAM, count=2)
    if not messages:
        print("No messages in raw stream")
        return

    # Latest message is at index 0.
    latest_msg_id, latest_msg_data = messages[0]
    latest_data_str = latest_msg_data.get("data")
    if not latest_data_str:
        print("Latest message missing 'data'")
        return

    try:
        latest_positions = json.loads(latest_data_str)
    except Exception as e:
        print(f"Error decoding latest message data: {e}")
        return

    # Try to get the previous message (if available).
    if len(messages) > 1:
        _, prev_msg_data = messages[1]
        prev_data_str = prev_msg_data.get("data")
        try:
            prev_positions = json.loads(prev_data_str)
        except Exception as e:
            print(f"Error decoding previous message data: {e}")
            prev_positions = None
    else:
        prev_positions = None

    # Enrich the latest positions.
    enriched_positions = []
    for idx, pos in enumerate(latest_positions):
        lat = pos.get("latitude")
        lon = pos.get("longitude")
        # If either coordinate is missing, set bearing to default.
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
                        print(f"Error calculating bearing for index {idx}: {e}")
                        pos["bearing"] = 90
                else:
                    pos["bearing"] = 90
            else:
                pos["bearing"] = 90
        enriched_positions.append(pos)

    enriched_data_json = json.dumps(enriched_positions)
    current_time = datetime.now(timezone.utc).isoformat()

    # Write the enriched data to the enriched stream.
    client.xadd(
        ENRICHED_STREAM,
        {
            "data": enriched_data_json,
            "timestamp": current_time
        },
        maxlen=20,
        approximate=True
    )
    print(f"Enriched message written to {ENRICHED_STREAM} based on raw message {latest_msg_id}")

def enrich_position():
    """
    Wrapper function to run the enrichment process.
    Intended to be scheduled periodically.
    """
    enrich_latest_message()

if __name__ == "__main__":
    enrich_latest_message()
