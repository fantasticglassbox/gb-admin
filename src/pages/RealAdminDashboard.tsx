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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as UsersIcon,
  Business as PartnersIcon,
  Store as MerchantsIcon,
  DeviceHub as DevicesIcon,
  Campaign as AdsIcon,
  Refresh as RefreshIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as ReportIcon,
  AccountBalance as BusinessIcon,
  ShowChart as AnalyticsIcon,
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
import { formatCompactNumber, formatMonthDisplay, formatCurrencyDetailed } from '../utils/formatters';
// Using existing types from the system
import type { User as SystemUser, Device as SystemDevice, Advertisement as SystemAdvertisement } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface DashboardStats {
  totalUsers: number;
  totalPartners: number;
  totalMerchants: number;
  totalDevices: number;
  totalAds: number;
  activeAds: number;
}

interface AdminAnalytics {
  total_revenue: number;
  total_ads_published: number;
  total_merchants: number;
  total_partners: number;
  revenue_by_month: MonthlyRevenue[];
  top_performing_ads: AdPerformance[];
  revenue_by_partner: PartnerRevenue[];
  revenue_by_merchant: MerchantRevenue[];
  ad_state_distribution: { [key: string]: number };
  ad_category_distribution: { [key: string]: number };
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  ads_count: number;
}

interface AdPerformance {
  ad_id: string;
  title: string;
  views: number;
  revenue: number;
}

interface PartnerRevenue {
  partner_id: string;
  partner_name: string;
  total_revenue: number;
  ads_count: number;
}

interface MerchantRevenue {
  merchant_id: string;
  merchant_name: string;
  total_revenue: number;
  ads_count: number;
}

interface RevenueSummary {
  total_revenue: number;
  total_partner_fees: number;
  total_business_fees: number;
  total_net_amount: number;
  period: string;
  currency: string;
}

const RealAdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real data states
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalPartners: 0,
    totalMerchants: 0,
    totalDevices: 0,
    totalAds: 0,
    activeAds: 0,
  });
  
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [devices, setDevices] = useState<SystemDevice[]>([]);
  const [advertisements, setAdvertisements] = useState<SystemAdvertisement[]>([]);
  
  // Revenue data states
  const [adminAnalytics, setAdminAnalytics] = useState<AdminAnalytics | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadRevenueData();
  }, [selectedYear, selectedMonth]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load real data from existing endpoints
      const [usersResponse, devicesResponse, adsResponse] = await Promise.all([
        apiService.getUsers().catch(() => ({ data: [] })),
        apiService.getDevices().catch(() => ({ data: [] })),
        apiService.getAdvertisements().catch(() => ({ data: [] })),
      ]);
      
      const usersData = usersResponse.data || [];
      const devicesData = devicesResponse.data || [];
      const adsData = adsResponse.data || [];
      
      setUsers(usersData);
      setDevices(devicesData);
      setAdvertisements(adsData);
      
      // Calculate stats from real data
      const partnerCount = usersData.filter((u: SystemUser) => u.role === 'partner').length;
      const merchantCount = usersData.filter((u: SystemUser) => u.role === 'merchant').length;
      const activeAdsCount = adsData.filter((ad: SystemAdvertisement) => 
        ad.state === 'PUBLISHED'
      ).length;
      
      setStats({
        totalUsers: usersData.length,
        totalPartners: partnerCount,
        totalMerchants: merchantCount,
        totalDevices: devicesData.length,
        totalAds: adsData.length,
        activeAds: activeAdsCount,
      });
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(t('failedToLoadData'));
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueData = async () => {
    try {
      // Load admin analytics
      const analyticsResponse = await apiService.getAdminAnalytics(selectedYear, selectedMonth);
      if (analyticsResponse.analytics) {
        setAdminAnalytics(analyticsResponse.analytics);
      }

      // Load revenue summary
      try {
        const summaryResponse = await apiService.getRevenueSummary(selectedYear, selectedMonth);
        setRevenueSummary(summaryResponse);
      } catch (summaryErr: any) {
        console.warn('No revenue summary found for selected period:', summaryErr.response?.data?.message);
        setRevenueSummary(null);
      }
    } catch (err: any) {
      console.warn('Failed to load revenue data:', err.response?.data?.message);
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

  const getAdStateData = () => {
    const stateCounts = advertisements.reduce((acc, ad) => {
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
            <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('adminDashboard')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('overview')} of your Glassbox platform
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
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
        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {formatNumber(stats.totalUsers)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('totalUsers')}
                  </Typography>
                </Box>
                <UsersIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="secondary">
                    {formatNumber(stats.totalPartners)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('totalPartners')}
                  </Typography>
                </Box>
                <PartnersIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {formatNumber(stats.totalMerchants)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('totalMerchants')}
                  </Typography>
                </Box>
                <MerchantsIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatNumber(stats.totalDevices)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('totalDevices')}
                  </Typography>
                </Box>
                <DevicesIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {formatNumber(stats.totalAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('advertisements')}
                  </Typography>
                </Box>
                <AdsIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="error.main">
                    {formatNumber(stats.activeAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('activeAds')}
                  </Typography>
                </Box>
                <AdsIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Revenue Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center' }}>
        <MoneyIcon sx={{ mr: 1 }} />
        {t('revenue')} {t('analytics')}
      </Typography>

      {/* Revenue Period Selection */}
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

      {/* Revenue Summary Cards */}
      {revenueSummary ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" color="success.main">
                      {formatCurrency(revenueSummary.total_revenue || 0, revenueSummary.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {t('totalRevenue')}
                    </Typography>
                  </Box>
                  <MoneyIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" color="primary.main">
                      {formatCurrency(revenueSummary.total_partner_fees || 0, revenueSummary.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Partner Fees
                    </Typography>
                  </Box>
                  <PartnersIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" color="info.main">
                      {formatCurrency(revenueSummary.total_business_fees || 0, revenueSummary.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Business Fees
                    </Typography>
                  </Box>
                  <BusinessIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(revenueSummary.total_net_amount || 0, revenueSummary.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Net Amount
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No revenue data available for {selectedMonth}/{selectedYear}. 
          <Typography variant="body2" component="span" sx={{ ml: 1 }}>
            Generate revenue data first from the Revenue Generation page.
          </Typography>
        </Alert>
      )}

      {/* Revenue Analytics Charts */}
      {adminAnalytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Monthly Revenue Trend */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('revenue')} Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adminAnalytics.revenue_by_month || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => formatMonthDisplay(value)}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCompactNumber(value, '')}
                    />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrencyDetailed(value), 'Revenue']}
                      labelFormatter={(label) => formatMonthDisplay(label)}
                    />
                    <Bar dataKey="revenue" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Revenue Sources (Partners/Brands) */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Revenue Sources (Brands)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adminAnalytics.revenue_by_partner?.slice(0, 5) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="partner_name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Revenue Generated']}
                    />
                    <Bar dataKey="total_revenue" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Share by Merchant */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Merchant Revenue Shares
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={adminAnalytics.revenue_by_merchant?.slice(0, 5) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="merchant_name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Revenue Share']}
                    />
                    <Bar dataKey="total_revenue" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Ad Performance */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Performing Ads
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ad Title</TableCell>
                      <TableCell align="right">Views</TableCell>
                      <TableCell align="right">Revenue Generated</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(adminAnalytics.top_performing_ads?.slice(0, 5) || []).map((ad, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2">
                            {ad.title || `Ad ${ad.ad_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatNumber(ad.views)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="success.main">
                            {formatCurrency(ad.revenue)}
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
                Advertisement States
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAdStateData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill={COLORS[0]}>
                    {getAdStateData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity Tables */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent {t('users')}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      <TableCell>Created</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.slice(0, 5).map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <Chip label={user.role} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={user.status || 'active'} 
                            color={user.status === 'active' ? 'success' : 'default'}
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
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

export default RealAdminDashboard;
