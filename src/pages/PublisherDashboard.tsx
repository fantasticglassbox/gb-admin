import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Paper,
} from '@mui/material';
import {
  Campaign as CampaignIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { PublisherDashboard as PublisherDashboardData, Settlement } from '../types';
import { formatCurrencyDetailed } from '../utils/formatters';

const KpiCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  helper?: string;
}> = ({ label, value, icon, helper }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2}>
        <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        <Box>
          <Typography variant="caption" color="textSecondary">
            {label}
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {value}
          </Typography>
          {helper && (
            <Typography variant="caption" color="textSecondary">
              {helper}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const statusChipColor = (status: string): 'default' | 'warning' | 'info' | 'success' | 'error' => {
  switch (status) {
    case 'DRAFT':
      return 'warning';
    case 'LOCKED':
      return 'info';
    case 'PAID':
      return 'success';
    case 'VOID':
      return 'error';
    default:
      return 'default';
  }
};

const formatPeriod = (start: string, end: string) => {
  const s = new Date(start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const e = new Date(end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${s} – ${e}`;
};

const PublisherDashboard: React.FC = () => {
  const [data, setData] = useState<PublisherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiService.getPublisherDashboard();
        setData(d);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load publisher dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <Alert severity="error">{error || 'No data'}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Publisher Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Advertisers"
            value={data.advertisers_total}
            icon={<CampaignIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Active Approvals"
            value={data.approvals_approved}
            icon={<CampaignIcon />}
            helper={`${data.approvals_pending} awaiting venue decision · ${data.approvals_rejected} rejected`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Pending Payout"
            value={formatCurrencyDetailed(data.pending_payout_idr)}
            icon={<ScheduleIcon />}
            helper={`${data.settlements_draft} draft + ${data.settlements_locked} locked`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Paid This Month"
            value={formatCurrencyDetailed(data.paid_this_month_idr)}
            icon={<MoneyIcon />}
            helper={`${data.settlements_paid} settlements paid (lifetime)`}
          />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent Settlements
        </Typography>
        {data.recent_settlements.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No settlements yet.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Gross</TableCell>
                <TableCell align="right">Split %</TableCell>
                <TableCell align="right">Net (after PPh 23)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recent_settlements.map((s: Settlement) => (
                <TableRow key={s.id} hover>
                  <TableCell>{formatPeriod(s.period_start, s.period_end)}</TableCell>
                  <TableCell>
                    <Chip label={s.status} color={statusChipColor(s.status)} size="small" />
                  </TableCell>
                  <TableCell align="right">{formatCurrencyDetailed(s.source_gross_idr)}</TableCell>
                  <TableCell align="right">{s.split_pct}%</TableCell>
                  <TableCell align="right">{formatCurrencyDetailed(s.net_idr)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};

export default PublisherDashboard;
