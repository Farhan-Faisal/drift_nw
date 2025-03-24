import React from 'react';
import { View, Text } from 'react-native';
import { 
    get_trip_head_sign, 
    get_color_from_route_id 
} from '@/components/utils/route_utils';
import { HomeStyle } from '@/components/styles/HomePage.styles';


interface Bus {
  route_id: number;
  latitude: number;
  longitude: number;
}

interface ClosestBusesListProps {
  buses: Bus[];
}

const ClosestBusesList: React.FC<ClosestBusesListProps> = ({ buses }) => {
  return (
    <View style={HomeStyle.closestBusesContainer}>
      <Text style={HomeStyle.closestBusesTitle}>Closest Bus Routes</Text>

      {buses.length > 0 ? (
        <View style={HomeStyle.cardsContainer}>
          {buses.map((bus) => {
            const headsign = get_trip_head_sign(bus.route_id);
            const shortName = headsign.split(' ')[0] || 'Unknown';
            const color = get_color_from_route_id(String(bus.route_id));
            // console.log('Color:', color);

            return (
              <View
                key={bus.route_id}
                style={[HomeStyle.card, { borderColor: color, borderWidth: 3 }]}
              >
                <Text style={HomeStyle.cardTitle}>Bus: {shortName}</Text>
                <Text style={HomeStyle.cardDistance}>
                  ({headsign || 'Unknown'})
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={HomeStyle.noBusesText}>
          No closest buses available at the moment!
        </Text>
      )}
    </View>
  );
};

export default ClosestBusesList;
