// src/screens/DashboardScreen.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const menuItems = [
    // Main Modules
    { title: 'MEMP Overview', screen: 'MEMPOverview' as keyof RootStackParamList },
    { title: 'Vessel Info', screen: 'VesselInfo' },
    { title: 'Machinery', screen: 'Machinery' },
    { title: 'Ports', screen: 'PortManagement' },
    { title: 'Voyages', screen: 'VoyageManagement' },
    { title: 'Bunkering', screen: 'BunkerManagement' },
    { title: 'Vessel Reports', screen: 'VesselReports' },
    { title: 'Compliances', screen: 'Compliances' },
    { title: 'Additives', screen: 'Additive' },

    // Vessel Dashboard
    { title: 'Vessel Status', screen: 'VesselStatus' },
    { title: 'Vessel Emissions', screen: 'VesselEmissions' },
    { title: 'Machinery Data', screen: 'VesselMachineryData' },

    // Compliance Reports
    { title: 'CII Report', screen: 'CIIReport' },
    { title: 'EU MRV Report', screen: 'EUMRVReport' },
    { title: 'EU ETS Report', screen: 'EUETSReport' },
    { title: 'UK MRV Report', screen: 'UKMRVReport' },
    { title: 'UK ETS Report', screen: 'UKETSReport' },

    // Admin
    { title: 'User Management', screen: 'UserManagement' },
    { title: 'Fleet Management', screen: 'FleetManagement' },
    { title: 'Team', screen: 'Team' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>MEMP Dashboard</Text>
      <Text style={styles.subtitle}>Marine Emissions Management Platform</Text>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
          >
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 20,
    color: '#666',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  menuItem: {
    backgroundColor: '#007bff',
    width: '45%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default DashboardScreen;