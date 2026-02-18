import React, { useState, useEffect, useCallback } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  Assessment as AnalyticsIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Visibility as ViewsIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Store as MerchantIcon,
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
import type { Advertisement as SystemAdvertisement } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface PartnerStats {
  totalAds: number;
  publishedAds: number;
  draftAds: number;
  rejectedAds: number;
  assignedMerchants: number;
}

interface PartnerAnalytics {
  total_advertising_spend: number;
  total_ads_published: number;
  total_merchants: number;
  spend_by_month: MonthlySpend[];
  spend_by_merchant: MerchantSpend[];
  ad_performance: AdPerformance[];
  fee_rate: number;
  currency: string;
}

interface MonthlySpend {
  month: string;
  spend: number;
  ads_count: number;
}

interface MerchantSpend {
  merchant_id: string;
  merchant_name: string;
  total_spend: number;
  ads_count: number;
}

interface AdPerformance {
  ad_id: string;
  title: string;
  views: number;
  cost: number;
}

interface MerchantAdvertisement {
  id: string;
  merchant_id: string;
  advertisement_id: string;
  created_at: string;
}

const RealPartnerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real data states
  const [stats, setStats] = useState<PartnerStats>({
    totalAds: 0,
    publishedAds: 0,
    draftAds: 0,
    rejectedAds: 0,
    assignedMerchants: 0,
  });
  
  const [advertisements, setAdvertisements] = useState<SystemAdvertisement[]>([]);
  const [merchantAssignments, setMerchantAssignments] = useState<MerchantAdvertisement[]>([]);
  
  // Revenue data states
  const [partnerAnalytics, setPartnerAnalytics] = useState<PartnerAnalytics | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load advertisements (filter by partner if needed)
      const adsResponse = await apiService.getAdvertisements().catch(() => ({ data: [] }));
      const adsData = adsResponse.data || [];
      
      // Filter ads by current partner if user has partner role
      const partnerAds = user?.role === 'partner' 
        ? adsData.filter((ad: SystemAdvertisement) => ad.partner_id === user.id)
        : adsData;
      
      setAdvertisements(partnerAds);
      
      // Try to get merchant assignments
      let assignments: MerchantAdvertisement[] = [];
      try {
        const merchantAdsResponse = await apiService.get('/merchants/ads');
        assignments = merchantAdsResponse.data || [];
        setMerchantAssignments(assignments);
      } catch (err) {
        // If endpoint doesn't exist, use empty array
        setMerchantAssignments([]);
      }
      
      // Calculate stats from real data
      const publishedCount = partnerAds.filter((ad: SystemAdvertisement) => 
        ad.state === 'PUBLISHED'
      ).length;
      
      const draftCount = partnerAds.filter((ad: SystemAdvertisement) => 
        ad.state === 'DRAFT'
      ).length;
      
      const rejectedCount = partnerAds.filter((ad: SystemAdvertisement) => 
        ad.state === 'REJECTED'
      ).length;
      
      // Count unique merchants assigned to this partner's ads
      const assignedMerchants = new Set(
        assignments
          .filter(ma => partnerAds.some(ad => ad.id === ma.advertisement_id))
          .map(ma => ma.merchant_id)
      ).size;
      
      setStats({
        totalAds: partnerAds.length,
        publishedAds: publishedCount,
        draftAds: draftCount,
        rejectedAds: rejectedCount,
        assignedMerchants: assignedMerchants,
      });
      
    } catch (err: any) {
      console.error('Error loading partner dashboard:', err);
      setError(t('failedToLoadData'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  const loadRevenueData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Load partner analytics (advertising spend data)
      const analyticsResponse = await apiService.getPartnerAnalytics(selectedYear, selectedMonth);
      if (analyticsResponse.analytics) {
        setPartnerAnalytics(analyticsResponse.analytics);
      }
    } catch (err: any) {
      console.warn('Failed to load partner analytics:', err.response?.data?.message);
      setPartnerAnalytics(null);
    }
  }, [user?.id, selectedYear, selectedMonth]);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id, loadDashboardData]);

  useEffect(() => {
    if (user?.id) {
      loadRevenueData();
    }
  }, [user?.id, loadRevenueData]);

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

  const getCategoryData = () => {
    const categoryCounts = advertisements.reduce((acc, ad) => {
      const category = ad.categories || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCounts).map(([category, count], index) => ({
      name: category,
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
            <CampaignIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            {t('partnerDashboard')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {t('manage')} your advertising {t('campaigns')}
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
        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary">
                    {formatNumber(stats.totalAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total {t('advertisements')}
                  </Typography>
                </Box>
                <CampaignIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {formatNumber(stats.publishedAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Published
                  </Typography>
                </Box>
                <ViewsIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {formatNumber(stats.draftAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Draft
                  </Typography>
                </Box>
                <EditIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="error.main">
                    {formatNumber(stats.rejectedAds)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Rejected
                  </Typography>
                </Box>
                <CampaignIcon color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={2.4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatNumber(stats.assignedMerchants)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Connected {t('merchants')}
                  </Typography>
                </Box>
                <AnalyticsIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Advertising Spend Section */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center' }}>
        <MoneyIcon sx={{ mr: 1 }} />
        Advertising Spend {t('analytics')}
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

      {/* Advertising Spend Summary Cards */}
      {partnerAnalytics ? (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" color="primary.main">
                      {formatCurrency(partnerAnalytics.total_advertising_spend || 0, partnerAnalytics.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Advertising Spend
                    </Typography>
                  </Box>
                  <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h5" color="success.main">
                      {formatCurrency(partnerAnalytics.fee_rate || 0, partnerAnalytics.currency)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Rate per Ad
                    </Typography>
                  </Box>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
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
                      {formatNumber(partnerAnalytics.total_merchants)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Display Locations
                    </Typography>
                  </Box>
                  <MerchantIcon color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          No advertising spend data available for {selectedMonth}/{selectedYear}.
          <Typography variant="body2" component="span" sx={{ ml: 1 }}>
            Contact admin to generate revenue data for this period.
          </Typography>
        </Alert>
      )}

      {/* Advertising Analytics Charts */}
      {partnerAnalytics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Monthly Spend Trend */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Monthly Advertising Spend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={partnerAnalytics.spend_by_month || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => formatMonthDisplay(value)}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCompactNumber(value, '')}
                    />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrencyDetailed(value), 'Spend']}
                      labelFormatter={(label) => formatMonthDisplay(label)}
                    />
                    <Bar dataKey="spend" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Spend by Display Location */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Spend by Display Location
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={partnerAnalytics.spend_by_merchant?.slice(0, 5) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="merchant_name" />
                    <YAxis />
                    <RechartsTooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Spend']}
                    />
                    <Bar dataKey="total_spend" fill="#00C49F" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Ad Performance Table */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Advertisement Performance
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ad Title</TableCell>
                      <TableCell align="right">Views</TableCell>
                      <TableCell align="right">Advertising Cost</TableCell>
                      <TableCell align="right">Cost per View</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(partnerAnalytics.ad_performance?.slice(0, 10) || []).map((ad, index) => (
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
                          <Typography variant="body2" color="primary.main">
                            {formatCurrency(ad.cost)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="info.main">
                            {ad.views > 0 ? formatCurrency(ad.cost / ad.views) : '-'}
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
                Advertisement States
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getAdStateData()}
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
                    {getAdStateData().map((entry, index) => (
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
                Categories
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getCategoryData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill={COLORS[0]}>
                    {getCategoryData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

    </Box>
  );
};

export default RealPartnerDashboard;
