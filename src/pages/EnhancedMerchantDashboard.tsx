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
  Business as PartnersIcon,
  Analytics as AnalyticsIcon,
  Percent as ShareIcon,
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
import { formatCompactNumber, formatMonthShort, formatCurrencyDetailed } from '../utils/formatters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface MerchantRevenueData {
  partner_id: string;
  partner_name: string;
  total_ads_published: number;
  total_partner_fee: number;
  merchant_share: number;
  currency: string;
}

const EnhancedMerchantDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Data states
  const [merchantRevenue, setMerchantRevenue] = useState<MerchantRevenueData[]>([]);
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
      
      // Load merchant-specific revenue data
      try {
        const revenueResponse = await apiService.getPreCalculatedRevenueData(selectedYear, selectedMonth);
        
        // Filter data for this merchant
        const merchantData = revenueResponse.data?.filter((item: any) => 
          item.merchant_id === user.id
        ) || [];
        
        setMerchantRevenue(merchantData);
      } catch (revenueErr: any) {
        console.warn('No revenue data found for selected period:', revenueErr.response?.data?.message);
        setMerchantRevenue([]);
      }
      
    } catch (err: any) {
      console.error('Error loading merchant dashboard data:', err);
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
  const totalRevenue = merchantRevenue.reduce((sum, item) => sum + item.merchant_share, 0);
  const totalGrossRevenue = merchantRevenue.reduce((sum, item) => sum + item.total_partner_fee, 0);
  const totalAds = merchantRevenue.reduce((sum, item) => sum + item.total_ads_published, 0);
  const totalPartners = merchantRevenue.length;
  const sharePercentage = totalGrossRevenue > 0 ? (totalRevenue / totalGrossRevenue) * 100 : 0;
  const currency = merchantRevenue[0]?.currency || 'IDR';

  // Prepare chart data
  const partnerRevenueData = merchantRevenue.map(item => ({
    name: item.partner_name,
    grossRevenue: item.total_partner_fee,
    merchantShare: item.merchant_share,
    ads: item.total_ads_published,
  }));

  const revenueBreakdownData = [
    { name: 'Merchant Share', value: totalRevenue, color: COLORS[0] },
    { name: 'Other Shares', value: totalGrossRevenue - totalRevenue, color: COLORS[1] },
  ];

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
            Merchant Dashboard / Dasbor Merchant
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Your revenue share and performance analytics / Bagian pendapatan dan analitik kinerja Anda
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

      {merchantRevenue.length > 0 ? (
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
                        Your Revenue Share / Bagian Pendapatan Anda
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
                        Ads Displayed / Iklan Ditampilkan
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
                        {formatNumber(totalPartners)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Active Partners / Partner Aktif
                      </Typography>
                    </Box>
                    <PartnersIcon color="success" sx={{ fontSize: 40 }} />
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
                        {sharePercentage.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Revenue Share / Bagian Pendapatan
                      </Typography>
                    </Box>
                    <ShareIcon color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Revenue Analysis Charts */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue by Partner / Pendapatan per Partner
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={partnerRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => formatCompactNumber(value, '')}
                      />
                      <RechartsTooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrencyDetailed(value),
                          name === 'grossRevenue' ? 'Gross Revenue' : 'Your Share'
                        ]} 
                      />
                      <Bar dataKey="grossRevenue" fill={COLORS[1]} name="Gross Revenue" />
                      <Bar dataKey="merchantShare" fill={COLORS[0]} name="Your Share" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Share Breakdown / Rincian Bagian Pendapatan
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={revenueBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value, currency), 'Amount']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Performance Summary */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Summary / Ringkasan Kinerja
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Top Partner by Revenue / Partner Terbaik berdasarkan Pendapatan:
                    </Typography>
                    {partnerRevenueData.length > 0 && (
                      <Typography variant="body1" fontWeight="medium">
                        {partnerRevenueData.sort((a, b) => b.merchantShare - a.merchantShare)[0].name}
                      </Typography>
                    )}
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Highest Share Amount / Jumlah Bagian Tertinggi:
                    </Typography>
                    {partnerRevenueData.length > 0 && (
                      <Typography variant="body1" fontWeight="medium">
                        {formatCurrency(Math.max(...partnerRevenueData.map(p => p.merchantShare)), currency)}
                      </Typography>
                    )}

                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Average Revenue per Ad / Rata-rata Pendapatan per Iklan:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(totalAds > 0 ? totalRevenue / totalAds : 0, currency)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Insights / Wawasan Pendapatan
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Total Gross Revenue / Total Pendapatan Kotor:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(totalGrossRevenue, currency)}
                    </Typography>
                    
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Your Share Percentage / Persentase Bagian Anda:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium" color="primary">
                      {sharePercentage.toFixed(2)}%
                    </Typography>

                    <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                      Other Entities Share / Bagian Entitas Lain:
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(totalGrossRevenue - totalRevenue, currency)} ({(100 - sharePercentage).toFixed(2)}%)
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
                Detailed Revenue by Partner / Rincian Detail Pendapatan per Partner
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Partner</TableCell>
                      <TableCell align="right">Ads Displayed / Iklan Ditampilkan</TableCell>
                      <TableCell align="right">Gross Revenue / Pendapatan Kotor</TableCell>
                      <TableCell align="right">Your Share / Bagian Anda</TableCell>
                      <TableCell align="right">Share % / % Bagian</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {merchantRevenue.map((item) => (
                      <TableRow key={item.partner_id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.partner_name}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {formatNumber(item.total_ads_published)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.total_partner_fee, item.currency)}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium" color="primary">
                            {formatCurrency(item.merchant_share, item.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${((item.merchant_share / item.total_partner_fee) * 100).toFixed(1)}%`}
                            color="primary"
                            size="small"
                          />
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

export default EnhancedMerchantDashboard;
