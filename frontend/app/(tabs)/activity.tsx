import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';
import { RecentCharges } from '@/components/molecules/RecentCharges';
import { useParams } from '@/context/ParamsContext';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ActivityScreen() {
  const { username, user_id } = useParams();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setKey(prevKey => prevKey + 1);
    setRefreshing(false);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#333"
        />
      }
    >
      <View style={styles.buttonRow}>
        <View style={styles.buttonPlaceholder} />
        <Button
          style={styles.walletButton}
          textStyle={styles.buttonText}
          onPress={() => router.push({
            pathname: '/wallet',
            params: { username, user_id }
          })}
        >
          <View style={styles.buttonContent}>
            <IconSymbol name="wallet.bifold.fill" size={24} color="#333" />
            <Text style={styles.buttonText}>Wallet</Text>
          </View>
        </Button>
        <View style={styles.buttonPlaceholder} />
      </View>
      <RecentCharges key={`recent-charges-${key}`} username={username as string} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  buttonPlaceholder: {
    flex: 1,
  },
  walletButton: {
    marginTop: '5%',
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  buttonContent: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  }
});