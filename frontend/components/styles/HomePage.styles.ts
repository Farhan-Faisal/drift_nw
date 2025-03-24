import { Image, StyleSheet, Platform, StatusBar, Dimensions } from 'react-native';

const { height } = Dimensions.get('window');

export const HomeStyle = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
  },
  mapContainer: {
    height: height * 0.5,
  },
  currentTripContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    marginBottom: 16,
  },
  currentTripTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  currentTripText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  closestBusesContainer: {
    backgroundColor: '#eef6f8',
    padding: 16,
  },
  closestBusesTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2980b9',
    marginBottom: 16,
  },
  cardsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    width: '100%',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 8,
  },
  cardDistance: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  noBusesText: {
    fontSize: 16,
    color: '#95a5a6',
    textAlign: 'center',
  },
});
