import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { SavedCards } from '@/components/molecules/SavedCards';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { BackButton } from '@/components/ui/BackButton';

export default function WalletScreen() {
  const router = useRouter();
  const { username, user_id } = useLocalSearchParams();
  const { createToken, createPaymentMethod } = useStripe();
  const [cardComplete, setCardComplete] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [key, setKey] = useState(0);
  const [refreshSubscribers] = useState(() => new Set<() => void>());
  const [showCardInput, setShowCardInput] = useState(false);

  // Reset showCardInput when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowCardInput(false);
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Notify all subscribers
    refreshSubscribers.forEach(subscriber => subscriber());
    setRefreshing(false);
  }, [refreshSubscribers]);

  // Add subscribe/unsubscribe methods to onRefresh
  onRefresh.subscribe = (callback: () => void) => {
    refreshSubscribers.add(callback);
  };

  onRefresh.unsubscribe = (callback: () => void) => {
    refreshSubscribers.delete(callback);
  };

  const handlePayPress = async () => {
    try {
      if (!username) {
        Alert.alert('Error', 'Username not found');
        return;
      }

      const userResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/${username}`);
      const userData = await userResponse.json();
      
      if (!userData.success) {
        Alert.alert('Error', 'Could not find user');
        return;
      }

      const { paymentMethod, error: paymentMethodError } = await createPaymentMethod({
        paymentMethodType: 'Card'
      });
      
      if (paymentMethodError) {
        Alert.alert('Error', paymentMethodError.message);
        return;
      }

      if (!paymentMethod) {
        Alert.alert('Error', 'Failed to read card details');
        return;
      }

      const existingCardsResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/payments/methods/${userData.user_id}`);
      const existingCardsData = await existingCardsResponse.json();
      
      if (existingCardsData.success && existingCardsData.payment_methods) {
        const cardDetails = paymentMethod.Card;
        if (!cardDetails?.last4 || !cardDetails?.brand) {
          Alert.alert('Error', 'Could not read card details');
          return;
        }

        const isDuplicate = existingCardsData.payment_methods.some(
          (card: { last4: string; brand: string }) => 
            card.last4 === cardDetails.last4 && 
            card.brand.toLowerCase() === cardDetails.brand.toLowerCase()
        );

        if (isDuplicate) {
          Alert.alert('Error', 'This card has already been saved to your account');
          return;
        }
      }

      const { token, error } = await createToken({ type: 'Card' });
      
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      if (!token) {
        Alert.alert('Error', 'Something went wrong');
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/payments/create-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token.id,
          user_id: userData.user_id,
          card_details: {
            last4: paymentMethod.Card?.last4,
            brand: paymentMethod.Card?.brand
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', errorText);
        Alert.alert('Error', 'Failed to save card');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Card saved successfully');
        onRefresh();
      } else {
        Alert.alert('Error', data.error || 'Something went wrong');
      }
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert('Error', 'Failed to save card');
    }
  };

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
      <View style={styles.buttonContainer}>
        <BackButton onPress={() => router.back()} />
      </View>
      
      
      {!showCardInput ? (
        <View style={styles.container}>
          <Button
            onPress={() => setShowCardInput(true)}
            style={styles.button}
          >
            Add Payment Method
          </Button>
        </View>
      ) : (
        <View style={styles.container}>
          <View style={styles.card}>
            <CardField
              postalCodeEnabled={true}
              placeholders={{
                number: '4242 4242 4242 4242',
              }}
              cardStyle={styles.cardField}
              style={styles.cardContainer}
              onCardChange={(cardDetails) => {
                setCardComplete(cardDetails.complete);
              }}
            />
          </View>
          <Button
            onPress={handlePayPress}
            disabled={!cardComplete}
            style={styles.button}
          >
            Save Card
          </Button>
        </View>
      )}

      <SavedCards username={username as string} onRefresh={onRefresh} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#efefefef',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    width: '100%', // Ensures the card wrapper spans full width
  },
  cardField: {
    backgroundColor: '#ffffff',
  },
  cardContainer: {
    width: '100%', // Matches the ride history card width
    height: 50,
    marginVertical: 10,
  },
  button: {
    width: '100%', // Matches the ride history card width
    marginBottom: 20,
  },
  buttonContainer: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
});