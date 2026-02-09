// src/screens/VoyageManagementScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type VoyageManagementScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VoyageManagement'>;

interface Props {
  navigation: VoyageManagementScreenNavigationProp;
}

interface Voyage {
  VoyageID: number;
  VoyageNumber: string;
  ShipName: string;
  DeparturePort: string;
  ArrivalPort: string;
  DepartureDate: string;
  ArrivalDate: string;
  Status: string;
}

const VoyageManagementScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [voyages, setVoyages] = useState<Voyage[]>([]);

  useEffect(() => {
    fetchVoyageData();
  }, []);

  const fetchVoyageData = async () => {
    try {
      // Mock voyage data
      setVoyages([
        {
          VoyageID: 1,
          VoyageNumber: 'VP001-2024',
          ShipName: 'MV Ocean Pride',
          DeparturePort: 'Singapore',
          ArrivalPort: 'Rotterdam',
          DepartureDate: '2024-02-01',
          ArrivalDate: '2024-02-15',
          Status: 'Completed'
        },
        {
          VoyageID: 2,
          VoyageNumber: 'VP002-2024',
          ShipName: 'MV Ocean Pride',
          DeparturePort: 'Rotterdam',
          ArrivalPort: 'New York',
          DepartureDate: '2024-02-20',
          ArrivalDate: null,
          Status: 'In Progress'
        },
        {
          VoyageID: 3,
          VoyageNumber: 'SE001-2024',
          ShipName: 'MV Sea Explorer',
          DeparturePort: 'Shanghai',
          ArrivalPort: 'Los Angeles',
          DepartureDate: '2024-02-10',
          ArrivalDate: '2024-02-25',
          Status: 'Completed'
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load voyage data');
    } finally {
      setLoading(false);
    }
  };

  const renderVoyageItem = ({ item }: { item: Voyage }) => (
    <TouchableOpacity
      style={styles.voyageCard}
      onPress={() => navigation.navigate('VoyageDetails', { voyageId: item.VoyageID.toString() })}
    >
      <View style={styles.voyageHeader}>
        <Text style={styles.voyageNumber}>{item.VoyageNumber}</Text>
        <Text style={[styles.status, item.Status === 'Completed' ? styles.statusCompleted : styles.statusInProgress]}>
          {item.Status}
        </Text>
      </View>
      <View style={styles.voyageDetails}>
        <Text style={styles.detailText}>Vessel: {item.ShipName}</Text>
        <Text style={styles.detailText}>Route: {item.DeparturePort} → {item.ArrivalPort}</Text>
        <Text style={styles.detailText}>Departure: {item.DepartureDate}</Text>
        {item.ArrivalDate && <Text style={styles.detailText}>Arrival: {item.ArrivalDate}</Text>}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Voyages...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voyage Management</Text>
      <Text style={styles.subtitle}>Total Voyages: {voyages.length}</Text>

      <FlatList
        data={voyages}
        renderItem={renderVoyageItem}
        keyExtractor={(item) => item.VoyageID.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    margin: 20,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  voyageCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  voyageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  voyageNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  statusCompleted: {
    backgroundColor: '#28a745',
    color: '#fff',
  },
  statusInProgress: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  voyageDetails: {
    marginTop: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default VoyageManagementScreen;