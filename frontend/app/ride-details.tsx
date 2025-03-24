import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackButton } from '@/components/ui/BackButton';

export default function RideDetailsScreen() {
  const { bus_route, timestamp, charge_amt, payment_method } = useLocalSearchParams();
  const router = useRouter();
  
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.buttonContainer}>
        <BackButton onPress={() => router.back()} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Ride Details</Text>
        
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Route</Text>
            <Text style={styles.value}>{bus_route}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{formatDate(timestamp as string)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Cost</Text>
            <Text style={styles.value}>${Number(charge_amt).toFixed(2)}</Text>
          </View>

          {payment_method && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Payment Method</Text>
              <Text style={styles.value}>
                {JSON.parse(payment_method as string).brand} •••• {JSON.parse(payment_method as string).last4}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 60,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
}); 