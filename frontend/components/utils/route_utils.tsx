import route_shapes_raw from '@/assets/shapes.json';
import unique_routes from '@/assets/unique_routes.json';
import busNames from '@/assets/bus_names.json';


interface UniqueRoutes {
  shape_id: Record<string, number>;
  color: Record<string, string>;
}

interface ShapePoint {
  shape_id: number;
  shape_pt_lat: number;
  shape_pt_lon: number;
}

interface NearestRoute {
  route_id: string;
  shape_id: number;
  color: string;
}

interface GroupedRoute {
  route_id: string;
  latitude: number;
  longitude: number;
  color: string;
}
interface Location {
  latitude: number;
  longitude: number;
}
interface BusInfo {
  shape_id: number | string;
  trip_headsign: string;
}



type SetRoutes = (routes: Record<number, GroupedRoute[]>) => void;
type SetError = (msg: string) => void;



const typed_unique_routes = unique_routes as UniqueRoutes;
const route_shapes = route_shapes_raw as ShapePoint[];
const typed_bus_names = busNames as BusInfo[];

/**
 * A list of route IDs that should always be included in the loaded map data,
 * even if they are not returned by the nearest routes API.
 */
const forcedRouteIds = [
  "6614", "11201", "6627", "6636", "37810", "33538", "6641", "16718", "6638"
];


/**
 * Retrieves the shape ID associated with a given route ID.
 *
 * @param {number} routeId - The numeric ID of the route.
 * @returns {number} The shape ID corresponding to the provided route ID.
 *
 * @example
 * const shapeId = get_shape_id_from_route_id(6613);
 * console.log(shapeId); // e.g., 12345
 */
export const get_shape_id_from_route_id = (routeId: number): number => {
  return typed_unique_routes.shape_id[String(routeId)];
};


/**
 * Loads the closest transit routes to the user by filtering from the master `route_shapes` list.
 *
 * This function takes in a list of nearby routes (with `route_id`, `shape_id`, and `color`),
 * and filters the master `route_shapes` object to include only shape points that match the given `shape_id`s.
 * It then groups the matching shape points by `shape_id` and attaches metadata such as `route_id` and `color`.
 * The resulting grouped data is passed into the provided `setRoutes` function to update state.
 *
 * Internally, the filtering is done using a lookup map (similar to using `.includes()` for `shape_id`).
 *
 * @param nearestRoutes - Array of the nearest routes to the user, each with `route_id`, `shape_id`, and `color`.
 * @param setRoutes - Callback function (typically a state setter) to update the filtered and grouped route shape data.
 *
 * @example
 * load_route_data(
 *   [{ route_id: "6613", shape_id: 101, color: "#FF0000" }],
 *   (routes) => setRoutes(routes)
 * );
 */
export const load_route_data = (
  nearestRoutes: Array<{ route_id: string; shape_id: number; color: string }>,
  setRoutes: any
) => {

  const groupedRoutes: Record<number, Array<{ 
    route_id: string; 
    latitude: number; 
    longitude: number; 
    color: string 
  }>> = {};

  const nearestShapes = new Map(
    nearestRoutes.map(
      route => [
        route.shape_id, { 
          route_id: route.route_id, 
          color: route.color 
        }
      ]
    )
  );

  // Filter and group route shapes
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
};


/**
 * Fetches the nearest transit routes based on the user's current location and updates the route shape data.
 *
 * This function calls the provided API with the user's geographic coordinates to retrieve nearby route information.
 * It also forcefully includes a predefined list of important route IDs (e.g., 6614, 11201, etc.) to ensure their
 * shapes are always loaded — even if they're not returned by the API. The combined route list is then passed to
 * `load_route_data` to populate grouped shape data, which is sent to the provided `setRoutes` state setter.
 *
 * If an error occurs during the fetch or processing, the error message is passed to the `setError` handler.
 *
 * @param location - The user's current location, containing `latitude` and `longitude` values.
 * @param API_URL - The base URL of the backend API endpoint to fetch nearby routes.
 * @param setRoutes - A callback function used to update state with grouped route shape data.
 * @param setError - A callback function used to handle and display errors during the fetch operation.
 *
 * @returns A Promise that resolves when route data is successfully fetched and processed.
 *
 * @example
 * fetchNearestRoutes(
 *   { latitude: 53.5461, longitude: -113.4938 },
 *   "https://api.example.com/routes",
 *   setRoutes,
 *   setError
 * );
 */
export const fetchNearestRoutes = async (
  location: Location,
  API_URL: string,
  setRoutes: SetRoutes,
  setError: SetError
): Promise<void> => {
  try {
    const response = await fetch(`${API_URL}?latitude=${location.latitude}&longitude=${location.longitude}`);
    if (!response.ok) throw new Error("Failed to fetch routes");

    const data = await response.json();

    // Narrow down the type of `data.routes`
    const nearestRoutes: NearestRoute[] = Array.isArray(data.routes)
      ? data.routes
      : [];

    const forcedRouteIds = [
      "6614", "11201", "6627", "6636", "37810", "33538", "6641", "16718", "6638"
    ];

    const forceIncludedRoutes: NearestRoute[] = forcedRouteIds
      .filter(route_id => !nearestRoutes.some(r => r.route_id === route_id))
      .map(route_id => ({
        route_id,
        shape_id: get_shape_id_from_route_id(Number(route_id)),
        color: typed_unique_routes.color[route_id] || "#000000"
      }));

    const allRoutes: NearestRoute[] = [...nearestRoutes, ...forceIncludedRoutes];

    load_route_data(allRoutes, setRoutes);
  } catch (err) {
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError("An unknown error occurred");
    }
  }
};


/**
 * Returns the color for a given route ID using grouped route shape data.
 *
 * It first retrieves the corresponding shape ID from `typed_unique_routes.shape_id`,
 * and then looks up the route in the provided grouped routes object.
 * If the color cannot be found, it defaults to black ("#000000").
 *
 * @param routes - A mapping of shape IDs to arrays of grouped route data.
 * @param route_id - The route ID to find the color for.
 * @returns The color associated with the route, or "#000000" if not found.
 */
export const get_color_from_route_id = (
  // routes: Record<number, GroupedRoute[]>,
  route_id: string
): string => {
  return typed_unique_routes.color[route_id] || "#000000";
};



/**
 * Retrieves the trip headsign (e.g., destination name) for a given route ID.
 *
 * This function looks up the associated `shape_id` for the given `routeId` using `typed_unique_routes`,
 * then finds the matching bus entry from the `busNames` list. If no match is found, it returns "Unknown".
 *
 * @param routeId - The numeric ID of the route (e.g., 6614).
 * @returns The trip headsign (e.g., "Downtown") or "Unknown" if not found.
 *
 * @example
 * const headsign = get_trip_head_sign(6614);
 * console.log(headsign); // "Downtown"
 */
export const get_trip_head_sign = (routeId: number): string => {
  const shapeID = typed_unique_routes.shape_id[String(routeId)];

  if (shapeID === undefined) return 'Unknown';

  const matchingBus = typed_bus_names.find(
    (bus) => Number(bus.shape_id) === shapeID
  );

  return matchingBus?.trip_headsign ?? 'Unknown';
};


/**
 * Calculates the bearing (direction) in degrees from a start point to an end point.
 *
 * The result is a compass bearing where 0° is north, 90° is east, etc.
 *
 * @param start - The starting geographic coordinate (latitude, longitude).
 * @param end - The destination geographic coordinate (latitude, longitude).
 * @returns The bearing in degrees between 0 and 360.
 *
 * @example
 * const bearing = calculate_bearing({ latitude: 53.5, longitude: -113.5 }, { latitude: 53.6, longitude: -113.4 });
 * console.log(bearing); // e.g., 45.12
 */
export function calculate_bearing(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(start.latitude);
  const lon1 = toRad(start.longitude);
  const lat2 = toRad(end.latitude);
  const lon2 = toRad(end.longitude);

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}


/**
 * Sets up WebSocket event handlers to receive and store incoming messages.
 *
 * This function listens for `message`, `close`, and `error` events on the provided WebSocket.
 * Incoming messages are added to the provided `Set`, and basic logging is performed for
 * debugging and monitoring.
 *
 * @param ws - A WebSocket instance to listen for events on.
 * @param data - A Set to store unique incoming message strings from the WebSocket.
 *
 * @example
 * const ws = new WebSocket("wss://my-server.com/stream");
 * const messageSet = new Set<string>();
 * setup_web_socket(ws, messageSet);
 */
export const setup_web_socket = (
  ws: WebSocket,
  data: Set<string>
): void => {
  ws.onmessage = (event: MessageEvent<string>) => {
    data.add(event.data);
    console.log("Received message:");
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
  };

  ws.onerror = (error: Event) => {
    console.error("WebSocket error:", error);
  };
};



/**
 * Finds the indices of the two closest points in a route to the current bus location.
 *
 * This function is useful for determining the segment of a route a bus is currently on.
 * It supports both static numeric values and animated values from libraries like React Native's `AnimatedRegion`.
 *
 * @param routeCoords - An array of coordinates that make up the route (each with latitude and longitude).
 * @param busLocation - The current location of the bus. Latitude and longitude can be numbers or animated values.
 * @returns A tuple containing the indices of the closest and second closest route points.
 *
 * @example
 * const [a, b] = find_closest_route_points(routeCoords, currentBusLocation);
 */
export function find_closest_route_points(
  routeCoords: Array<{ latitude: number; longitude: number }>,
  busLocation: {
    latitude: number | { __getValue: () => number };
    longitude: number | { __getValue: () => number };
  }
): [number, number] {
  const getLat = (lat: number | { __getValue: () => number }) =>
    typeof lat === "number" ? lat : lat.__getValue();

  const getLon = (lon: number | { __getValue: () => number }) =>
    typeof lon === "number" ? lon : lon.__getValue();

  const alat = getLat(busLocation.latitude);
  const blon = getLon(busLocation.longitude);

  let minDist = Infinity;
  let secondMinDist = Infinity;
  let minIndex = -1;
  let secondMinIndex = -1;

  for (let i = 0; i < routeCoords.length; i++) {
    const { latitude, longitude } = routeCoords[i];
    const dist = Math.sqrt((latitude - alat) ** 2 + (longitude - blon) ** 2);

    if (dist < minDist) {
      secondMinDist = minDist;
      secondMinIndex = minIndex;
      minDist = dist;
      minIndex = i;
    } else if (dist < secondMinDist) {
      secondMinDist = dist;
      secondMinIndex = i;
    }
  }

  if (minIndex > secondMinIndex) {
    [minIndex, secondMinIndex] = [secondMinIndex, minIndex];
  }

  return [minIndex, secondMinIndex];
}



/**
 * Processes incoming WebSocket data and updates animated bus locations.
 *
 * Parses JSON messages from the WebSocket, extracts live bus location data,
 * and updates the bus location state by merging the new coordinates.
 *
 * @param data - A Set of JSON strings representing WebSocket messages.
 * @param busLocations - A Map storing the latest known location per bus route.
 * @param setBusData - A state setter to update the component with animated bus data.
 */
export const flushBus = (
    data: any, 
    busLocations: any, 
    setBusData: any
  ) => {
    const newBusLocations = new Map(busLocations);

    for (const value of data) {
      const parsedData = JSON.parse(value);
      if (parsedData?.data) {
        parsedData.data.forEach((bus: any) => {
          const currCoords = { latitude: bus.latitude, longitude: bus.longitude, bearing: bus.bearing ? bus.bearing : 0 };
  
          newBusLocations.set(bus.route_id, { ...currCoords });
        });
      }
    }
  
    setBusData(Array.from(newBusLocations.entries()).map(([route_id, coords]) => (typeof coords === 'object' ? { route_id, ...coords } : { route_id, coords })));
  
    busLocations.clear();
    newBusLocations.forEach((value, key) => busLocations.set(key, value));
    data.clear();
};