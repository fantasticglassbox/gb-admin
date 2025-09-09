import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Devices as DevicesIcon,
  CheckCircle as ActiveIcon,
  Schedule as RegisteredIcon,
  Public as GlobalIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import CityDeploymentMap from '../components/CityDeploymentMap';

interface DeviceLocation {
  device_id: string;
  device_name: string;
  device_type: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  district: string;
  province: string;
  country: string;
  location_name: string;
  zone: string;
  merchant_name?: string;
}

interface LocationStats {
  total_devices: number;
  active_devices: number;
  registered_only: number;
  by_province: Record<string, number>;
  by_city: Record<string, number>;
  by_device_type: Record<string, number>;
  device_locations: DeviceLocation[];
}

const DemographyDashboard: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);

  useEffect(() => {
    loadDemographyData();
  }, []);

  const loadDemographyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.getLocationStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load demography data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (!hasRole('admin')) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {t('unauthorizedAccess')}
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box p={3}>
        <Alert severity="info">
          {t('noDataAvailable')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box mb={4}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <GlobalIcon sx={{ color: theme.palette.primary.main }} />
          City Deployment Analytics
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Comprehensive overview of device deployments across active cities with real-time coverage analytics
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" component="div" color="primary" fontWeight="bold">
                    {formatNumber(stats.total_devices)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('totalDevices')}
                  </Typography>
                </Box>
                <DevicesIcon sx={{ fontSize: 48, color: theme.palette.primary.main, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" component="div" color="success.main" fontWeight="bold">
                    {formatNumber(stats.active_devices)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('activeDevices')}
                  </Typography>
                </Box>
                <ActiveIcon sx={{ fontSize: 48, color: theme.palette.success.main, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" component="div" color="warning.main" fontWeight="bold">
                    {formatNumber(stats.registered_only)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('pendingAssignment')}
                  </Typography>
                </Box>
                <RegisteredIcon sx={{ fontSize: 48, color: theme.palette.warning.main, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0}
            sx={{ 
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" component="div" color="info.main" fontWeight="bold">
                    {Object.keys(stats.by_province).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('provinces')}
                  </Typography>
                </Box>
                <LocationIcon sx={{ fontSize: 48, color: theme.palette.info.main, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* City-Focused Deployment Map */}
      <CityDeploymentMap 
        locations={stats.device_locations}
        stats={stats}
        height={650}
      />

      {/* Additional Analytics */}
      <Grid container spacing={3} mt={2}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('deviceDistribution')}
              </Typography>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {t('deploymentEfficiency')}: {((stats.active_devices / stats.total_devices) * 100).toFixed(1)}%
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{t('activeDevices')}</Typography>
                    <Typography variant="body2">{stats.active_devices}</Typography>
                  </Box>
                  <Box sx={{ 
                    height: 8, 
                    backgroundColor: alpha(theme.palette.success.main, 0.2),
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ 
                      height: '100%',
                      width: `${(stats.active_devices / stats.total_devices) * 100}%`,
                      backgroundColor: theme.palette.success.main,
                      borderRadius: 4,
                    }} />
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('geographicalCoverage')}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {t('devicesDeployedAcross')} {Object.keys(stats.by_city).length} {t('cities')}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {Object.entries(stats.by_city)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 3)
                  .map(([city, count], index) => (
                    <Box key={city} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        size="small" 
                        label={`#${index + 1}`} 
                        sx={{ mr: 1, minWidth: 32 }}
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {city || 'Unknown City'}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {count} {t('devices')}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DemographyDashboard;
