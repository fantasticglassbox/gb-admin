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
  Store as StoreIcon,
  Tv as TvIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { VenuePartnerDashboard as VenuePartnerDashboardData, Settlement } from '../types';
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

const VenuePartnerDashboard: React.FC = () => {
  const [data, setData] = useState<VenuePartnerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiService.getVenuePartnerDashboard();
        setData(d);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load venue partner dashboard');
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
        Venue Partner Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <KpiCard
            label="Outlets"
            value={data.outlets_total}
            icon={<StoreIcon />}
            helper={`${data.outlets_active} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <KpiCard
            label="Devices"
            value={data.devices_total}
            icon={<TvIcon />}
            helper={`${data.devices_active} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Approval Queue"
            value={data.approvals_pending}
            icon={<CampaignIcon />}
            helper={`${data.approvals_approved} approved ads currently airing`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
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

export default VenuePartnerDashboard;
