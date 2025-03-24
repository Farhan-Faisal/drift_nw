import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useRouter } from 'expo-router';

interface Transaction {
  bus_route: string;
  timestamp: string;
  charge_amt: number;
  payment_method?: {
    brand: string;
    last4: string;
  };
}

interface RecentChargesProps {
  username: string;
}

export const RecentCharges: React.FC<RecentChargesProps> = ({ username }) => {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const router = useRouter();

  React.useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // First get user_id
        console.log('Fetching user data from:', `${process.env.EXPO_PUBLIC_API_URL}/users/${username}`);
        const userResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/${username}`);
        const userData = await userResponse.json();
        
        console.log('User data:', userData);
        
        if (!userData.success) {
          console.error('Could not find user');
          return;
        }

        // Then get transactions
        console.log('Fetching transactions from:', `${process.env.EXPO_PUBLIC_API_URL}/transactions/${userData.user_id}`);
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/transactions/${userData.user_id}`);
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        try {
          const data = JSON.parse(responseText);
          if (data.success) {
            setTransactions(data.transactions);
          }
        } catch (parseError) {
          console.error('JSON Parse error:', parseError);
          console.error('Response text:', responseText);
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    };

    fetchTransactions();
  }, [username]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })}, ${date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Rides</Text>
      {transactions.map((transaction, index) => (
        <TouchableOpacity
          key={index}
          style={styles.transactionItem}
          onPress={() => {
            router.push({
              pathname: '/ride-details',
              params: {
                bus_route: transaction.bus_route,
                timestamp: transaction.timestamp,
                charge_amt: transaction.charge_amt,
                payment_method: transaction.payment_method ? 
                  JSON.stringify(transaction.payment_method) : null
              }
            });
          }}
        >
          <View style={styles.leftContent}>
            <Text style={styles.routeText}>Route {transaction.bus_route}</Text>
            <View style={styles.paymentInfo}>
              {transaction.payment_method && (
                <Text style={styles.cardText}>
                  {transaction.payment_method.brand} •••• {transaction.payment_method.last4}
                </Text>
              )}
              <Text style={styles.timestampText}>{formatDate(transaction.timestamp)}</Text>
            </View>
          </View>
          <Text style={styles.amountText}>${transaction.charge_amt.toFixed(2)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 20,
    paddingTop: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leftContent: {
    flex: 1,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    textTransform: 'capitalize',
  },
  timestampText: {
    fontSize: 14,
    color: '#666',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
}); 