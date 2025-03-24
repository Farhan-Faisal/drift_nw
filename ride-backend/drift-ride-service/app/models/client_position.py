from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import h3
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

class ClientPosition(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Client latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Client longitude")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Client timestamp")

    def __init__(self, **data):
        logger.info(f"Initializing ClientPosition with data: {data}")
        try:
            super().__init__(**data)
            logger.info(f"Successfully created ClientPosition: lat={self.latitude}, lon={self.longitude}")
        except Exception as e:
            logger.error(f"Failed to create ClientPosition: {str(e)}", exc_info=True)
            raise

    def to_h3(self, resolution: int = 7) -> str:
        """Convert latitude and longitude to H3 index"""
        logger.info(f"Converting to H3 index: lat={self.latitude}, lon={self.longitude}, resolution={resolution}")
        h3_index = h3.geo_to_h3(self.latitude, self.longitude, resolution)
        logger.info(f"Generated H3 index: {h3_index}")
        return h3_index