import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
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
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  Receipt as TransactionIcon,
  DeviceHub as DeviceIcon,
  Campaign as AdIcon,
  Schedule as PendingIcon,
  CheckCircle as ProcessedIcon,
  AccountBalance as SettledIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { MerchantDashboardData } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCompactNumber, formatDateShort, formatCurrencyDetailed } from '../utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const MerchantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<MerchantDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getMerchantDashboard(String(user.id));
      setDashboardData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: dashboardData?.currency || 'USD',
    }).format(amount / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatGrowth = (growth: number) => {
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'success.main' : 'error.main';
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={loadDashboardData}>
          Retry
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  if (!dashboardData) {
    return null;
  }

  // Prepare chart data
  const revenueByDayData = Object.entries(dashboardData.revenue_by_day).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString(),
    revenue: revenue,
  }));

  const revenueBreakdownData = [
    { name: 'Pending', value: dashboardData.pending_revenue, color: '#FF8042' },
    { name: 'Processed', value: dashboardData.processed_revenue, color: '#00C49F' },
    { name: 'Settled', value: dashboardData.settled_revenue, color: '#0088FE' },
  ];

  const devicePerformanceData = dashboardData.device_performance.map((device, index) => ({
    ...device,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Merchant Dashboard
      </Typography>
      
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Period: {dashboardData.period_start} to {dashboardData.period_end} ({dashboardData.period_days} days)
      </Typography>

      {/* Revenue Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(dashboardData.total_revenue)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mt={1}>
                    {getGrowthIcon(dashboardData.revenue_growth)}
                    <Typography 
                      variant="body2" 
                      color={getGrowthColor(dashboardData.revenue_growth)}
                    >
                      {formatGrowth(dashboardData.revenue_growth)}
                    </Typography>
                  </Box>
                </Box>
                <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Pending Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(dashboardData.pending_revenue)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Awaiting processing
                  </Typography>
                </Box>
                <PendingIcon color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Processed Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(dashboardData.processed_revenue)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Ready for settlement
                  </Typography>
                </Box>
                <ProcessedIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Settled Revenue
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(dashboardData.settled_revenue)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Paid out
                  </Typography>
                </Box>
                <SettledIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Views
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.total_views)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Advertisement displays
                  </Typography>
                </Box>
                <ViewIcon color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Active Devices
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.active_devices)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Display devices
                  </Typography>
                </Box>
                <DeviceIcon color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Unique Ads
                  </Typography>
                  <Typography variant="h4">
                    {formatNumber(dashboardData.unique_advertisements)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Different advertisements
                  </Typography>
                </Box>
                <AdIcon color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Quality Score
                  </Typography>
                  <Typography variant="h4">
                    {(dashboardData.average_quality_score * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary" mt={1}>
                    Average view quality
                  </Typography>
                </Box>
                <ViewIcon color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Daily Revenue Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByDayData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => formatDateShort(value)}
                />
                <YAxis 
                  tickFormatter={(value) => formatCompactNumber(value, '')} 
                />
                <RechartsTooltip 
                  formatter={(value) => [formatCurrencyDetailed(value as number), 'Revenue']}
                  labelFormatter={(label) => formatDateShort(label)}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Revenue Breakdown
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Device Performance and Top Ads */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Device Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={devicePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="device_name" />
                <YAxis 
                  tickFormatter={(value) => formatCompactNumber(value, '')} 
                />
                <RechartsTooltip 
                  formatter={(value) => [formatCurrencyDetailed(value as number), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#8884d8">
                  {devicePerformanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Performing Advertisements
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Advertisement</TableCell>
                    <TableCell align="right">Views</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Quality</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dashboardData.top_advertisements.slice(0, 5).map((ad) => (
                    <TableRow key={ad.advertisement_id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {ad.advertisement_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatNumber(ad.views)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(ad.revenue)}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(ad.average_quality * 100).toFixed(0)}%`}
                          color={ad.average_quality > 0.8 ? 'success' : ad.average_quality > 0.6 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Device Details Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Device Performance Details
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell align="right">Views</TableCell>
                <TableCell align="right">Revenue</TableCell>
                <TableCell align="right">Avg Duration</TableCell>
                <TableCell align="right">Quality Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardData.device_performance.map((device) => (
                <TableRow key={device.device_id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {device.device_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {formatNumber(device.views)}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(device.revenue)}
                  </TableCell>
                  <TableCell align="right">
                    {(device.total_duration / device.views).toFixed(1)}s
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${(device.average_quality * 100).toFixed(0)}%`}
                      color={device.average_quality > 0.8 ? 'success' : device.average_quality > 0.6 ? 'warning' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Summary Stats */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item>
          <Chip 
            label={`${formatNumber(dashboardData.total_transactions)} Transactions`}
            color="info"
            variant="outlined"
          />
        </Grid>
        <Grid item>
          <Chip 
            label={`Avg Display: ${dashboardData.average_display_duration.toFixed(1)}s`}
            color="primary"
            variant="outlined"
          />
        </Grid>
        <Grid item>
          <Chip 
            label={`Avg Revenue/View: ${formatCurrency(dashboardData.average_revenue_per_view)}`}
            color="success"
            variant="outlined"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default MerchantDashboard;
