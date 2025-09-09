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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as MoneyIcon,
  Campaign as AdsIcon,
  Refresh as RefreshIcon,
  Store as MerchantsIcon,
  Analytics as AnalyticsIcon,
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
  LineChart,
  Line,
} from 'recharts';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatCompactNumber, formatCurrencyDetailed } from '../utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface PartnerRevenueData {
  merchant_id: string;
  merchant_name: string;
  total_ads_published: number;
  partner_fee_rate: number;
  total_partner_fee: number;
  currency: string;
}

const EnhancedPartnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Data states
  const [partnerRevenue, setPartnerRevenue] = useState<PartnerRevenueData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user, selectedYear, selectedMonth]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load partner-specific revenue data
      try {
        const revenueResponse = await apiService.getPreCalculatedRevenueData(selectedYear, selectedMonth);
        
        // Filter data for this partner
        const partnerData = revenueResponse.data?.filter((item: any) => 
          item.partner_id === user.id
        ) || [];
        
        setPartnerRevenue(partnerData);
      } catch (revenueErr: any) {
        console.warn('No revenue data found for selected period:', revenueErr.response?.data?.message);
        setPartnerRevenue([]);
      }
      
    } catch (err: any) {
      console.error('Error loading partner dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number, currency: string = 'IDR') => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= 2020; i--) {
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

  // Calculate totals
  const totalRevenue = partnerRevenue.reduce((sum, item) => sum + item.total_partner_fee, 0);
  const totalAds = partnerRevenue.reduce((sum, item) => sum + item.total_ads_published, 0);
  const totalMerchants = partnerRevenue.length;
  const averageRevenuePerAd = totalAds > 0 ? totalRevenue / totalAds : 0;
  const currency = partnerRevenue[0]?.currency || 'IDR';

  // Prepare chart data
  const merchantRevenueData = partnerRevenue.map(item => ({
    name: item.merchant_name,
    revenue: item.total_partner_fee,
    ads: item.total_ads_published,
  }));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Partner Dashboard / Dasbor Partner
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your revenue performance and analytics / Kinerja dan analitik pendapatan Anda
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Year / Tahun</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              label="Year / Tahun"
            >
              {generateYearOptions().map((year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Month / Bulan</InputLabel>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              label="Month / Bulan"
            >
              {generateMonthOptions().map((month) => (
                <MenuItem key={month.value} value={month.value}>
                  {month.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Tooltip title="Refresh Data / Segarkan Data">
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

      {partnerRevenue.length > 0 ? (
        <>
          {/* Key Metrics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4">
                        {formatCurrency(totalRevenue, currency)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Revenue / Total Pendapatan
                      </Typography>
                    </Box>
                    <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4">
                        {formatNumber(totalAds)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Published Ads / Iklan Dipublikasi
                      </Typography>
                    </Box>
                    <AdsIcon color="secondary" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4">
                        {formatNumber(totalMerchants)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Active Merchants / Merchant Aktif
                      </Typography>
                    </Box>
                    <MerchantsIcon color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4">
                        {formatCurrency(averageRevenuePerAd, currency)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Avg Revenue/Ad / Rata-rata per Iklan
                      </Typography>
                    </Box>
                    <AnalyticsIcon color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Revenue by Merchant Chart */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue by Merchant / Pendapatan per Merchant
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={merchantRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => formatCompactNumber(value, '')}
                      />
                      <RechartsTooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatCurrencyDetailed(value) : formatNumber(value),
                          name === 'revenue' ? 'Revenue' : 'Ads'
                        ]} 
                      />
                      <Bar dataKey="revenue" fill={COLORS[0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Summary / Ringkasan Kinerja
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Top Performing Merchant / Merchant Terbaik:
                    </Typography>
                    {merchantRevenueData.length > 0 && (
                      <Typography variant="body1" fontWeight="medium">
                        {merchantRevenueData.sort((a, b) => b.revenue - a.revenue)[0].name}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Best Revenue / Pendapatan Terbaik:
                    </Typography>
                    {merchantRevenueData.length > 0 && (
                      <Typography variant="body1" fontWeight="medium">
                        {formatCurrency(Math.max(...merchantRevenueData.map(m => m.revenue)), currency)}
                      </Typography>
                    )}

                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Total Ads Published / Total Iklan Dipublikasi:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatNumber(totalAds)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Revenue Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Revenue Breakdown / Rincian Detail Pendapatan
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Merchant</TableCell>
                      <TableCell align="right">Published Ads / Iklan Dipublikasi</TableCell>
                      <TableCell align="right">Fee Rate / Tarif</TableCell>
                      <TableCell align="right">Total Revenue / Total Pendapatan</TableCell>
                      <TableCell align="right">Revenue per Ad / Pendapatan per Iklan</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {partnerRevenue.map((item) => (
                      <TableRow key={item.merchant_id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.merchant_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(item.total_ads_published)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.partner_fee_rate, item.currency)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="primary">
                            {formatCurrency(item.total_partner_fee, item.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(
                            item.total_ads_published > 0 ? item.total_partner_fee / item.total_ads_published : 0, 
                            item.currency
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert severity="info">
          <Typography variant="body1">
            <strong>No Revenue Data Available / Tidak Ada Data Pendapatan</strong>
          </Typography>
          <Typography variant="body2">
            No revenue data found for {selectedYear}-{selectedMonth.toString().padStart(2, '0')}. 
            Please contact the administrator to generate revenue data for this period.
          </Typography>
          <Typography variant="body2">
            Tidak ditemukan data pendapatan untuk periode {selectedYear}-{selectedMonth.toString().padStart(2, '0')}. 
            Silakan hubungi administrator untuk membuat data pendapatan untuk periode ini.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedPartnerDashboard;
