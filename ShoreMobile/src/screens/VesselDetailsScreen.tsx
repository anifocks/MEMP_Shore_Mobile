// src/screens/VesselDetailsScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type VesselDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VesselDetails'>;
type VesselDetailsScreenRouteProp = RouteProp<RootStackParamList, 'VesselDetails'>;

interface Props {
  navigation: VesselDetailsScreenNavigationProp;
  route: VesselDetailsScreenRouteProp;
}

const VesselDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { shipId } = route.params;
  const [loading, setLoading] = useState(true);
  const [vesselData, setVesselData] = useState<any>(null);

  useEffect(() => {
    fetchVesselDetails();
  }, [shipId]);

  const fetchVesselDetails = async () => {
    try {
      // This would fetch detailed vessel data from the API
      // For now, using mock data
      setVesselData({
        ShipID: shipId,
        ShipName: 'MV Ocean Pride',
        IMO_Number: '1234567',
        Flag: 'Panama',
        ShipType: 'Container Ship',
        GrossTonnage: 50000,
        NetTonnage: 25000,
        Deadweight: 65000,
        LengthOverall: 275.0,
        Breadth: 40.0,
        Draft: 14.5,
        YearBuilt: 2018,
        Builder: 'Hyundai Heavy Industries',
        ClassificationSociety: 'Lloyd\'s Register',
        MainEngineType: 'MAN B&W 8S50ME-C8.2',
        MainEnginePower: 45000,
        AuxiliaryEngines: 4,
        Speed: 22.5,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load vessel details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Vessel Details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{vesselData?.ShipName}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>IMO Number:</Text>
          <Text style={styles.value}>{vesselData?.IMO_Number}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Flag:</Text>
          <Text style={styles.value}>{vesselData?.Flag}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Ship Type:</Text>
          <Text style={styles.value}>{vesselData?.ShipType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Year Built:</Text>
          <Text style={styles.value}>{vesselData?.YearBuilt}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dimensions</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Gross Tonnage:</Text>
          <Text style={styles.value}>{vesselData?.GrossTonnage?.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Net Tonnage:</Text>
          <Text style={styles.value}>{vesselData?.NetTonnage?.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Deadweight:</Text>
          <Text style={styles.value}>{vesselData?.Deadweight?.toLocaleString()} MT</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Length Overall:</Text>
          <Text style={styles.value}>{vesselData?.LengthOverall} m</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Breadth:</Text>
          <Text style={styles.value}>{vesselData?.Breadth} m</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Draft:</Text>
          <Text style={styles.value}>{vesselData?.Draft} m</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technical Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Main Engine:</Text>
          <Text style={styles.value}>{vesselData?.MainEngineType}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Engine Power:</Text>
          <Text style={styles.value}>{vesselData?.MainEnginePower} kW</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Auxiliary Engines:</Text>
          <Text style={styles.value}>{vesselData?.AuxiliaryEngines}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Service Speed:</Text>
          <Text style={styles.value}>{vesselData?.Speed} knots</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Builder:</Text>
          <Text style={styles.value}>{vesselData?.Builder}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Classification:</Text>
          <Text style={styles.value}>{vesselData?.ClassificationSociety}</Text>
        </View>
      </View>
    </ScrollView>
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
  section: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
});

export default VesselDetailsScreen;