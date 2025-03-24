function checkDistanceThreshold(distance, threshold) {
    // Check if the distance is within the threshold, in meters
    if (distance <= threshold) {
        return true;
    }
    return false;
}