// src/screens/VesselInfoScreen.tsx

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
import { fetchVessels } from '../services/api';

type VesselInfoScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VesselInfo'>;

interface Props {
  navigation: VesselInfoScreenNavigationProp;
}

interface Vessel {
  ShipID: number;
  ShipName: string;
  IMO_Number: string;
  Flag: string;
  ShipType: string;
  GrossTonnage: number;
}

const VesselInfoScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [vessels, setVessels] = useState<Vessel[]>([]);

  useEffect(() => {
    fetchVesselData();
  }, []);

  const fetchVesselData = async () => {
    try {
      const data = await fetchVessels();
      setVessels(data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load vessel data');
    } finally {
      setLoading(false);
    }
  };

  const renderVesselItem = ({ item }: { item: Vessel }) => (
    <TouchableOpacity
      style={styles.vesselCard}
      onPress={() => navigation.navigate('VesselDetails', { shipId: item.ShipID.toString() })}
    >
      <View style={styles.vesselHeader}>
        <Text style={styles.vesselName}>{item.ShipName}</Text>
        <Text style={styles.imoNumber}>IMO: {item.IMO_Number}</Text>
      </View>
      <View style={styles.vesselDetails}>
        <Text style={styles.detailText}>Flag: {item.Flag}</Text>
        <Text style={styles.detailText}>Type: {item.ShipType}</Text>
        <Text style={styles.detailText}>GT: {item.GrossTonnage?.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Vessels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vessel Information</Text>
      <Text style={styles.subtitle}>Total Vessels: {vessels.length}</Text>

      <FlatList
        data={vessels}
        renderItem={renderVesselItem}
        keyExtractor={(item) => item.ShipID.toString()}
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
  vesselCard: {
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
  vesselHeader: {
    marginBottom: 10,
  },
  vesselName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  imoNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  vesselDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 10,
  },
});

export default VesselInfoScreen;