import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { View, Easing, Animated, Text } from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion, Callout } from 'react-native-maps';

import { MapStyles } from '../styles/VancouverMap.styles';
import BusIcon from '@/components/atoms/BusIcon';
import { loadRouteData, calculateDistance, flushBus } from '@/components/utils/route_utils';

const VancouverMap: React.FC<{
  location: any;
  setLocation: any;
  busData: any;
  setBusData: any;
  closestRoutes: any;
  setClosestRoutes: any;
}> = ({ location, setLocation, busData, setBusData, closestRoutes, setClosestRoutes }) => {

  const [routes, setRoutes] = useState<Record<number, Array<{ latitude: number; longitude: number; color: string }>> | null>(null);
  const [animatedBusData, setAnimatedBusData] = useState<Map<number, AnimatedRegion>>(new Map());

  const shapeColorMap = new Map();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const markerRefs = useRef<Map<number, Marker | null>>(new Map());

  // Calculate closest routes (logic remains unchanged)
  useEffect(() => {
    if (!location || !routes) return;

    const sortedRoutes = Object.entries(routes)
      .map(([routeId, routeCoords]) => {
        const minDistance = Math.min(
          ...routeCoords.map((point) =>
            calculateDistance(location.latitude, location.longitude, point.latitude, point.longitude)
          )
        );
        return { routeId: parseInt(routeId, 10), distance: minDistance, color: routeCoords[0].color };
      })
      .sort((a, b) => a.distance - b.distance);

    const uniqueRouteIds = new Set<number>();
    const closestUniqueRoutes = sortedRoutes
      .filter((route) => {
        if (uniqueRouteIds.has(route.routeId)) return false;
        uniqueRouteIds.add(route.routeId);
        return true;
      })
      .slice(0, 4);

    setClosestRoutes(closestUniqueRoutes);
  }, [location, routes]);

  // Load route data and get user's current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      const hardcodedLocation = {
        latitude: 49.26077,
        longitude: -123.24899
      };

      setLocation(hardcodedLocation);
      console.log(currentLocation);
      loadRouteData(shapeColorMap, setRoutes);
    })();
  }, []);

  // Stream bus data – update only animated markers
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws/stream/buses?speed_multiplier=10');
    const busLocations = new Map<number, { latitude: number; longitude: number }>();
    const data = new Set<string>();

    const timer = setInterval(() => {
      flushBus(data, busLocations, (newBusData: any) => {
        // Remove setBusData to avoid triggering an extra (non-animated) marker elsewhere.
        // setBusData(newBusData);

        setAnimatedBusData((prevAnimatedData) => {
          const updatedData = new Map(prevAnimatedData);

          newBusData.forEach((bus: any) => {
            // Use bus.route_id as the key (assumes one bus per route).
            if (!updatedData.has(bus.route_id)) {
              updatedData.set(
                bus.route_id,
                new AnimatedRegion({
                  latitude: bus.latitude,
                  longitude: bus.longitude,
                })
              );
            } else {
              const region = updatedData.get(bus.route_id)!;
             
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

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      data.add(event.data);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      clearInterval(timer);
      ws.close();
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
          Object.keys(routes).map((routeId) => {
            const isClosest = closestRoutes.some((r: any) => r.routeId === parseInt(routeId, 10));
            return (
              <Polyline
                key={routeId}
                coordinates={routes[parseInt(routeId, 10)]}
                strokeColor={isClosest ? routes[parseInt(routeId, 10)][0].color : 'gray'}
                strokeWidth={isClosest ? 6 : 2}
              />
            );
          })}

      {routes &&
        Array.from(animatedBusData.entries()).map(([route_id, animatedPosition]) => (
          <Marker.Animated
            key={`bus-${route_id}`}
            ref={(marker) => markerRefs.current.set(route_id, marker)}
            coordinate={
              animatedPosition as unknown as Animated.WithAnimatedObject<{ latitude: number; longitude: number }>
            }
          >
            <BusIcon fillColor={'black'} rotation={0} />
            <Callout>
              <View style={{ padding: 5 }}>
                <Text>Route ID: {route_id}</Text>
              </View>
            </Callout>
          </Marker.Animated>
        ))}
      </MapView>
    </View>
  );
};

export default VancouverMap;
