// src/screens/VesselReportsScreen.tsx

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

type VesselReportsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VesselReports'>;

interface Props {
  navigation: VesselReportsScreenNavigationProp;
}

interface Report {
  ReportID: number;
  ReportType: string;
  ShipName: string;
  ReportDate: string;
  Status: string;
  SubmittedBy: string;
}

const VesselReportsScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      // Mock reports data
      setReports([
        {
          ReportID: 1,
          ReportType: 'Daily Report',
          ShipName: 'MV Ocean Pride',
          ReportDate: '2024-02-09',
          Status: 'Submitted',
          SubmittedBy: 'Captain Smith'
        },
        {
          ReportID: 2,
          ReportType: 'Fuel Consumption',
          ShipName: 'MV Ocean Pride',
          ReportDate: '2024-02-08',
          Status: 'Approved',
          SubmittedBy: 'Chief Engineer'
        },
        {
          ReportID: 3,
          ReportType: 'Cargo Operations',
          ShipName: 'MV Sea Explorer',
          ReportDate: '2024-02-09',
          Status: 'Pending',
          SubmittedBy: 'Cargo Officer'
        },
        {
          ReportID: 4,
          ReportType: 'Weather Report',
          ShipName: 'MV Blue Wave',
          ReportDate: '2024-02-07',
          Status: 'Submitted',
          SubmittedBy: 'Navigator'
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  const renderReportItem = ({ item }: { item: Report }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => navigation.navigate('ReportDetails', { reportId: item.ReportID.toString() })}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportType}>{item.ReportType}</Text>
        <Text style={[styles.status, getStatusStyle(item.Status)]}>
          {item.Status}
        </Text>
      </View>
      <View style={styles.reportDetails}>
        <Text style={styles.detailText}>Vessel: {item.ShipName}</Text>
        <Text style={styles.detailText}>Date: {item.ReportDate}</Text>
        <Text style={styles.detailText}>Submitted by: {item.SubmittedBy}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Submitted':
        return styles.statusSubmitted;
      case 'Approved':
        return styles.statusApproved;
      case 'Pending':
        return styles.statusPending;
      default:
        return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading Reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vessel Reports</Text>
      <Text style={styles.subtitle}>Total Reports: {reports.length}</Text>

      <FlatList
        data={reports}
        renderItem={renderReportItem}
        keyExtractor={(item) => item.ReportID.toString()}
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
  reportCard: {
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
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportType: {
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
  statusSubmitted: {
    backgroundColor: '#28a745',
    color: '#fff',
  },
  statusApproved: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  statusPending: {
    backgroundColor: '#ffc107',
    color: '#000',
  },
  statusDefault: {
    backgroundColor: '#6c757d',
    color: '#fff',
  },
  reportDetails: {
    marginTop: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default VesselReportsScreen;