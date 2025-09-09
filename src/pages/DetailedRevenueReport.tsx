import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Store as StoreIcon,
  Assessment as ReportIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { apiService } from '../services/api';
import { formatCompactNumber, formatCurrencyDetailed } from '../utils/formatters';

interface DetailedRevenueReportData {
  period: string;
  total_revenue: number;
  total_ads_published: number;
  total_merchants: number;
  revenue_breakdown: RevenueBreakdown[];
  entity_breakdown: { [key: string]: number };
  merchant_summary: MerchantSummary[];
  category_breakdown: CategoryBreakdown[];
}

interface RevenueBreakdown {
  merchant_id: string;
  merchant_name: string;
  total_ads_count: number;
  partner_fee_rate: number;
  business_fees: BusinessFee[];
  total_partner_fee: number;
  net_amount: number;
}

interface BusinessFee {
  entity: string;
  amount: number;
}


interface MerchantSummary {
  merchant_id: string;
  merchant_name: string;
  total_ads: number;
  total_revenue: number;
  net_revenue: number;
}

interface CategoryBreakdown {
  category: string;
  revenue: number;
  ads_count: number;
  percentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1'];

const DetailedRevenueReport: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  
  // Data states
  const [reportData, setReportData] = useState<DetailedRevenueReportData | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);

  useEffect(() => {
    loadRevenueData();
  }, [selectedYear, selectedMonth]);

  const calculateSummaryFromReport = (reportData: DetailedRevenueReportData) => {
    if (!reportData.revenue_breakdown || reportData.revenue_breakdown.length === 0) {
      return {
        total_partner_fees: 0,
        total_business_fees: 0,
        total_net_amount: 0,
      };
    }

    let totalPartnerFees = 0;
    let totalBusinessFees = 0;
    let totalNetAmount = 0;

    reportData.revenue_breakdown.forEach((item: RevenueBreakdown) => {
      // Sum total partner fees
      totalPartnerFees += item.total_partner_fee || 0;
      
      // Sum business fees from each item
      if (item.business_fees) {
        item.business_fees.forEach((fee: any) => {
          totalBusinessFees += fee.amount || 0;
        });
      }
      
      // Sum net amounts
      totalNetAmount += item.net_amount || 0;
    });

    return {
      total_partner_fees: totalPartnerFees,
      total_business_fees: totalBusinessFees,
      total_net_amount: totalNetAmount,
    };
  };

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);

      const detailedReport = await apiService.getDetailedRevenueReport(selectedYear, selectedMonth);
      
      setReportData(detailedReport.data);
      
      // Calculate summary data from the detailed report
      if (detailedReport.data && detailedReport.data.revenue_breakdown) {
        const summary = calculateSummaryFromReport(detailedReport.data);
        setSummaryData(summary);
      } else {
        setSummaryData(null);
      }
    } catch (err: any) {
      console.error('Failed to load revenue data:', err);
      setError(err.response?.data?.message || 'Failed to load revenue data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const filters = {
        year: selectedYear,
        month: selectedMonth,
        format: 'xlsx',
      };

      const response = await apiService.exportRevenueReport(filters);
      
      // Create and download the file
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `detailed-revenue-report-${selectedYear}-${selectedMonth.toString().padStart(2, '0')}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Detailed {t('revenue')} Report
        </Typography>
        <Button
          variant="contained"
          startIcon={<ExportIcon />}
          onClick={handleExportReport}
          disabled={loading}
        >
          {t('export')} Report
        </Button>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError(null)}
          action={
            error.includes('generate revenue data first') ? (
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => window.location.href = '/admin/revenue-generation'}
              >
                Generate Revenue
              </Button>
            ) : null
          }
        >
          {error}
        </Alert>
      )}

      {/* Period Selection */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
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
            <FormControl fullWidth>
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

          <Grid item xs={12} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={loadRevenueData}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {!reportData && !error && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <ReportIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Revenue Data Available
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            No revenue data has been generated for {selectedMonth}/{selectedYear}. 
            Please generate revenue data first to view the detailed report.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/admin/revenue-generation'}
            startIcon={<TrendingUpIcon />}
          >
            Generate Revenue Data
          </Button>
        </Paper>
      )}

      {reportData && (
        <>
          {/* Key Metrics Summary */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h4" color="primary">
                        {formatCurrency(reportData?.total_revenue || 0)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {t('totalRevenue')}
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
                        {formatNumber(reportData?.total_ads_published || 0)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Ads Published
                      </Typography>
                    </Box>
                    <ReportIcon color="secondary" sx={{ fontSize: 40 }} />
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
                        {formatNumber(reportData?.total_merchants || 0)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {t('totalMerchants')}
                      </Typography>
                    </Box>
                    <StoreIcon color="success" sx={{ fontSize: 40 }} />
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
                        {formatCurrency(summaryData?.total_business_fees || 0)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Business Fees
                      </Typography>
                    </Box>
                    <TrendingUpIcon color="warning" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Summary Data */}
          {summaryData && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Period Summary - {reportData?.period || `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="textSecondary">
                      Total Partner Fees
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(summaryData?.total_partner_fees || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="textSecondary">
                      Total Business Fees
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(summaryData?.total_business_fees || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2" color="textSecondary">
                      Net Amount
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(summaryData?.total_net_amount || 0)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Tabs for different views */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
              <Tab label="Entity Breakdown" />
              <Tab label="Merchant Summary" />
              <Tab label="Categories" />
            </Tabs>

            <Box sx={{ p: 3 }}>
              {tabValue === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      {t('revenue')} Distribution by Entity
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(reportData.entity_breakdown || {}).map(([entity, amount]) => ({
                            name: entity,
                            value: amount
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.entries(reportData.entity_breakdown || {}).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [formatCurrency(value), t('revenue')]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Entity Details
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Entity</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(reportData.entity_breakdown || {}).map(([entity, amount]) => (
                          <TableRow key={entity}>
                            <TableCell>
                              <Chip label={entity} size="small" />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(amount)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              )}

              {tabValue === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Merchant {t('performance')}
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportData.merchant_summary || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="merchant_name" />
                      <YAxis 
                        tickFormatter={(value) => formatCompactNumber(value, '')}
                      />
                      <RechartsTooltip formatter={(value: number, name: string) => [
                        formatCurrencyDetailed(value),
                        name === 'total_revenue' ? 'Total Pendapatan' : 'Pendapatan Bersih'
                      ]} />
                      <Legend />
                      <Bar dataKey="total_revenue" fill={COLORS[0]} name={`Total ${t('revenue')}`} />
                      <Bar dataKey="net_revenue" fill={COLORS[1]} name={`Net ${t('revenue')}`} />
                    </BarChart>
                  </ResponsiveContainer>

                  <TableContainer sx={{ mt: 2 }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Merchant</TableCell>
                          <TableCell align="right">Total Ads</TableCell>
                          <TableCell align="right">Total {t('revenue')}</TableCell>
                          <TableCell align="right">Net {t('revenue')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(reportData.merchant_summary || []).map((merchant) => (
                          <TableRow key={merchant.merchant_id}>
                            <TableCell>{merchant.merchant_name}</TableCell>
                            <TableCell align="right">{formatNumber(merchant.total_ads)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(merchant.total_revenue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium" color="primary">
                                {formatCurrency(merchant.net_revenue)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {tabValue === 2 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Category Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={reportData.category_breakdown || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ category, percentage }) => `${category} ${percentage ? percentage.toFixed(1) : 0}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="revenue"
                        >
                          {(reportData.category_breakdown || []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip formatter={(value: number) => [formatCurrency(value), t('revenue')]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Category Details
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Category</TableCell>
                          <TableCell align="right">Ads</TableCell>
                          <TableCell align="right">{t('revenue')}</TableCell>
                          <TableCell align="right">%</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(reportData.category_breakdown || []).map((cat) => (
                          <TableRow key={cat.category}>
                            <TableCell>
                              <Chip label={cat.category} size="small" />
                            </TableCell>
                            <TableCell align="right">{formatNumber(cat.ads_count)}</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="medium">
                                {formatCurrency(cat.revenue)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{cat.percentage ? cat.percentage.toFixed(1) : 0}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>

          {/* Detailed Revenue Breakdown Table */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Revenue Breakdown
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Merchant</TableCell>
                      <TableCell align="right">Ad Count</TableCell>
                      <TableCell align="right">Partner Rate</TableCell>
                      <TableCell align="right">Total Partner Fee</TableCell>
                      <TableCell align="right">Business Fees</TableCell>
                      <TableCell align="right">Net Amount</TableCell>
                      <TableCell align="right">{t('actions')}</TableCell>
                    </TableRow>
                  </TableHead>
            <TableBody>
              {!reportData.revenue_breakdown || reportData.revenue_breakdown.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      {t('noDataFound')} for the selected period
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                reportData.revenue_breakdown.map((item, index) => (
                  <TableRow key={`${item.merchant_id}-${index}`} hover>
                    <TableCell>{item.merchant_name}</TableCell>
                    <TableCell align="right">{formatNumber(item.total_ads_count)}</TableCell>
                    <TableCell align="right">{formatCurrency(item.partner_fee_rate)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(item.total_partner_fee)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box>
                        {(item.business_fees || []).map((fee, feeIndex) => (
                          <Chip
                            key={feeIndex}
                            label={`${fee.entity}: ${formatCurrency(fee.amount)}`}
                            size="small"
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium" color="primary">
                        {formatCurrency(item.net_amount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('view') + ' Details'}>
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default DetailedRevenueReport;
