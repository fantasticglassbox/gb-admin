import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { elegantTheme } from './theme/elegantTheme';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ElegantLayout from './components/ElegantLayout';
import ElegantLogin from './pages/ElegantLogin';
import RealAdminDashboard from './pages/RealAdminDashboard';
import RealPartnerDashboard from './pages/RealPartnerDashboard';
import RealMerchantDashboard from './pages/RealMerchantDashboard';
import i18n from './localization/i18n';
import Unauthorized from './pages/Unauthorized';
import UsersManagement from './pages/UsersManagement';
import AdvertisementsManagement from './pages/AdvertisementsManagement';
import PartnersManagement from './pages/PartnersManagement';
import MerchantsManagement from './pages/MerchantsManagement';
import DevicesManagement from './pages/DevicesManagement';
import DeviceDetail from './pages/DeviceDetail';
import AssetsManagement from './pages/AssetsManagement';
import DetailedRevenueReport from './pages/DetailedRevenueReport';
import RevenueGeneration from './pages/RevenueGeneration';
import AlignedPartnerSchemaFeeManagement from './pages/AlignedPartnerSchemaFeeManagement';
import AlignedBusinessSchemaFeeManagement from './pages/AlignedBusinessSchemaFeeManagement';
import DeviceRegistration from './pages/DeviceRegistration';
import DemographyDashboard from './pages/DemographyDashboard';

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={elegantTheme}>
        <CssBaseline />
        <AuthProvider>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <ElegantLogin />
                </ProtectedRoute>
              } 
            />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected routes with layout */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ElegantLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RealAdminDashboard />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="partners" element={<PartnersManagement />} />
              <Route path="merchants" element={<MerchantsManagement />} />
              <Route path="devices" element={<DevicesManagement />} />
              <Route path="devices/:deviceId" element={<DeviceDetail />} />
              <Route path="advertisements" element={<AdvertisementsManagement />} />
              <Route path="assets" element={<AssetsManagement />} />
              <Route path="partner-fees" element={<AlignedPartnerSchemaFeeManagement />} />
              <Route path="business-fees" element={<AlignedBusinessSchemaFeeManagement />} />
              <Route path="revenue-generation" element={<RevenueGeneration />} />
              <Route path="detailed-revenue" element={<DetailedRevenueReport />} />
              <Route path="device-registration" element={<DeviceRegistration />} />
              <Route path="demography" element={<DemographyDashboard />} />
            </Route>

            <Route 
              path="/partner/*" 
              element={
                <ProtectedRoute allowedRoles={['partner']}>
                  <ElegantLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RealPartnerDashboard />} />
              <Route path="devices" element={<DevicesManagement />} />
              <Route path="devices/:deviceId" element={<DeviceDetail />} />
              <Route path="advertisements" element={<AdvertisementsManagement />} />
            </Route>

            <Route 
              path="/merchant/*" 
              element={
                <ProtectedRoute allowedRoles={['merchant']}>
                  <ElegantLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RealMerchantDashboard />} />
              <Route path="detailed-revenue" element={<DetailedRevenueReport />} />
              <Route path="advertisements" element={<AdvertisementsManagement />} />
            </Route>

            {/* Default redirect - redirect authenticated users to their dashboard */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Navigate to="/login" replace />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/unauthorized" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
    </I18nextProvider>
  );
}

export default App;
