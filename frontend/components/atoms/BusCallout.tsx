import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Callout } from 'react-native-maps';
import { get_color_from_route_id } from '@/components/utils/route_utils';

interface BusCalloutProps {
  route_id: string;
  trip_headsign?: string;
  shape_id?: string;
}

const BusCallout: React.FC<BusCalloutProps> = ({ 
    route_id, 
    trip_headsign, 
    shape_id
 }) => {
  const color = get_color_from_route_id(route_id);

  return (
    <Callout tooltip>
      <View style={styles.container}>
        <Text style={styles.title}>🚌 {trip_headsign || 'N/A'}</Text>
        <Text style={styles.text}>🛣️ Route: {route_id || 'N/A'}</Text>
        <Text style={styles.text}>🆔 Shape ID: {shape_id  || 'N/A'}</Text>
        <Text style={styles.text}>
          🎨 Color: <Text style={[styles.colorText, { color }]}>{color}</Text>
        </Text>
      </View>
    </Callout>
  );
};

export default BusCallout;

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    gap: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
  },
  colorText: {
    fontWeight: 'bold',
  },
});
