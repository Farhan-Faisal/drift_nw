import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';

interface PaymentMethod {
  payment_method_id: string;
  last4: string;
  brand: string;
  created_at: string;
}

interface SavedCardsProps {
  username: string;
  onRefresh?: {
    subscribe?: (handler: () => void) => void;
    unsubscribe?: (handler: () => void) => void;
  };
}

export const SavedCards: React.FC<SavedCardsProps> = ({ username, onRefresh }) => {
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = React.useState<string | null>(null);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [lastTap, setLastTap] = React.useState<{ id: string; time: number } | null>(null);
  const router = useRouter();

  // Add a refresh trigger
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const fetchPaymentMethods = React.useCallback(async () => {
    try {
      const userResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/${username}`);
      const userData = await userResponse.json();
      
      if (!userData.success) {
        console.error('Could not find user');
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/payments/methods/${userData.user_id}`);
      const data = await response.json();
      
      if (data.success) {
        setPaymentMethods(data.payment_methods);
        setDefaultPaymentMethodId(data.default_payment_method_id);
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  }, [username]);

  React.useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods, refreshTrigger]);

  React.useEffect(() => {
    if (onRefresh) {
      const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
      };
      onRefresh.subscribe?.(handleRefresh);
      return () => {
        onRefresh.unsubscribe?.(handleRefresh);
      };
    }
  }, [onRefresh]);

  const handleCardPress = async (method: PaymentMethod) => {
    const now = Date.now();
    
    if (lastTap && lastTap.id === method.payment_method_id && now - lastTap.time < 300) {
      // Double tap detected - navigate to card details
      router.push({
        pathname: '/card-details',
        params: {
          brand: method.brand,
          last4: method.last4
        }
      });
    } else {
      // Single tap - set as default
      if (!isUpdating && method.payment_method_id !== defaultPaymentMethodId) {
        try {
          setIsUpdating(true);
          setDefaultPaymentMethodId(method.payment_method_id);

          const userResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/${username}`);
          const userData = await userResponse.json();
          
          if (!userData.success) {
            console.error('Could not find user');
            return;
          }

          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/payments/set-default`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: userData.user_id,
              payment_method_id: method.payment_method_id,
            }),
          });

          const data = await response.json();
          if (data.success) {
            if (onRefresh) {
              onRefresh();
            }
          } else {
            await fetchPaymentMethods();
          }
        } catch (error) {
          console.error('Error setting default card:', error);
          await fetchPaymentMethods();
        } finally {
          setIsUpdating(false);
        }
      }
    }
    
    setLastTap({ id: method.payment_method_id, time: now });
  };

  if (paymentMethods.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Methods</Text>
      
      {paymentMethods.map((method) => (
        <TouchableOpacity
          key={method.payment_method_id}
          style={[
            styles.cardItem,
            method.payment_method_id === defaultPaymentMethodId && styles.selectedCard
          ]}
          onPress={() => handleCardPress(method)}
          disabled={isUpdating}
        >
          <View style={styles.cardInfo}>
            <Text style={[
              styles.cardBrand,
              method.payment_method_id === defaultPaymentMethodId && styles.selectedText
            ]}>
              {method.brand}
            </Text>
            <Text style={[
              styles.cardNumber,
              method.payment_method_id === defaultPaymentMethodId && styles.selectedText
            ]}>
              •••• {method.last4}
            </Text>
          </View>
          {method.payment_method_id === defaultPaymentMethodId && (
            <IconSymbol name="checkmark.circle.fill" size={20} color="#007AFF" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#f8f9fa',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    textTransform: 'capitalize',
    color: '#333',
  },
  cardNumber: {
    fontSize: 16,
    color: '#666',
  },
  selectedText: {
    color: '#007AFF',
    fontWeight: '600',
  },
}); 