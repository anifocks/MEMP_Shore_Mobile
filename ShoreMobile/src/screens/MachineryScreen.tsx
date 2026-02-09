// src/screens/MachineryScreen.tsx

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

type MachineryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Machinery'>;

interface Props {
  navigation: MachineryScreenNavigationProp;
}

interface Machinery {
  MachineryID: number;
  MachineryName: string;
  MachineryType: string;
  ShipName: string;
  PowerOutput: number;
  Status: string;
}

const MachineryScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [machinery, setMachinery] = useState<Machinery[]>([]);

  useEffect(() => {
    fetchMachineryData();
  }, []);

  const fetchMachineryData = async () => {
    try {
      // Mock data for machinery
      setMachinery([
        {
          MachineryID: 1,
          MachineryName: 'Main Engine - Port',
          MachineryType: 'Main Engine',
          ShipName: 'MV Ocean Pride',
          PowerOutput: 22500,
          Status: 'Operational'
        },
        {
          MachineryID: 2,
          MachineryName: 'Main Engine - Starboard',
          MachineryType: 'Main Engine',
          ShipName: 'MV Ocean Pride',
          PowerOutput: 22500,
          Status: 'Operational'
        },
        {
          MachineryID: 3,
          MachineryName: 'Auxiliary Engine 1',
          MachineryType: 'Auxiliary Engine',
          ShipName: 'MV Ocean Pride',
          PowerOutput: 1200,
          Status: 'Operational'
        },
        {
          MachineryID: 4,
          MachineryName: 'Bow Thruster',
          MachineryType: 'Thruster',
          ShipName: 'MV Ocean Pride',
          PowerOutput: 800,
          Status: 'Maintenance'
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load machinery data');
    } finally {
      setLoading(false);
    }
  };

  const renderMachineryItem = ({ item }: { item: Machinery }) => (
    <TouchableOpacity
      style={styles.machineryCard}
      onPress={() => navigation.navigate('MachineryDetails', { id: item.MachineryID.toString() })}
    >
      <View style={styles.machineryHeader}>
        <Text style={styles.machineryName}>{item.MachineryName}</Text>
        <Text style={[styles.status, item.Status === 'Operational' ? styles.statusOperational : styles.statusMaintenance]}>
          {item.Status}
        </Text>
      </View>
      <View style={styles.machineryDetails}>
        <Text style={styles.detailText}>Type: {item.MachineryType}</Text>
        <Text style={styles.detailText}>Vessel: {item.ShipName}</Text>
        <Text style={styles.detailText}>Power: {item.PowerOutput} kW</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Machinery...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Machinery</Text>
      <Text style={styles.subtitle}>Total Items: {machinery.length}</Text>

      <FlatList
        data={machinery}
        renderItem={renderMachineryItem}
        keyExtractor={(item) => item.MachineryID.toString()}
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
  machineryCard: {
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
  machineryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  machineryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: 'center',
  },
  statusOperational: {
    backgroundColor: '#28a745',
    color: '#fff',
  },
  statusMaintenance: {
    backgroundColor: '#ffc107',
    color: '#000',
  },
  machineryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 10,
    marginBottom: 5,
  },
});

export default MachineryScreen;