// src/navigation/AppNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MEMPOverviewScreen from '../screens/MEMPOverviewScreen';
import VesselInfoScreen from '../screens/VesselInfoScreen';
import VesselDetailsScreen from '../screens/VesselDetailsScreen';
import MachineryScreen from '../screens/MachineryScreen';
import MachineryDetailsScreen from '../screens/MachineryDetailsScreen';
import PortManagementScreen from '../screens/PortManagementScreen';
import VoyageManagementScreen from '../screens/VoyageManagementScreen';
import VoyageDetailsScreen from '../screens/VoyageDetailsScreen';
import BunkerManagementScreen from '../screens/BunkerManagementScreen';
import BunkerDetailsScreen from '../screens/BunkerDetailsScreen';
import VesselReportsScreen from '../screens/VesselReportsScreen';
import ReportDetailsScreen from '../screens/ReportDetailsScreen';
import CompliancesScreen from '../screens/CompliancesScreen';
import CIIReportScreen from '../screens/CIIReportScreen';
import EUMRVReportScreen from '../screens/EUMRVReportScreen';
import EUETSReportScreen from '../screens/EUETSReportScreen';
import UKMRVReportScreen from '../screens/UKMRVReportScreen';
import UKETSReportScreen from '../screens/UKETSReportScreen';
import AdditiveScreen from '../screens/AdditiveScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import FleetManagementScreen from '../screens/FleetManagementScreen';
import TeamScreen from '../screens/TeamScreen';
import VesselStatusScreen from '../screens/VesselStatusScreen';
import VesselEmissionsScreen from '../screens/VesselEmissionsScreen';
import VesselMachineryDataScreen from '../screens/VesselMachineryDataScreen';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  MEMPOverview: undefined;
  VesselInfo: undefined;
  VesselDetails: { shipId: string };
  Machinery: undefined;
  MachineryDetails: { id: string };
  PortManagement: undefined;
  VoyageManagement: undefined;
  VoyageDetails: { voyageId: string };
  BunkerManagement: undefined;
  BunkerDetails: { id: string };
  VesselReports: undefined;
  ReportDetails: { reportId: string };
  Compliances: undefined;
  CIIReport: undefined;
  EUMRVReport: undefined;
  EUETSReport: undefined;
  UKMRVReport: undefined;
  UKETSReport: undefined;
  Additive: undefined;
  UserManagement: undefined;
  FleetManagement: undefined;
  Team: undefined;
  VesselStatus: undefined;
  VesselEmissions: undefined;
  VesselMachineryData: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007bff',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'MEMP Login' }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen
          name="MEMPOverview"
          component={MEMPOverviewScreen}
          options={{ title: 'MEMP Overview' }}
        />
        <Stack.Screen
          name="VesselInfo"
          component={VesselInfoScreen}
          options={{ title: 'Vessel Information' }}
        />
        <Stack.Screen
          name="VesselDetails"
          component={VesselDetailsScreen}
          options={{ title: 'Vessel Details' }}
        />
        <Stack.Screen
          name="Machinery"
          component={MachineryScreen}
          options={{ title: 'Machinery' }}
        />
        <Stack.Screen
          name="MachineryDetails"
          component={MachineryDetailsScreen}
          options={{ title: 'Machinery Details' }}
        />
        <Stack.Screen
          name="PortManagement"
          component={PortManagementScreen}
          options={{ title: 'Port Management' }}
        />
        <Stack.Screen
          name="VoyageManagement"
          component={VoyageManagementScreen}
          options={{ title: 'Voyage Management' }}
        />
        <Stack.Screen
          name="VoyageDetails"
          component={VoyageDetailsScreen}
          options={{ title: 'Voyage Details' }}
        />
        <Stack.Screen
          name="BunkerManagement"
          component={BunkerManagementScreen}
          options={{ title: 'Bunker Management' }}
        />
        <Stack.Screen
          name="BunkerDetails"
          component={BunkerDetailsScreen}
          options={{ title: 'Bunker Details' }}
        />
        <Stack.Screen
          name="VesselReports"
          component={VesselReportsScreen}
          options={{ title: 'Vessel Reports' }}
        />
        <Stack.Screen
          name="ReportDetails"
          component={ReportDetailsScreen}
          options={{ title: 'Report Details' }}
        />
        <Stack.Screen
          name="Compliances"
          component={CompliancesScreen}
          options={{ title: 'Compliances' }}
        />
        <Stack.Screen
          name="CIIReport"
          component={CIIReportScreen}
          options={{ title: 'CII Report' }}
        />
        <Stack.Screen
          name="EUMRVReport"
          component={EUMRVReportScreen}
          options={{ title: 'EU MRV Report' }}
        />
        <Stack.Screen
          name="EUETSReport"
          component={EUETSReportScreen}
          options={{ title: 'EU ETS Report' }}
        />
        <Stack.Screen
          name="UKMRVReport"
          component={UKMRVReportScreen}
          options={{ title: 'UK MRV Report' }}
        />
        <Stack.Screen
          name="UKETSReport"
          component={UKETSReportScreen}
          options={{ title: 'UK ETS Report' }}
        />
        <Stack.Screen
          name="Additive"
          component={AdditiveScreen}
          options={{ title: 'Additives' }}
        />
        <Stack.Screen
          name="UserManagement"
          component={UserManagementScreen}
          options={{ title: 'User Management' }}
        />
        <Stack.Screen
          name="FleetManagement"
          component={FleetManagementScreen}
          options={{ title: 'Fleet Management' }}
        />
        <Stack.Screen
          name="Team"
          component={TeamScreen}
          options={{ title: 'Team' }}
        />
        <Stack.Screen
          name="VesselStatus"
          component={VesselStatusScreen}
          options={{ title: 'Vessel Status' }}
        />
        <Stack.Screen
          name="VesselEmissions"
          component={VesselEmissionsScreen}
          options={{ title: 'Vessel Emissions' }}
        />
        <Stack.Screen
          name="VesselMachineryData"
          component={VesselMachineryDataScreen}
          options={{ title: 'Vessel Machinery Data' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;