import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as GenerateIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface RevenueGenerationRecord {
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
  generated_by: string;
  created_at: string;
}

const RevenueGeneration: React.FC = () => {
  const { t } = useTranslation();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [forceRegenerate, setForceRegenerate] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generations, setGenerations] = useState<RevenueGenerationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    loadGenerationHistory();
  }, []);

  const loadGenerationHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await apiService.getRevenueGenerationHistory(20);
      setGenerations(response.data || []);
    } catch (err: any) {
      console.error('Error loading generation history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiService.generateRevenue({
        year,
        month,
        force_regenerate: forceRegenerate,
      });

      setSuccess(`Revenue generated successfully for ${year}-${month.toString().padStart(2, '0')}!`);
      setConfirmDialogOpen(false);
      await loadGenerationHistory();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate revenue data');
    } finally {
      setLoading(false);
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
      case 'COMPLETED_WITH_ERRORS':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return <SuccessIcon />;
      case 'RUNNING':
      case 'PENDING':
        return <CircularProgress size={16} />;
      case 'FAILED':
        return <ErrorIcon />;
      case 'COMPLETED_WITH_ERRORS':
        return <WarningIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('revenue')} Generation
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Generate pre-calculated monthly revenue data for faster reporting
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Generation Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('generate')} {t('revenue')} Data
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Year</InputLabel>
                    <Select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      label="Year"
                    >
                      {generateYearOptions().map((y) => (
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Month</InputLabel>
                    <Select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      label="Month"
                    >
                      {generateMonthOptions().map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <FormControlLabel
                control={
                  <Switch
                    checked={forceRegenerate}
                    onChange={(e) => setForceRegenerate(e.target.checked)}
                  />
                }
                label="Force Regenerate"
                sx={{ mt: 2 }}
              />

              <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 1 }}>
                Force regenerate will overwrite existing data for this period
              </Typography>

              <Button
                variant="contained"
                startIcon={<GenerateIcon />}
                onClick={() => setConfirmDialogOpen(true)}
                disabled={loading}
                fullWidth
                sx={{ mt: 3 }}
              >
                {loading ? 'Generating...' : t('generate') + ' ' + t('revenue')}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generation Statistics
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {generations.filter(g => g.status === 'COMPLETED').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {t('completed')}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {generations.filter(g => g.status === 'FAILED').length}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {t('failed')}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadGenerationHistory}
                disabled={historyLoading}
                fullWidth
                sx={{ mt: 3 }}
              >
                {t('refresh')} History
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Generation History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Generation History
                </Typography>
                <IconButton onClick={loadGenerationHistory} disabled={historyLoading}>
                  <HistoryIcon />
                </IconButton>
              </Box>

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Period</TableCell>
                      <TableCell>{t('status')}</TableCell>
                      <TableCell align="right">Records</TableCell>
                      <TableCell align="right">Processed</TableCell>
                      <TableCell align="right">{t('failed')}</TableCell>
                      <TableCell>Started</TableCell>
                      <TableCell>{t('completed')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : generations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="textSecondary">
                            {t('noDataFound')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      generations.map((gen) => (
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
                          <TableCell align="right">{gen.total_records}</TableCell>
                          <TableCell align="right">{gen.processed_records}</TableCell>
                          <TableCell align="right">
                            {gen.failed_records > 0 ? (
                              <Typography variant="body2" color="error">
                                {gen.failed_records}
                              </Typography>
                            ) : (
                              gen.failed_records
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDateTime(gen.started_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {gen.completed_at ? (
                              <Typography variant="body2">
                                {formatDateTime(gen.completed_at)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>
          {t('confirm')} {t('revenue')} Generation
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to generate revenue data for {year}-{month.toString().padStart(2, '0')}?
          </Typography>
          {forceRegenerate && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> This will overwrite existing data for this period.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleGenerate} 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <GenerateIcon />}
          >
            {loading ? 'Generating...' : t('generate')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RevenueGeneration;
