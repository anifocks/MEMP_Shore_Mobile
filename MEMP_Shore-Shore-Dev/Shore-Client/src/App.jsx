// Shore-Client/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { initialMenuConfig } from "./initialMenuConfig.js";
import { ThemeProvider } from './context/ThemeContext';

// Core Layout & Pages
import LoginPage from './pages/LoginPage.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SubMenuPage from './pages/SubMenuPage.jsx';
import MEMPLayout from './layouts/MEMPLayout/MEMPLayout.jsx';

// Existing pages
import TeamPage from './pages/TeamPage.jsx';
import TeamMemberPage from './pages/TeamMemberPage.jsx';
import MachineryDetailsPage from './pages/MachineryDetailsPage'; 

// Lazy Loads
const MEMPOverviewPage = lazy(() => import('./pages/MEMPOverviewPage.jsx'));
const VesselInfoPage = lazy(() => import('./pages/VesselInfoPage.jsx'));
const MachineryPage = lazy(() => import('./pages/MachineryPage.jsx'));
const PortManagementPage = lazy(() => import('./pages/PortManagementPage.jsx'));
const VesselDetailsPage = lazy(() => import('./pages/VesselDetailsPage.jsx'));
const VoyageManagementPage = lazy(() => import('./pages/VoyageManagementPage.jsx'));
const VoyageDetailsPage = lazy(() => import('./pages/VoyageDetailsPage.jsx'));
const BunkerManagementPage = lazy(() => import('./pages/BunkerManagementPage.jsx'));
const BunkerDetailsPage = lazy(() => import('./pages/BunkerDetailsPage.jsx'));
const VesselReportsPage = lazy(() => import('./pages/VesselReportsPage.jsx'));
const ReportDetailsPage = lazy(() => import('./pages/ReportDetailsPage.jsx'));
const AdditivePage = lazy(() => import('./pages/AdditivePage.jsx'));
const AdditiveDashboard = lazy(() => import('./components/MEMP/AdditiveDashboard.jsx'));
const ExcelIntegrationPage = lazy(() => import('./pages/ExcelIntegrationPage.jsx'));
const AddEditVesselPage = lazy(() => import('./pages/AddEditVesselPage.jsx'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage.jsx'));
const AddEditUserPage = lazy(() => import('./pages/AddEditUserPage.jsx'));
const FleetManagementPage = lazy(() => import('./pages/FleetManagementPage.jsx'));
const AddEditFleetPage = lazy(() => import('./pages/AddEditFleetPage.jsx'));
const MEMPAdminDashboard = lazy(() => import('./pages/MEMPAdminDashboard.jsx'));

// --- Vessel Dashboard Pages ---
const VesselStatusPage = lazy(() => import('./pages/VesselStatusPage.jsx'));
const VesselEmissionsPage = lazy(() => import('./pages/VesselEmissionsPage.jsx'));
const VesselMachineryDataPage = lazy(() => import('./pages/VesselMachineryDataPage.jsx'));

const TemplateDashboardPage = lazy(() => import('./pages/TemplateDashboardPage.jsx'));
const TemplateDetailPage = lazy(() => import('./pages/TemplateDetailPage.jsx'));
const CompliancesDashboardPage = lazy(() => import('./pages/CompliancesDashboardPage.jsx'));

// Compliance Report Pages
const CIIReportPage = lazy(() => import('./pages/CIIReportPage.jsx'));
const EUMRVReportPage = lazy(() => import('./pages/EUMRVReportPage.jsx'));
const EUETSReportPage = lazy(() => import('./pages/EUETSReportPage.jsx'));
const UKMRVReportPage = lazy(() => import('./pages/UKMRVReportPage.jsx'));
const UKETSReportPage = lazy(() => import('./pages/UKETSReportPage.jsx'));

const isAuthenticated = () => localStorage.getItem('isLoggedIn') === 'true';

const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// *** NEW: Super User / Admin Protection Wrapper ***
const SuperUserRoute = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const rights = user.userRights || '';
    
    // Check if user is logged in
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    // Check permissions (Allow 'Super User' or 'Admin')
    if (rights !== 'Super User' && rights !== 'Admin') {
        // Redirect unauthorized users to the MEMP Overview
        return <Navigate to="/app/memp" replace />;
    }

    // If allowed, render the child routes (Outlet)
    return <Outlet />;
};

const SuspenseFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem', color: '#333' }}>
        Loading Page...
    </div>
);

function App() {
    const [mainDashboardMenuItems, setMainMenuItems] = useState(() => {
        const savedMenus = localStorage.getItem('dynamicMenuConfig');
        let menuConfigSource = Array.isArray(initialMenuConfig) ? initialMenuConfig : [];
        if (savedMenus) {
            try {
                const parsedMenusFromStorage = JSON.parse(savedMenus);
                if (Array.isArray(parsedMenusFromStorage)) {
                    menuConfigSource = parsedMenusFromStorage;
                }
            } catch (error) {
                console.error("App.jsx: Error parsing main menu config.", error);
            }
        }
        return menuConfigSource;
    });

    useEffect(() => {
        localStorage.setItem('dynamicMenuConfig', JSON.stringify(mainDashboardMenuItems));
    }, [mainDashboardMenuItems]);

    return (
        <ThemeProvider>
            <Router>
                <Suspense fallback={<SuspenseFallback />}>
                    <Routes>
                        <Route path="/" element={<LoginPage />} />

                        <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                            <Route index element={<DashboardPage menuConfig={mainDashboardMenuItems} />} />
                            <Route path="dashboard" element={<DashboardPage menuConfig={mainDashboardMenuItems} />} />
                            <Route path="menu/:menuItemId" element={<SubMenuPage menuConfig={mainDashboardMenuItems} />} />
                        </Route>

                        <Route path="/app/memp" element={<ProtectedRoute><MEMPLayout /></ProtectedRoute>}>
                            <Route index element={<MEMPOverviewPage />} />
                            
                            {/* --- Vessel Dashboard Routes (Parent and Children) --- */}
                            <Route path="vessel-dashboard" element={<Navigate to="/app/memp/vessel-dashboard/status" replace />} />
                            <Route path="vessel-dashboard/status" element={<VesselStatusPage />} />
                            <Route path="vessel-dashboard/emissions" element={<VesselEmissionsPage />} />
                            <Route path="vessel-dashboard/machinery" element={<VesselMachineryDataPage />} />
                            
                            {/* --- ADMIN CONSOLE ROUTES (PROTECTED) --- */}
                            {/* All routes inside this wrapper require 'Super User' or 'Admin' rights */}
                            <Route element={<SuperUserRoute />}>
                                <Route path="admin" element={<MEMPAdminDashboard />} />
                                
                                {/* USERS */}
                                <Route path="admin/users" element={<UserManagementPage />} />
                                <Route path="admin/users/add" element={<AddEditUserPage />} />
                                <Route path="admin/users/:userId" element={<AddEditUserPage />} /> 
                                <Route path="admin/users/:userId/edit" element={<AddEditUserPage />} />
                                
                                {/* FLEETS */}
                                <Route path="admin/fleets" element={<FleetManagementPage />} />
                                <Route path="admin/fleets/add" element={<AddEditFleetPage />} />
                                <Route path="admin/fleets/:fleetId" element={<AddEditFleetPage />} /> 
                                <Route path="admin/fleets/:fleetId/edit" element={<AddEditFleetPage />} />
                                
                                {/* TEAM */}
                                <Route path="admin/team" element={<TeamPage menuConfig={mainDashboardMenuItems} />} />
                                <Route path="admin/team/member/:memberId/tasks" element={<TeamMemberPage />} />
                            </Route>
                            
                            {/* --- EXISTING MODULES --- */}
                            <Route path="vessel-info" element={<VesselInfoPage />} />
                            <Route path="vessel-details/:shipId" element={<VesselDetailsPage />} />
                            <Route path="add-vessel" element={<AddEditVesselPage />} />
                            <Route path="edit-vessel/:shipId" element={<AddEditVesselPage />} />
                            <Route path="machinery" element={<MachineryPage />} />
                            <Route path="machinery-details/:id" element={<MachineryDetailsPage />} />
                            <Route path="ports" element={<PortManagementPage />} />
                            <Route path="voyages" element={<VoyageManagementPage />} />
                            <Route path="voyages/details/:voyageId" element={<VoyageDetailsPage />} />
                            <Route path="bunkering-management" element={<BunkerManagementPage />} />
                            <Route path="bunkering-management/details/:id" element={<BunkerDetailsPage />} />
                            <Route path="vessel-reports" element={<VesselReportsPage />} />
                            <Route path="compliances" element={<CompliancesDashboardPage />} />
                            <Route path="cii-report" element={<CIIReportPage />} />
                            <Route path="eu-mrv-report" element={<EUMRVReportPage />} />
                            <Route path="eu-ets-report" element={<EUETSReportPage />} />
                            <Route path="uk-mrv-report" element={<UKMRVReportPage />} />
                            <Route path="uk-ets-report" element={<UKETSReportPage />} />
                            <Route path="vessel-reports/details/:reportId" element={<ReportDetailsPage />} />
                            <Route path="additives" element={<AdditivePage />} />
                            <Route path="additives/dashboard" element={<AdditiveDashboard />} />
                            <Route path="excel-integration" element={<ExcelIntegrationPage />} />

                            {/* --- NEW: Template Reporting Routes --- */}
                            <Route path="templates" element={<TemplateDashboardPage />} />
                            <Route path="templates/:templateName" element={<TemplateDetailPage />} />
                        </Route>

                        <Route path="*" element={<Navigate to={isAuthenticated() ? "/app/dashboard" : "/"} replace />} />
                    </Routes>
                </Suspense>
            </Router>
        </ThemeProvider>
    );
}

export default App;