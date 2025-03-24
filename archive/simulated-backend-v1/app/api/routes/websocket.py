@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Welcome to the Bus Tracking API",
        "available_endpoints": {
            "API Documentation": "/docs",
            "Test Endpoint": "/test",
            "WebSocket Test Page": "/static/websocket_test.html",
            "Simulated WebSocket": "ws://localhost:8080/ws/simulated"
        }
    }

@app.websocket("/ws/simulated")
async def simulated_websocket_endpoint(websocket: WebSocket, speed_multiplier: float = 1.0):
    headers = dict(websocket.headers)
    if headers.get('x-api-key') != API_KEY:
        await websocket.close(code=4003)
        return
        
    await websocket.accept()
    try:
        # Load and prepare the data
        csv_path = os.path.join(os.path.dirname(__file__), "data/simulated/simulated_buses_multi.csv")
        df = pd.read_csv(csv_path)
        # df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Convert numpy int64 to standard Python int
        df['manual_timediff'] = df['manual_timediff'].astype(int)
        df['elapsed_seconds'] = df['elapsed_seconds'].astype(int)
        
        grouped_times = [int(x) for x in df['manual_timediff'].unique()]
        grouped_times.sort()
        wait_times = [int(x) for x in np.diff(grouped_times)]
        wait_times.insert(0, 0)
        
        # Group data by elapsed_seconds
        for current_time, wait_time in zip(grouped_times, wait_times):
            # Get data for current timestamp
            current_data = df[df['manual_timediff'] == current_time]
            
            # Convert to list of dictionaries and ensure all values are JSON serializable
            data_to_send = current_data.to_dict(orient='records')
            # print(data_to_send)
            
            # Send the batch
            await websocket.send_json({
                "timestamp": str(current_data['timestamp'].iloc[0]),
                "manual_timediff": current_time,
                "data": data_to_send
            })
            
            # Apply speed multiplier to wait time (faster if multiplier > 1)
            adjusted_wait_time = wait_time / speed_multiplier
            await asyncio.sleep(adjusted_wait_time)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error in websocket: {str(e)}")
        await websocket.close()

@app.get("/test", dependencies=[Depends(verify_api_key)])
@limiter.limit("100/minute")
async def test_endpoint(request: Request):
    return {
        "status": "ok",
        "message": "Welcome to the Bus Tracking API",
        "available_endpoints": {
            "API Documentation": "/docs",
            "Root": "/",
            "Simulated WebSocket": "ws://localhost:8000/ws/simulated"
        }
    }
