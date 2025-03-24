import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BackButton } from '@/components/ui/BackButton';

export default function CardDetailsScreen() {
  const { brand, last4 } = useLocalSearchParams();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.buttonContainer}>
        <BackButton onPress={() => router.back()} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>Card Details</Text>
        
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Card Type</Text>
            <Text style={styles.value}>{brand}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.label}>Card Number</Text>
            <Text style={styles.value}>•••• •••• •••• {last4}</Text>
          </View>
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
    marginBottom: 24,
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
  },
  label: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize',
  }
}); 