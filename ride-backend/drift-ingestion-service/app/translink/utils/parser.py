import pandas as pd
from google.transit import gtfs_realtime_pb2
from datetime import datetime, timezone
import h3 

def parse_gtfs_realtime_data(response: bytes) -> pd.DataFrame:
    """
    Parse GTFS realtime data from the response.

    Args:
        response (bytes): The raw GTFS realtime data.

    Returns:
        pd.DataFrame: A DataFrame containing parsed realtime data.
    """
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response)

    rows = []
    for entity in feed.entity:
        if not entity.HasField("trip_update"):
            continue  # Skip if there's no trip_update

        trip_update = entity.trip_update
        trip = trip_update.trip
        vehicle = trip_update.vehicle

        base_row = {
            "id": entity.id,
            "is_deleted": entity.is_deleted,
            "trip_id": trip.trip_id,
            "start_date": trip.start_date,
            "schedule_relationship": trip.schedule_relationship,
            "route_id": trip.route_id,
            "direction_id": trip.direction_id,
            "vehicle_id": vehicle.id if vehicle.HasField("id") else None,
            "vehicle_label": vehicle.label if vehicle.HasField("label") else None,
            "current_datetime": datetime.utcnow(),  # Use UTC for consistency
        }

        for stop_time_update in trip_update.stop_time_update:
            row = base_row.copy()
            row.update(
                {
                    "stop_sequence": stop_time_update.stop_sequence,
                    "stop_id": stop_time_update.stop_id,
                    "arrival_delay": (
                        stop_time_update.arrival.delay
                        if stop_time_update.HasField("arrival")
                        else None
                    ),
                    "arrival_time": (
                        stop_time_update.arrival.time
                        if stop_time_update.HasField("arrival")
                        else None
                    ),
                    "departure_delay": (
                        stop_time_update.departure.delay
                        if stop_time_update.HasField("departure")
                        else None
                    ),
                    "departure_time": (
                        stop_time_update.departure.time
                        if stop_time_update.HasField("departure")
                        else None
                    ),
                    "stop_schedule_relationship": stop_time_update.schedule_relationship,
                }
            )
            rows.append(row)

    if rows:
        return pd.DataFrame(rows)
    else:
        return pd.DataFrame()

def parse_gtfs_position_data(response: bytes) -> pd.DataFrame:
    """
    Parse GTFS position data from the response.

    Args:
        response (bytes): The raw GTFS position data.

    Returns:
        pd.DataFrame: A DataFrame containing parsed position data.
    """
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response)

    rows = []
    for entity in feed.entity:
        if not entity.HasField("vehicle"):
            continue  # Skip if there's no vehicle information

        vehicle = entity.vehicle
        trip = vehicle.trip
        position = vehicle.position

        try:
            h3_7 = h3.geo_to_h3(position.latitude, position.longitude, 7)
        except:
            h3_7 = ""
        # row = {
        #     "id": entity.id,
        #     "trip_id": trip.trip_id,
        #     "start_date": trip.start_date,
        #     "schedule_relationship": trip.schedule_relationship,
        #     "route_id": trip.route_id,
        #     "direction_id": trip.direction_id,
        #     "vehicle_id": (
        #         vehicle.vehicle.id if vehicle.vehicle.HasField("id") else None
        #     ),
        #     "vehicle_label": (
        #         vehicle.vehicle.label if vehicle.vehicle.HasField("label") else None
        #     ),
        #     "latitude": (
        #         position.latitude if position.HasField("latitude") else None
        #     ),
        #     "longitude": (
        #         position.longitude if position.HasField("longitude") else None
        #     ),
        #     "current_stop_sequence": (
        #         vehicle.current_stop_sequence
        #         if vehicle.HasField("current_stop_sequence")
        #         else None
        #     ),
        #     "current_status": (
        #         vehicle.current_status
        #         if vehicle.HasField("current_status")
        #         else None
        #     ),
        #     "timestamp": (
        #         vehicle.timestamp if vehicle.HasField("timestamp") else None
        #     ),
        #     "stop_id": vehicle.stop_id if vehicle.HasField("stop_id") else None,
        #     "current_datetime": datetime.utcnow(),  # Use UTC for consistency
        # }
        # rows.append(row)

        row = {
            "id": str(entity.id),  # Ensure string type
            "trip_id": str(trip.trip_id),
            "start_date": str(trip.start_date),
            "schedule_relationship": int(trip.schedule_relationship),
            "route_id": str(trip.route_id),
            "direction_id": int(trip.direction_id),
            "vehicle_id": str(vehicle.vehicle.id) if vehicle.vehicle.HasField("id") else None,
            "vehicle_label": str(vehicle.vehicle.label) if vehicle.vehicle.HasField("label") else None,
            "latitude": float(position.latitude) if position.HasField("latitude") else None,
            "longitude": float(position.longitude) if position.HasField("longitude") else None,
            "current_stop_sequence": int(vehicle.current_stop_sequence) if vehicle.HasField("current_stop_sequence") else None,
            "current_status": int(vehicle.current_status) if vehicle.HasField("current_status") else None,
            "timestamp": int(vehicle.timestamp) if vehicle.HasField("timestamp") else None,
            "stop_id": str(vehicle.stop_id) if vehicle.HasField("stop_id") else None,
            # "current_datetime": datetime.utcnow(),
            "current_datetime": datetime.now(timezone.utc).isoformat(),
            "h3_7": h3_7
        }
        rows.append(row)

    if rows:
        # return pd.DataFrame(rows)
        return rows
    else:
        return None