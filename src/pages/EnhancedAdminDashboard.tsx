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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Badge,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Visibility as ViewIcon,
  AttachMoney as MoneyIcon,
  Receipt as TransactionIcon,
  Business as BusinessIcon,
  AccountBalance as SettlementIcon,
  Refresh as RefreshIcon,
  PlayArrow as GenerateIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Analytics as AnalyticsIcon,
  People as PartnersIcon,
  Store as MerchantsIcon,
  Campaign as AdsIcon,
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
  Legend,
} from 'recharts';
import { apiService } from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface RevenueGeneration {
  id: number;
  year: number;
  month: number;
  status: string;
  total_records: number;
  processed_records: number;
  failed_records: number;
  started_at: string;
  completed_at?: string;
  error?: string;
}

interface RevenueSummary {
  year: number;
  month: number;
  total_partners: number;
  total_merchants: number;
  total_ads_published: number;
  total_partner_fees: number;
  total_glassbox_revenue: number;
  total_sales_revenue: number;
  total_broker_revenue: number;
  total_merchant_revenue: number;
  currency: string;
}

const EnhancedAdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Data states
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [revenueGenerations, setRevenueGenerations] = useState<RevenueGeneration[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedYear, selectedMonth]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load pre-calculated revenue data
      try {
        const revenueResponse = await apiService.getPreCalculatedRevenueData(selectedYear, selectedMonth);
        if (revenueResponse.summary) {
          setRevenueSummary(revenueResponse.summary);
        }
      } catch (revenueErr: any) {
        console.warn('No revenue data found for selected period:', revenueErr.response?.data?.message);
        setRevenueSummary(null);
      }
      
      // Load generation history
      const generationResponse = await apiService.getRevenueGenerationHistory(10);
      setRevenueGenerations(generationResponse.data || []);
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
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

  const handleGenerateRevenue = async () => {
    try {
      await apiService.generateRevenue({
        year: selectedYear,
        month: selectedMonth,
        force_regenerate: false,
      });
      
      // Refresh data after generation
      setTimeout(() => {
        loadDashboardData();
      }, 2000);
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate revenue');
    }
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

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <SuccessIcon color="success" />;
      case 'RUNNING':
      case 'PENDING':
        return <PendingIcon color="warning" />;
      case 'FAILED':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'success';
      case 'RUNNING':
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
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

  // Prepare chart data
  const entityBreakdownData = revenueSummary ? [
    { name: 'GLASSBOX', value: revenueSummary.total_glassbox_revenue, color: COLORS[0] },
    { name: 'SALES', value: revenueSummary.total_sales_revenue, color: COLORS[1] },
    { name: 'BROKER', value: revenueSummary.total_broker_revenue, color: COLORS[2] },
    { name: 'MERCHANT', value: revenueSummary.total_merchant_revenue, color: COLORS[3] },
  ] : [];

  const latestGeneration = revenueGenerations.find(gen => 
    gen.year === selectedYear && gen.month === selectedMonth
  );

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
            Admin Dashboard / Dasbor Admin
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Revenue analytics and system overview / Analitik pendapatan dan gambaran sistem
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

      {/* Revenue Generation Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Revenue Generation Status / Status Generasi Pendapatan
            </Typography>
            <Button
              variant="contained"
              startIcon={<GenerateIcon />}
              onClick={handleGenerateRevenue}
              size="small"
            >
              Generate Revenue / Buat Pendapatan
            </Button>
          </Box>
          
          {latestGeneration ? (
            <Box display="flex" alignItems="center" gap={2}>
              {getStatusIcon(latestGeneration.status)}
              <Box flex={1}>
                <Typography variant="body2">
                  Period {selectedYear}-{selectedMonth.toString().padStart(2, '0')}: 
                  <Chip 
                    label={latestGeneration.status}
                    color={getStatusColor(latestGeneration.status) as any}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                {latestGeneration.status === 'RUNNING' && (
                  <LinearProgress 
                    variant="determinate" 
                    value={(latestGeneration.processed_records / latestGeneration.total_records) * 100}
                    sx={{ mt: 1 }}
                  />
                )}
                <Typography variant="caption" color="textSecondary">
                  {latestGeneration.processed_records} / {latestGeneration.total_records} records processed
                </Typography>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">
              No revenue data generated for {selectedYear}-{selectedMonth.toString().padStart(2, '0')}. 
              Click "Generate Revenue" to create data for this period.
            </Alert>
          )}
        </CardContent>
      </Card>

      {revenueSummary ? (
        <>
          {/* Key Metrics Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4">
                        {formatCurrency(revenueSummary.total_partner_fees, revenueSummary.currency)}
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
                        {formatNumber(revenueSummary.total_ads_published)}
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
                        {formatNumber(revenueSummary.total_partners)}
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
                        {formatNumber(revenueSummary.total_merchants)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Active Merchants / Merchant Aktif
                      </Typography>
                    </Box>
                    <MerchantsIcon color="info" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Revenue Breakdown Chart */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Distribution by Entity / Distribusi Pendapatan per Entitas
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={entityBreakdownData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${formatCurrency(value || 0, revenueSummary.currency)} (${((percent || 0) * 100).toFixed(1)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {entityBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [formatCurrency(value, revenueSummary.currency), 'Amount']} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue Breakdown Details / Detail Rincian Pendapatan
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Entity / Entitas</TableCell>
                        <TableCell align="right">Amount / Jumlah</TableCell>
                        <TableCell align="right">Share / Bagian</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {entityBreakdownData.map((entity) => (
                        <TableRow key={entity.name}>
                          <TableCell>
                            <Chip label={entity.name} size="small" />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {formatCurrency(entity.value, revenueSummary.currency)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {((entity.value / revenueSummary.total_partner_fees) * 100).toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      ) : (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body1">
            <strong>No Revenue Data Available / Tidak Ada Data Pendapatan</strong>
          </Typography>
          <Typography variant="body2">
            No pre-calculated revenue data found for {selectedYear}-{selectedMonth.toString().padStart(2, '0')}. 
            Please generate revenue data for this period first.
          </Typography>
          <Typography variant="body2">
            Tidak ditemukan data pendapatan yang sudah dihitung untuk periode {selectedYear}-{selectedMonth.toString().padStart(2, '0')}. 
            Silakan buat data pendapatan untuk periode ini terlebih dahulu.
          </Typography>
        </Alert>
      )}

      {/* Generation History */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Revenue Generations / Generasi Pendapatan Terkini
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Period / Periode</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Records / Data</TableCell>
                  <TableCell align="right">Success / Berhasil</TableCell>
                  <TableCell align="right">Failed / Gagal</TableCell>
                  <TableCell>Generated At / Dibuat Pada</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {revenueGenerations.slice(0, 5).map((gen) => (
                  <TableRow key={gen.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {gen.year}-{gen.month.toString().padStart(2, '0')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(gen.status)}
                        label={gen.status}
                        color={getStatusColor(gen.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{formatNumber(gen.total_records)}</TableCell>
                    <TableCell align="right">{formatNumber(gen.processed_records)}</TableCell>
                    <TableCell align="right">
                      {gen.failed_records > 0 ? (
                        <Typography variant="body2" color="error">
                          {formatNumber(gen.failed_records)}
                        </Typography>
                      ) : (
                        formatNumber(gen.failed_records)
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(gen.started_at).toLocaleString('id-ID')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {revenueGenerations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="textSecondary">
                        No generation history found / Tidak ada riwayat generasi
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnhancedAdminDashboard;
