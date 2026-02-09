/**
 * MEMP Shore Mobile App
 * Marine Emissions Management Platform
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#007bff" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

export default App;
