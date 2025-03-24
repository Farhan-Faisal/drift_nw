function getDistanceBetweenLongLat(lat1, lon1, lat2, lon2) {
    /*
    Function to calculate the distance between two points on the Earth's surface

    Returns distance in meters
    */

    // Radius of the Earth in kilometers
    const earthRadius = 6371; 

    // Change in log/lat
    const deltaLat = degToRad(lat2 - lat1);
    const deltaLon = degToRad(lon2 - lon1);

    // Haversine formula
    const haversine =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const angularDist = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    const distance = earthRadius * angularDist; 
    
    // Distance in meters
    return distance * 1000;
}
  
function degToRad(deg) {
    return deg * (Math.PI / 180);
}

// test ubc to kerrisdale
const lat1 = 49.26238992658674; // ubc life sci
const lon1 = -123.2446290284317; 
const lat2 = 49.23459584579923; // kerrisdale
const lon2 = -123.15533655170418; 

const distance = getDistanceBetweenLongLat(lat1, lon1, lat2, lon2);
console.log(`Distance: ${distance} meters`);

// 7180.5046477606975 m