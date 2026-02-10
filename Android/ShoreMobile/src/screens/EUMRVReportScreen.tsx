// src/screens/EUMRVReportScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { previewEuMrvData } from '../services/api';

type EUMRVReportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EUMRVReport'>;

interface Props {
  navigation: EUMRVReportScreenNavigationProp;
}

const EUMRVReportScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedVessel, setSelectedVessel] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handlePreview = async () => {
    if (!selectedVessel || !fromDate || !toDate) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await previewEuMrvData(selectedVessel, fromDate, toDate);
      setReportData(data);
      Alert.alert('Success', `Found ${data.dailyReports?.length || 0} daily reports, ${data.voyagesAggregator?.length || 0} voyage aggregators, ${data.annualAggregator?.length || 0} annual records`);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch EU MRV data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>EU MRV Report</Text>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Report Parameters</Text>

        <TextInput
          style={styles.input}
          placeholder="Vessel ID"
          value={selectedVessel}
          onChangeText={setSelectedVessel}
        />

        <TextInput
          style={styles.input}
          placeholder="From Date (YYYY-MM-DD)"
          value={fromDate}
          onChangeText={setFromDate}
        />

        <TextInput
          style={styles.input}
          placeholder="To Date (YYYY-MM-DD)"
          value={toDate}
          onChangeText={setToDate}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePreview}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : 'Preview Report'}
          </Text>
        </TouchableOpacity>
      </View>

      {reportData && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Report Summary</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              Daily Reports: {reportData.dailyReports?.length || 0}
            </Text>
            <Text style={styles.summaryText}>
              Voyage Aggregators: {reportData.voyagesAggregator?.length || 0}
            </Text>
            <Text style={styles.summaryText}>
              Annual Aggregator: {reportData.annualAggregator?.length || 0}
            </Text>
          </View>

          {reportData.dailyReports && reportData.dailyReports.length > 0 && (
            <View style={styles.dataPreview}>
              <Text style={styles.previewTitle}>Daily Reports Preview</Text>
              {reportData.dailyReports.slice(0, 3).map((report: any, index: number) => (
                <View key={index} style={styles.dataRow}>
                  <Text style={styles.dataText}>
                    Date: {report.reportingPeriod || 'N/A'}
                  </Text>
                  <Text style={styles.dataText}>
                    Fuel Consumed: {report.totalFuelConsumptionMT?.toFixed(2) || 'N/A'} MT
                  </Text>
                  <Text style={styles.dataText}>
                    CO2 Emissions: {report.totalCO2Emissions?.toFixed(2) || 'N/A'} tons
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
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
  formSection: {
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
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007bff',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsSection: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  dataPreview: {
    marginTop: 15,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dataRow: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  dataText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default EUMRVReportScreen;