// src/screens/MEMPOverviewScreen.tsx

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
import { RootStackParamList } from '../navigation/AppNavigator';

type MEMPOverviewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MEMPOverview'>;

interface Props {
  navigation: MEMPOverviewScreenNavigationProp;
}

const MEMPOverviewScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      // This would fetch overview statistics from the API
      // For now, using mock data
      setOverviewData({
        totalVessels: 25,
        activeVoyages: 12,
        totalReports: 156,
        complianceRate: 94.2,
        recentActivity: [
          { id: 1, type: 'Report Submitted', vessel: 'MV Ocean Pride', time: '2 hours ago' },
          { id: 2, type: 'Voyage Completed', vessel: 'MV Sea Explorer', time: '5 hours ago' },
          { id: 3, type: 'Compliance Alert', vessel: 'MV Blue Wave', time: '1 day ago' },
        ]
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load overview data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Overview...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>MEMP Overview</Text>

      {/* Statistics Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overviewData?.totalVessels || 0}</Text>
          <Text style={styles.statLabel}>Total Vessels</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overviewData?.activeVoyages || 0}</Text>
          <Text style={styles.statLabel}>Active Voyages</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overviewData?.totalReports || 0}</Text>
          <Text style={styles.statLabel}>Total Reports</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{overviewData?.complianceRate || 0}%</Text>
          <Text style={styles.statLabel}>Compliance Rate</Text>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {overviewData?.recentActivity?.map((activity: any) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityContent}>
              <Text style={styles.activityType}>{activity.type}</Text>
              <Text style={styles.activityVessel}>{activity.vessel}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
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
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '45%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
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
  activityItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activityVessel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});

export default MEMPOverviewScreen;