# app/utils/position_utils.py
import h3

K_RING_DISTANCE = 1  # or import from your config

def filter_positions_by_h3(positions, client_h3, ring_distance=K_RING_DISTANCE):
    """
    Filters a list of positions based on whether the 'h3_7' field is within
    the k-ring of the provided client_h3.
    """
    neighbor_indexes = h3.k_ring(client_h3, ring_distance)
    return [pos for pos in positions if pos.get('h3_7') in neighbor_indexes]

def extract_unique_routes(positions):
    """
    Extracts all unique route IDs from the list of positions.
    """
    return list({pos.get('route_id') for pos in positions if pos.get('route_id')})
