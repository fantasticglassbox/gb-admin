import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiService } from '../services/api';
import { PublisherAnalytics } from '../types';
import { formatCurrencyDetailed } from '../utils/formatters';

const FUNNEL_COLORS = ['#ed6c02', '#2e7d32', '#d32f2f', '#9e9e9e']; // PROPOSED/APPROVED/REJECTED/REVOKED

const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const fmtIsoDay = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const fmtMonth = (m: string) => {
  const [y, mo] = m.split('-');
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

const KpiCard: React.FC<{ label: string; value: React.ReactNode; helper?: string }> = ({
  label,
  value,
  helper,
}) => (
  <Card>
    <CardContent>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight="bold">
        {value}
      </Typography>
      {helper && (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const PublisherAnalyticsPage: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PublisherAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await apiService.getPublisherAnalytics({ days });
      setData(d);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

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

  const funnelData = [
    { name: 'Proposed', value: data.approvals_funnel.proposed, fill: FUNNEL_COLORS[0] },
    { name: 'Approved', value: data.approvals_funnel.approved, fill: FUNNEL_COLORS[1] },
    { name: 'Rejected', value: data.approvals_funnel.rejected, fill: FUNNEL_COLORS[2] },
    { name: 'Revoked', value: data.approvals_funnel.revoked, fill: FUNNEL_COLORS[3] },
  ];
  const totalApprovals = funnelData.reduce((a, b) => a + b.value, 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Analytics</Typography>
          <Typography variant="body2" color="text.secondary">
            Performance + booking funnel for your campaigns.
          </Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Window</InputLabel>
          <Select value={days} label="Window" onChange={(e) => setDays(Number(e.target.value))}>
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Funnel KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <KpiCard label="Approvals proposed" value={data.approvals_funnel.proposed} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Approved" value={data.approvals_funnel.approved} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Rejected" value={data.approvals_funnel.rejected} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard label="Revoked" value={data.approvals_funnel.revoked} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Approvals weekly trend */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Submissions over time
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={data.approvals_weekly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week_start" tickFormatter={fmtIsoDay} fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} />
                <RTooltip
                  labelFormatter={(v: any) => `Week of ${fmtIsoDay(v)}`}
                  formatter={(v: any) => [v, 'Submissions']}
                />
                <Line type="monotone" dataKey="count" stroke="#1976d2" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Funnel pie */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Approval funnel
            </Typography>
            {totalApprovals === 0 ? (
              <Box display="flex" alignItems="center" justifyContent="center" height="80%">
                <Typography variant="body2" color="text.secondary">
                  No approvals yet
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie data={funnelData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Settlement monthly */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Paid out (net, monthly)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={data.settlement_monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={fmtMonth} fontSize={11} />
                <YAxis tickFormatter={fmtShort} fontSize={11} />
                <RTooltip
                  labelFormatter={fmtMonth}
                  formatter={(v: any) => [formatCurrencyDetailed(Number(v)), 'Paid']}
                />
                <Bar dataKey="amount_idr" fill="#2e7d32" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Playback (empty-state placeholder) */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: 320 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Playback (last {days}d)
            </Typography>
            {data.playback.total_events === 0 ? (
              <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="80%" textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  No playback events yet.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  Devices will start reporting impressions + completions
                  once gb-media is wired up. This panel will populate then.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ pt: 1 }}>
                <Typography variant="h4">{fmtShort(data.playback.total_events)}</Typography>
                <Typography variant="caption" color="text.secondary">total renders</Typography>
                <Box display="flex" gap={1} sx={{ mt: 2 }} flexWrap="wrap">
                  <Chip size="small" label={`Completed: ${data.playback.completed}`} color="success" />
                  <Chip size="small" label={`Partial: ${data.playback.partial}`} color="warning" />
                  <Chip size="small" label={`Errored: ${data.playback.errored}`} color="error" />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  {data.playback.distinct_devices} devices · {data.playback.distinct_ads} ads
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Top venues */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Top venues by submissions
            </Typography>
            {data.top_venues.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No submissions in this window.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Venue</TableCell>
                    <TableCell align="right">Submissions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.top_venues.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.label || r.id.slice(0, 8) + '…'}</TableCell>
                      <TableCell align="right">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* Top advertisers */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Top advertisers (brands) by submissions
            </Typography>
            {data.top_advertisers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No submissions in this window.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Brand</TableCell>
                    <TableCell align="right">Submissions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.top_advertisers.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.label || r.id.slice(0, 8) + '…'}</TableCell>
                      <TableCell align="right">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PublisherAnalyticsPage;
