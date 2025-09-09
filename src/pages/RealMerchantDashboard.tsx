import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Button,
} from '@mui/material';
import {
  Store as StoreIcon,
  DeviceHub as DevicesIcon,
  Campaign as AdsIcon,
  Assessment as AnalyticsIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  PlayArrow as OnlineIcon,
  Stop as OfflineIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Business as PartnersIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCompactNumber, formatMonthDisplay, formatCurrencyDetailed } from '../utils/formatters';
import type { Device as SystemDevice, Advertisement as SystemAdvertisement } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface MerchantStats {
  totalDevices: number;
  onlineDevices: number;
  totalAds: number;
  activeAds: number;
}

interface MerchantAnalytics {
  total_revenue_share: number;
  total_ads_displayed: number;
  total_partners: number;
  revenue_by_month: MonthlyRevenue[];
  revenue_by_partner: PartnerRevenue[];
  device_performance: DevicePerformance[];
  currency: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  ads_count: number;
}

interface PartnerRevenue {
  partner_id: string;
  partner_name: string;
  revenue_share: number;
  ads_count: number;
}

interface DevicePerformance {
  device_id: string;
  device_name: string;
  ads_displayed: number;
  revenue_generated: number;
}

interface MerchantAdvertisement {
  id: string;
  merchant_id: string;
  advertisement_id: string;
  created_at: string;
}

const RealMerchantDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real data states
  const [stats, setStats] = useState<MerchantStats>({
    totalDevices: 0,
    onlineDevices: 0,
    totalAds: 0,
    activeAds: 0,
  });
  
  const [devices, setDevices] = useState<SystemDevice[]>([]);
  const [advertisements, setAdvertisements] = useState<SystemAdvertisement[]>([]);
  const [merchantAds, setMerchantAds] = useState<MerchantAdvertisement[]>([]);
  
  // Revenue data states
  const [merchantAnalytics, setMerchantAnalytics] = useState<MerchantAnalytics | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      loadRevenueData();
    }
  }, [user, selectedYear, selectedMonth]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load devices and advertisements
      const [devicesResponse, adsResponse] = await Promise.all([
        apiService.getDevices().catch(() => ({ data: [] })),
        apiService.getAdvertisements().catch(() => ({ data: [] })),
      ]);
      
      const devicesData = devicesResponse.data || [];
      const adsData = adsResponse.data || [];
      
      // Filter devices by current merchant
      const merchantDevices = user?.role === 'merchant' 
        ? devicesData.filter((device: SystemDevice) => device.merchant_id === user.id)
        : devicesData;
      
      setDevices(merchantDevices);
      setAdvertisements(adsData);
      
      // Try to get merchant advertisement assignments
      let merchantAdsData: MerchantAdvertisement[] = [];
      try {
        const merchantAdsResponse = await apiService.get('/merchants/ads');
        merchantAdsData = merchantAdsResponse.data || [];
        
        // Filter by current merchant
        if (user?.role === 'merchant') {
          merchantAdsData = merchantAdsData.filter(ma => ma.merchant_id === user.id);
        }
        
        setMerchantAds(merchantAdsData);
      } catch (err) {
        // If endpoint doesn't exist, use empty array
        setMerchantAds([]);
      }
      
      // Calculate stats from real data
      const onlineCount = merchantDevices.filter((device: SystemDevice) => 
        device.status === 'active'
      ).length;
      
      // Get ads assigned to this merchant
      const assignedAdIds = merchantAdsData.map(ma => ma.advertisement_id);
      const assignedAds = adsData.filter((ad: SystemAdvertisement) => 
        assignedAdIds.includes(ad.id)
      );
      
      const activeAssignedAds = assignedAds.filter((ad: SystemAdvertisement) => 
        ad.state === 'PUBLISHED'
      );
      
      setStats({
        totalDevices: merchantDevices.length,
        onlineDevices: onlineCount,
        totalAds: assignedAds.length,
        activeAds: activeAssignedAds.length,
      });
      
    } catch (err: any) {
      console.error('Error loading merchant dashboard:', err);
      setError(t('failedToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueData = async () => {
    if (!user?.id) return;
    
    try {
      // Load merchant analytics (revenue share data)
      const analyticsResponse = await apiService.getMerchantAnalytics(selectedYear, selectedMonth);
      if (analyticsResponse.analytics) {
        setMerchantAnalytics(analyticsResponse.analytics);
      }
    } catch (err: any) {
      console.warn('Failed to load merchant analytics:', err.response?.data?.message);
      setMerchantAnalytics(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadRevenueData()]);
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number | null | undefined, currency: string = 'IDR') => {
    const safeAmount = amount || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
    }).format(safeAmount);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  const generateMonthOptions = () => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.map((month, index) => ({ value: index + 1, label: month }));
  };

  const getDeviceStatusData = () => {
    const statusCounts = devices.reduce((acc, device) => {
      const status = device.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(statusCounts).map(([status, count], index) => ({
      name: status,
      value: count,
      color: COLORS[index % COLORS.length],
    }));
  };

  const getAssignedAdsData = () => {
    // Get ads assigned to this merchant
    const assignedAdIds = merchantAds.map(ma => ma.advertisement_id);
    const assignedAds = advertisements.filter(ad => assignedAdIds.includes(ad.id));
    
    const stateCounts = assignedAds.reduce((acc, ad) => {
      const state = ad.state || 'unknown';
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(stateCounts).map(([state, count], index) => ({
      name: state,
      value: count,
      color: COLORS[index % COLORS.length],
    }));
  };

  const getDeviceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'offline':
      case 'inactive':
        return 'error';
      case 'maintenance':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDeviceStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <OnlineIcon />;
      case 'offline':
      case 'inactive':
        return <OfflineIcon />;
      default:
        return <DevicesIcon />;
    }
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          {t('loading')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <StoreIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('merchantDashboard')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Monitor your {t('devices')} and {t('advertisements')}
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <Button variant="contained" startIcon={<SettingsIcon />}>
            {t('settings')}
          </Button>
          
          <Tooltip title={t('refresh')}>
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {formatNumber(stats.onlineDevices)}/{formatNumber(stats.totalDevices)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('devices')} {t('online')}
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    {stats.totalDevices > 0 
                      ? `${((stats.onlineDevices / stats.totalDevices) * 100).toFixed(1)}%`
                      : '0%'
                    } uptime
                  </Typography>
                </Box>
                <DevicesIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="secondary">
                    {formatNumber(stats.totalDevices)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('totalDevices')}
                  </Typography>
                </Box>
                <DevicesIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {formatNumber(stats.activeAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('activeAds')}
                  </Typography>
                </Box>
                <AdsIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatNumber(stats.totalAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Assigned {t('advertisements')}
                  </Typography>
                </Box>
                <AdsIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue Share Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center' }}>
        <MoneyIcon sx={{ mr: 1 }} />
        Revenue Share {t('analytics')}
      </Typography>

      {/* Period Selection */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Year</InputLabel>
            <Select
              value={selectedYear}
              label="Year"
              onChange={(e) => setSelectedYear(e.target.value as number)}
            >
              {generateYearOptions().map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>Month</InputLabel>
            <Select
              value={selectedMonth}
              label="Month"
              onChange={(e) => setSelectedMonth(e.target.value as number)}
            >
              {generateMonthOptions().map((month) => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Revenue Share Summary Cards */}
      {merchantAnalytics ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" color="success.main">
                      {formatCurrency(merchantAnalytics.total_revenue_share || 0, merchantAnalytics.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Revenue Share
                    </Typography>
                  </Box>
                  <MoneyIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" color="info.main">
                      {formatNumber(merchantAnalytics.total_ads_displayed)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ads Displayed
                    </Typography>
                  </Box>
                  <AdsIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" color="primary.main">
                      {formatNumber(merchantAnalytics.total_partners)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Brands
                    </Typography>
                  </Box>
                  <PartnersIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No revenue share data available for {selectedMonth}/{selectedYear}.
          <Typography variant="body2" component="span" sx={{ ml: 1 }}>
            Contact admin to generate revenue data for this period.
          </Typography>
        </Alert>
      )}

      {/* Revenue Analytics Charts */}
      {merchantAnalytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Monthly Revenue Share Trend */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Revenue Share
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={merchantAnalytics.revenue_by_month || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => formatMonthDisplay(value)}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCompactNumber(value, '')}
                    />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrencyDetailed(value), 'Revenue Share']}
                      labelFormatter={(label) => formatMonthDisplay(label)}
                    />
                    <Bar dataKey="revenue" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue by Brand/Partner */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Revenue Share by Brand
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={merchantAnalytics.revenue_by_partner?.slice(0, 5) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="partner_name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Revenue Share']}
                    />
                    <Bar dataKey="revenue_share" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Device Performance Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Device Performance
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Device Name</TableCell>
                      <TableCell align="right">Ads Displayed</TableCell>
                      <TableCell align="right">Revenue Generated</TableCell>
                      <TableCell align="right">Revenue per Ad</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(merchantAnalytics.device_performance?.slice(0, 10) || []).map((device, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {device.device_name || `Device ${device.device_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatNumber(device.ads_displayed)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main">
                            {formatCurrency(device.revenue_generated)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="info.main">
                            {device.ads_displayed > 0 ? formatCurrency(device.revenue_generated / device.ads_displayed) : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('deviceStatus')}
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getDeviceStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${((percent || 0) * 100).toFixed(1)}%)`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getDeviceStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Advertisement States
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAssignedAdsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill={COLORS[0]}>
                    {getAssignedAdsData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Device Management Table */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My {t('devices')}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Device Name</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell>Last Updated</TableCell>
                      <TableCell>{t('actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <DevicesIcon sx={{ mr: 1 }} />
                            <Typography variant="body2" fontWeight="medium">
                              {device.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getDeviceStatusIcon(device.status)}
                            label={device.status}
                            color={getDeviceStatusColor(device.status) as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {device.created_at ? new Date(device.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {device.updated_at ? new Date(device.updated_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={t('settings')}>
                            <IconButton size="small">
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('analytics')}>
                            <IconButton size="small">
                              <AnalyticsIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {devices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          {t('noDataFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assigned Advertisements */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned {t('advertisements')}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      <TableCell>Assigned Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {merchantAds.slice(0, 10).map((ma) => {
                      const ad = advertisements.find(a => a.id === ma.advertisement_id);
                      if (!ad) return null;
                      
                      return (
                        <TableRow key={ma.id} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {ad.title}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {ad.description?.substring(0, 50)}...
                            </Typography>
                          </TableCell>
                          <TableCell>{ad.categories || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={ad.state} 
                              color={ad.state === 'PUBLISHED' ? 'success' : 'default'}
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            {ma.created_at ? new Date(ma.created_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {merchantAds.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          {t('noDataFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RealMerchantDashboard;
