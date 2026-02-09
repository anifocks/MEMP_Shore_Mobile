// src/screens/CompliancesScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { previewEuMrvData, generateEuMrvReport } from '../services/api';

type CompliancesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Compliances'>;

interface Props {
  navigation: CompliancesScreenNavigationProp;
}

const CompliancesScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedVessel, setSelectedVessel] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    if (!selectedVessel || !fromDate || !toDate) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const data = await previewEuMrvData(selectedVessel, fromDate, toDate);
      Alert.alert('Success', `Found ${data.dailyReports?.length || 0} records`);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    // Similar to preview
    Alert.alert('Info', 'Report generation would be implemented here');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>EU MRV Compliance</Text>

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

      <TouchableOpacity style={styles.button} onPress={handlePreview}>
        <Text style={styles.buttonText}>Preview Data</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleGenerate}>
        <Text style={styles.buttonText}>Generate Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
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
    marginBottom: 15,
  },
  secondaryButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CompliancesScreen;