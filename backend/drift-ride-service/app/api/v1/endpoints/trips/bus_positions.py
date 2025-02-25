# app/routes/bus_positions.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis
import json
import asyncio
import logging

from app.models.client_position import ClientPosition
from app.core.auth import verify_websocket_api_key, WebSocketAuthError
from app.api.v1.endpoints.trips.utils.position_utils import filter_positions_by_h3

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

def get_redis_client():
    return redis.Redis(
        host="redis",
        port=6379,
        decode_responses=True
    )

@router.websocket("")
async def bus_positions_websocket(websocket: WebSocket):
    logger.info("WebSocket connection attempt received")

    try:
        await verify_websocket_api_key(websocket)
        await websocket.accept()
        logger.info("WebSocket authenticated and accepted")
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        await websocket.close(code=4001, reason="Authentication failed")
        return

    redis_client = get_redis_client()
    stream_key = "translink_enriched:position:stream"
    logger.info(f"Connected to Redis, stream key: {stream_key}")

    try:
        logger.info("Waiting for initial client position data...")
        try:
            raw_data = await websocket.receive_json()
        except Exception as e:
            logger.error("Failed to receive valid JSON data", exc_info=True)
            await websocket.close(code=1003, reason="Invalid JSON data")
            return

        try:
            client_data = ClientPosition(**raw_data)
            client_h3 = client_data.to_h3()
        except Exception as e:
            logger.error("Failed to process client data", exc_info=True)
            await websocket.close(code=1003, reason="Invalid client data")
            return

        # Fetch and process the initial message from Redis
        try:
            last_messages = redis_client.xrevrange(stream_key, count=1)
        except Exception as e:
            logger.error("Error fetching initial messages from Redis", exc_info=True)
            last_messages = []

        if last_messages:
            message_id, message_data = last_messages[0]
            try:
                positions = json.loads(message_data['data'])
            except json.JSONDecodeError as e:
                logger.error("Failed to parse positions JSON", exc_info=True)
                await websocket.close(code=1003, reason="Invalid message data")
                return

            filtered_positions = filter_positions_by_h3(positions, client_h3)
            logger.info(f"Initial filtered positions count: {len(filtered_positions)}")

            if filtered_positions:
                await websocket.send_json({
                    "timestamp": message_data['timestamp'],
                    "data": filtered_positions
                })
        else:
            logger.warning("No messages found in Redis stream")

        # Continuous message monitoring
        latest_id = '$'
        logger.info("Starting continuous message monitoring")
        connection_active = True

        while connection_active:
            try:
                messages = redis_client.xread({stream_key: latest_id}, count=100, block=2000)
                if messages:
                    stream_name, stream_messages = messages[0]
                    for message_id, message_data in stream_messages:
                        latest_id = message_id
                        try:
                            positions = json.loads(message_data['data'])
                        except Exception as e:
                            logger.error("Error parsing message data", exc_info=True)
                            continue

                        filtered_positions = filter_positions_by_h3(positions, client_h3)
                        if filtered_positions:
                            logger.info(f"Sending {len(filtered_positions)} positions to client")
                            await websocket.send_json({
                                "timestamp": message_data['timestamp'],
                                "data": filtered_positions
                            })
                else:
                    await asyncio.sleep(0.1)
            except WebSocketDisconnect:
                logger.info("Client disconnected")
                connection_active = False
            except redis.RedisError as e:
                logger.error("Redis error encountered", exc_info=True)
                await asyncio.sleep(1)
            except Exception as e:
                logger.error("Error processing messages", exc_info=True)
                await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error("Error in WebSocket connection", exc_info=True)
    finally:
        logger.info("Closing WebSocket connection")
        try:
            await websocket.close()
        except Exception as e:
            logger.error("Error closing WebSocket", exc_info=True)
