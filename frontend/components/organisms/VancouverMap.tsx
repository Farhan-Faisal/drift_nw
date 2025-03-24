import React, { useState, useEffect, useRef } from 'react';
import { View, Easing, Animated, Text } from 'react-native';
import MapView, { Marker, AnimatedRegion, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { MapStyles } from '../styles/VancouverMap.styles';

import { 
  get_shape_id_from_route_id,
  get_color_from_route_id, 
  get_trip_head_sign,
  calculate_bearing,
  fetchNearestRoutes,
  find_closest_route_points,
  setup_web_socket, 
  flushBus
} from '@/components/utils/route_utils';

import { renderPolyline } from '@/components/molecules/RoutePolyline';
import BusCallout from '@/components/atoms/BusCallout';
import BusIcon from '@/components/atoms/BusIcon';
import SimpleBusIcon from '@/components/atoms/SimpleBusIcon';

const VancouverMap: React.FC<{
  location: any;
  setLocation: any;
  animatedBusData: any;
  setAnimatedBusData: any
}> = ({ location, setLocation, animatedBusData, setAnimatedBusData }) => {

  const [routes, setRoutes] = useState<Record<number, Array<{ shape_id: any; latitude: number; longitude: number; color: string }>> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const markerRefs = useRef<Map<number, Marker | null>>(new Map());

  // LOAD CLOSEST ROUTES AND GET THE USER"S CURRENT LOCATION
  useEffect(() => {
    const API_URL = "http://localhost:8000/api/v1/trips/nearest_routes?latitude=49.2827&longitude=-123.1207";
    
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      const hardcodedLocation = { latitude: 49.26077, longitude: -123.24899};

      await fetchNearestRoutes(hardcodedLocation, API_URL, setRoutes, setErrorMsg)
      setLocation(hardcodedLocation);
      // setLocation(currentLocation);
      console.log(currentLocation);
    })();
  }, []);


  // Stream bus data – update only animated markers
  useEffect(() => {
    let ws = new WebSocket('ws://localhost:8000/api/v1/trips/bus_positions');

    if (!ws || ws.readyState === WebSocket.CLOSED) {
      ws = new WebSocket('ws://localhost:8000/api/v1/trips/bus_positions');
    }

    const busLocations = new Map<number, { latitude: number; longitude: number }>();
    const data = new Set<string>();

    ws.onopen = () => {
      console.log("WebSocket connected");
      const initialLocation = { latitude: 49.26077, longitude: -123.24899 };
      ws.send(JSON.stringify(initialLocation));
    };

    const timer = setInterval(() => {
      flushBus(data, busLocations, (newBusData: any) => {

        setAnimatedBusData((prevAnimatedData: any) => {
          const updatedData = new Map(prevAnimatedData);

          newBusData.forEach((bus: any) => {
            const { route_id, latitude, longitude, bearing, vehicle_label } = bus;

            if (!updatedData.has(bus.route_id)) {
              updatedData.set(
                route_id,
                new AnimatedRegion({
                  latitude: latitude,
                  longitude: longitude,
                })
                  
              );
            } else {
              let region = updatedData.get(route_id)!;
             
              region.stopAnimation(() => {
                region.timing({
                  latitude: bus.latitude,
                  longitude: bus.longitude,
                  duration: 2000,
                  useNativeDriver: false,
                  easing: Easing.bezier(0.42, 0, 0.58, 1),
                }).start();
              });
              updatedData.set(bus.route_id, region);
            }
          });
          return updatedData;
        });

      });
    }, 3000);

    setup_web_socket(ws, data);

    return () => {
      clearInterval(timer);
      ws.close();
    };
  }, []);

  
  useEffect(() => {
    let recording: { latitude: number; longitude: number; timestamp: string }[] = [];
  
    const collectInterval = setInterval(async () => {
      try {
        const { coords } = await Location.getCurrentPositionAsync({});
        const timestamp = new Date().toLocaleTimeString();
  
        recording.push({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp,
        });
  
        console.log(`🟢 [${timestamp}] Collected: ${coords.latitude}, ${coords.longitude}`);
      } catch (err) {
        console.warn("⚠️ Failed to get location:", err);
      }
    }, 5000); // Every 5 seconds
  
    const printInterval = setInterval(() => {
      if (recording.length === 0) return;
  
      console.log("📍 Location log for the last 30 seconds:");
      recording.forEach((loc, i) => {
        console.log(`  ${loc.timestamp} (${i * 5}s): Lat: ${loc.latitude}, Lon: ${loc.longitude}`);
      });
  
      recording = []; // Clear after printing
    }, 30000); // Every 30 seconds
  
    return () => {
      clearInterval(collectInterval);
      clearInterval(printInterval);
    };
  }, []);
  

  return (
    <View style={MapStyles.container}>
      <MapView
        style={MapStyles.map}
        initialRegion={{
          latitude: 49.26077,
          longitude: -123.24899,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        }}
        showsMyLocationButton
        showsUserLocation
      >
        {location && (
          <Marker
            coordinate={{
              latitude: 49.26077,
              longitude: -123.24899,
            }}
            title="You are here"
          />
        )}

      {routes && 
        Object.keys(routes).map((shapeIdStr) => 
          renderPolyline(shapeIdStr, routes)
        )
      }   

      {routes &&
        Array.from(animatedBusData.entries()).map(([route_id, animatedPosition]) => {
  
          let shapeID = get_shape_id_from_route_id(route_id);
          const bus_coordinates = animatedPosition as unknown as Animated.WithAnimatedObject<{ latitude: number; longitude: number }>
          const trip_headsign = get_trip_head_sign(route_id);
          const shapePoints = routes?.[shapeID];

          let bearing = 0;
          const busCoordinates = animatedPosition as unknown as {
            latitude: number;
            longitude: number;
          };
      
          const { latitude, longitude } = busCoordinates;
          if (shapePoints && shapePoints.length >= 2) {
            const [i1, i2] = find_closest_route_points(shapePoints, {latitude, longitude});
            bearing = calculate_bearing(shapePoints[i1], shapePoints[i2]);
          }         

          return (
            <Marker.Animated
              key={`bus-${route_id}`}
              ref={(marker) => markerRefs.current.set(route_id, marker)}
              coordinate={bus_coordinates}
            >
              {/* Apply the extracted bearing */}
              {/* <BusIcon fillColor={get_color_from_route_id(route_id)} rotation={bearing} /> */}
              <SimpleBusIcon fillColor={get_color_from_route_id(route_id)} rotation={bearing} />
              
              {/* <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: get_color_from_route_id(route_id), borderWidth: 2, borderColor: 'white' }} /> */}
              <BusCallout 
                route_id={route_id}
                shape_id={String(shapeID)}
                trip_headsign={trip_headsign}
              />

            </Marker.Animated>
          );
        })
      }
      </MapView>
    </View>
  );
};

export default VancouverMap;


