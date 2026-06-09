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
import AdminAdvertisersPage from './pages/AdminAdvertisersPage';
import AdminOutletsPage from './pages/AdminOutletsPage';
import AdminOutletGroupsPage from './pages/AdminOutletGroupsPage';
import AdminLayoutsPage from './pages/AdminLayoutsPage';
import AssetsManagement from './pages/AssetsManagement';
import DetailedRevenueReport from './pages/DetailedRevenueReport';
import RevenueGeneration from './pages/RevenueGeneration';
import AlignedPartnerSchemaFeeManagement from './pages/AlignedPartnerSchemaFeeManagement';
import AlignedBusinessSchemaFeeManagement from './pages/AlignedBusinessSchemaFeeManagement';
import DeviceRegistration from './pages/DeviceRegistration';
import DemographyDashboard from './pages/DemographyDashboard';
import VenuePartnersManagement from './pages/VenuePartnersManagement';
import PublishersManagement from './pages/PublishersManagement';
import SettlementsManagement from './pages/SettlementsManagement';
import PublisherDashboard from './pages/PublisherDashboard';
import VenuePartnerDashboard from './pages/VenuePartnerDashboard';
import AdApprovalsManagement from './pages/AdApprovalsManagement';
import AdSubmitTargeting from './pages/AdSubmitTargeting';
import CampaignCoveragePage from './pages/CampaignCoveragePage';
import CampaignsManagement from './pages/CampaignsManagement';
import CampaignEditor from './pages/CampaignEditor';
import IntegrationsManagement from './pages/IntegrationsManagement';
import VenueOutletsPage from './pages/VenueOutletsPage';
import PublisherAdvertisersPage from './pages/PublisherAdvertisersPage';
import PublisherAnalyticsPage from './pages/PublisherAnalyticsPage';
import VenuePartnerAnalyticsPage from './pages/VenuePartnerAnalyticsPage';

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
              <Route path="venue-partners" element={<VenuePartnersManagement />} />
              <Route path="outlets" element={<AdminOutletsPage />} />
              <Route path="outlet-groups" element={<AdminOutletGroupsPage />} />
              <Route path="publishers" element={<PublishersManagement />} />
              <Route path="advertisers" element={<AdminAdvertisersPage />} />
              <Route path="settlements" element={<SettlementsManagement />} />
              <Route path="devices" element={<DevicesManagement />} />
              <Route path="devices/:deviceId" element={<DeviceDetail />} />
              <Route path="layouts" element={<AdminLayoutsPage />} />
              <Route path="advertisements" element={<AdvertisementsManagement />} />
              <Route path="campaigns" element={<CampaignsManagement />} />
              <Route path="campaigns/new" element={<CampaignEditor />} />
              <Route path="campaigns/:campaignId/edit" element={<CampaignEditor />} />
              <Route path="campaigns/:campaignId/submit" element={<AdSubmitTargeting />} />
              <Route path="campaigns/:campaignId/coverage" element={<CampaignCoveragePage />} />
              <Route path="assets" element={<AssetsManagement />} />
              <Route path="partner-fees" element={<AlignedPartnerSchemaFeeManagement />} />
              <Route path="business-fees" element={<AlignedBusinessSchemaFeeManagement />} />
              <Route path="revenue-generation" element={<RevenueGeneration />} />
              <Route path="detailed-revenue" element={<DetailedRevenueReport />} />
              <Route path="device-registration" element={<DeviceRegistration />} />
              <Route path="demography" element={<DemographyDashboard />} />
              <Route path="approvals" element={<AdApprovalsManagement />} />
              <Route path="integrations" element={<IntegrationsManagement />} />
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
              <Route path="advertisements" element={<AdvertisementsManagement />} />
            </Route>

            {/* V2: Publisher self-serve */}
            <Route
              path="/publisher/*"
              element={
                <ProtectedRoute allowedRoles={['publisher']}>
                  <ElegantLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<PublisherDashboard />} />
              <Route path="advertisers" element={<PublisherAdvertisersPage />} />
              <Route path="advertisements" element={<AdvertisementsManagement />} />
              <Route path="campaigns" element={<CampaignsManagement />} />
              <Route path="campaigns/new" element={<CampaignEditor />} />
              <Route path="campaigns/:campaignId/edit" element={<CampaignEditor />} />
              <Route path="campaigns/:campaignId/submit" element={<AdSubmitTargeting />} />
              <Route path="campaigns/:campaignId/coverage" element={<CampaignCoveragePage />} />
              {/* Publisher does NOT get an approvals queue — they track
                  submission status from the Campaigns list. The route
                  was removed; bookmarked URLs now 404. */}
              <Route path="settlements" element={<SettlementsManagement />} />
              <Route path="analytics" element={<PublisherAnalyticsPage />} />
            </Route>

            {/* V2: Venue Partner self-serve */}
            <Route
              path="/venue/*"
              element={
                <ProtectedRoute allowedRoles={['venue_partner']}>
                  <ElegantLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<VenuePartnerDashboard />} />
              <Route path="outlets" element={<VenueOutletsPage />} />
              <Route path="outlet-groups" element={<AdminOutletGroupsPage />} />
              <Route path="devices" element={<DevicesManagement />} />
              <Route path="devices/:deviceId" element={<DeviceDetail />} />
              <Route path="layouts" element={<AdminLayoutsPage />} />
              <Route path="approvals" element={<AdApprovalsManagement />} />
              <Route path="settlements" element={<SettlementsManagement />} />
              <Route path="analytics" element={<VenuePartnerAnalyticsPage />} />
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
