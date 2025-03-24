import React from 'react';
import { Polyline } from 'react-native-maps';

import {  get_color_from_route_id, } from '@/components/utils/route_utils';

export const renderPolyline = (shapeIdStr: string, routes: any) => {
    const shapeId = parseInt(shapeIdStr, 10);
    const routePoints = routes[shapeId];
  
    if (!routePoints || routePoints.length === 0) return null; // Skip if empty
  
    // Extract route details from the first point
    const routeId = routePoints[0].route_id;

    return (
        <Polyline
            key={shapeId} // Use shape_id as key
            coordinates={routePoints.map(({ latitude, longitude }) => ({ latitude, longitude }))} // Extract coordinates
            strokeColor={get_color_from_route_id(routeId)} // Use color from first point
            strokeWidth={6}
        />
    );
  };