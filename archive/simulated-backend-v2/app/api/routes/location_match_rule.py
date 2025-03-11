## Phone actual
class LocationPoint(BaseModel):
    first_timestamp: str 
    timestamp: str 
    lat: float
    lon: float
    elapsed_seconds: Union[float, None] = None
    h3: Union[str, None] = None

@app.post("/location-match/rule-based")
@limiter.limit("100/minute")
async def receive_user_location(
    request: Request,
    locations: list[LocationPoint]
):

    first_timestamp = datetime.strptime(locations[0].first_timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S")
    first_five = locations[:5]
    last_five = locations[-5:]

    # Calculate average positions and times
    first_avg_lat = sum(p.lat for p in first_five) / 5
    first_avg_lon = sum(p.lon for p in first_five) / 5
    last_avg_lat = sum(p.lat for p in last_five) / 5
    last_avg_lon = sum(p.lon for p in last_five) / 5

    # Calculate average timestamps
    # first_avg_time = sum(
    #     datetime.strptime(p.timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S").timestamp() 
    #     for p in first_five
    # ) / 5
    last_avg_time = sum(
        datetime.strptime(p.timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S").timestamp() 
        for p in last_five
    ) / 5

    # Calculate time difference in seconds
    time_diff_seconds = last_avg_time - first_timestamp

    if time_diff_seconds == 0:
        return {
            "matches": [],
            "total_matches": 0,
            "message": "Time difference too small"
        }

    # Use Haversine distance between averaged points
    distance_meters = calculate_haversine_distance(
        first_avg_lat, first_avg_lon,
        last_avg_lat, last_avg_lon
    )

    # Calculate speed in meters per second
    speed_mps = distance_meters / time_diff_seconds

    # Check either speed OR distance threshold
    SPEED_THRESHOLD_MPS = 5.56  # 20 km/h in m/s
    MIN_DISTANCE_METERS = 1000  # 1km threshold

    if speed_mps < SPEED_THRESHOLD_MPS and distance_meters < MIN_DISTANCE_METERS:
        return {
            "matches": [],
            "total_matches": 0,
            "message": f"Neither speed ({speed_mps:.2f} m/s) nor distance ({distance_meters:.2f} m) meet thresholds"
        }

    first_timestamp = datetime.strptime(locations[0].timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S")

    # Calculate elapsed seconds and h3 for each location
    for location in locations:
        current_timestamp = datetime.strptime(location.timestamp.split('.')[0], "%Y-%m-%d %H:%M:%S")
        location.elapsed_seconds = (current_timestamp - first_timestamp).total_seconds()
        location.h3 = get_h3_coords(location.lat, location.lon, 10)

    # Load bus data
    csv_path = os.path.join(os.path.dirname(__file__), "data/simulated/simulated_buses_multi.csv")
    df = pd.read_csv(csv_path)   

    # Filter by time tolerance
    tolerance = 5
    time_filtered_df = df[df['manual_timediff'].apply(
        lambda x: any(abs(x - loc.elapsed_seconds) <= tolerance for loc in locations)
    )]

    # Calculate h3 for filtered buses
    time_filtered_df['h3'] = time_filtered_df.apply(
        lambda x: get_h3_coords(x['latitude'], x['longitude'], 10), 
        axis=1
    )

    # Filter by h3 spatial match
    matched_buses = time_filtered_df[
        time_filtered_df['h3'].apply(
            lambda x: any(x == loc.h3 for loc in locations)
        )
    ]

    return {
        "matches": matched_buses.to_dict(orient='records'),
        "total_matches": len(matched_buses)
    }
