import route_shapes from '@/assets/shapes.json';
import unique_routes from '@/assets/unique_routes.json';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

export const flushBus = (
    data: any, 
    busLocations: any, 
    setBusData: any
  ) => {
    const newBusLocations = new Map(busLocations);
    // const newBusHistory = new Map(busHistory);
  
    for (const value of data) {
      const parsedData = JSON.parse(value);
      if (parsedData?.data) {
        parsedData.data.forEach((bus: any) => {
          // const prevCoords = busHistory.get(bus.route_id);
          const currCoords = { latitude: bus.latitude, longitude: bus.longitude, bearing: bus.bearing ? bus.bearing : 0 };
  
          // const prevbearing = prevCoords ? prevCoords.bearing : 0;
          // const bearing = prevCoords ? calculateBearing(prevCoords, currCoords) : prevbearing;
          
  
          newBusLocations.set(bus.route_id, { ...currCoords });
          // newBusHistory.set(bus.route_id, currCoords);
        });
      }
    }
  
    setBusData(Array.from(newBusLocations.entries()).map(([route_id, coords]) => (typeof coords === 'object' ? { route_id, ...coords } : { route_id, coords })));
    // setBusHistory(newBusHistory);
  
    busLocations.clear();
    newBusLocations.forEach((value, key) => busLocations.set(key, value));
    data.clear();
};

export const fetchNearestRoutes = async (
    location: any, 
    API_URL: any, 
    setRoutes: any, 
    setError: any 
  ) => {
      try {
        const response = await fetch(`${API_URL}?latitude=${location.latitude}&longitude=${location.longitude}`);
        if (!response.ok) throw new Error("Failed to fetch routes");
  
        const data = await response.json();
        const nearestRoutes = data.routes; // Extract the array of nearest routes
  
        // Call loadRouteData with filtering applied
        loadRouteData(nearestRoutes, setRoutes);
  
      } catch (err) {
        setError(err.message);
      } 
};
  
export const loadRouteData = (
    nearestRoutes: Array<{ route_id: string, shape_id: number, color: string }>, 
    setRoutes: any
  ) => {
      const groupedRoutes: Record<number, Array<{ route_id: string; latitude: number; longitude: number; color: string }>> = {};
  
      // Convert nearestRoutes to a Map for quick lookup {shape_id → { route_id, color }}
      const nearestShapes = new Map(nearestRoutes.map(route => [route.shape_id, { route_id: route.route_id, color: route.color }]));
  
      // Iterate through route_shapes and only keep those in nearestRoutes
      route_shapes.forEach((shape) => {
          const { shape_id, shape_pt_lat, shape_pt_lon } = shape;
  
          if (!nearestShapes.has(shape_id)) return; 
  
          const { route_id, color } = nearestShapes.get(shape_id)!;
  
          if (!groupedRoutes[shape_id]) {
              groupedRoutes[shape_id] = [];
          }
  
          groupedRoutes[shape_id].push({
              route_id,   
              latitude: shape_pt_lat,
              longitude: shape_pt_lon,
              color,      
          });
      });
  
      setRoutes(groupedRoutes);
      // console.log('Filtered Routes:', groupedRoutes); 
};

export const setupWebSocket = (ws: WebSocket, data: Set<any>) => {
    ws.onmessage = (event) => {
        data.add(event.data);
        console.log(event.data)
    };

    ws.onclose = () => {
        console.log('WebSocket closed');
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
};

// Function to get color from the state using route_id
export const getColorFromRouteId = (routes: any, route_id: String) => {

    const shapeID = unique_routes.shape_id[String(route_id)];


    if (!routes || !routes[shapeID] || routes[shapeID].length === 0) {
        return "#000000";
    }

    return routes[shapeID][0].color; 
};
