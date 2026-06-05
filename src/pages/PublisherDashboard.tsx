import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CampaignOutlined as CampaignIcon,
  AttachMoneyOutlined as MoneyIcon,
  HourglassEmptyOutlined as HourglassIcon,
  CheckCircleOutlineOutlined as CheckIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  PublisherDashboard as PublisherDashboardData,
  Settlement,
} from '../types';
import { formatCurrencyDetailed } from '../utils/formatters';
import { glassboxTokens } from '../theme/elegantTheme';

// Time-of-day greeting in Bahasa. The Indonesia warm-modern direction
// leans on a personal greeting + role context to set the tone before
// the dense data appears below.
const greetIndonesian = (): string => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
};

const formatPeriod = (start: string, end: string) => {
  const s = new Date(start).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  });
  const e = new Date(end).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${s} – ${e}`;
};

const statusChipColor = (
  status: string,
): 'default' | 'warning' | 'success' | 'error' | 'info' => {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'LOCKED':
      return 'warning';
    case 'PAID':
      return 'success';
    case 'VOID':
      return 'error';
    default:
      return 'default';
  }
};

// ----- KPI card — Direction C styling -----
//
// Soft icon chip on the left (primary tint or accent tint), label
// above value, optional helper line below. Money values get the
// tabular-num lockup so columns align across cards.

interface KpiProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'primary' | 'accent' | 'success' | 'neutral';
  helper?: React.ReactNode;
  numeric?: boolean;
}

const TONE_BG: Record<NonNullable<KpiProps['tone']>, string> = {
  primary: '#E0F4FF',
  accent: '#FFEDD5',
  success: '#DCFCE7',
  neutral: glassboxTokens.surface.linen2,
};
const TONE_FG: Record<NonNullable<KpiProps['tone']>, string> = {
  primary: '#0773a3',
  accent: '#c2410c',
  success: '#15803d',
  neutral: glassboxTokens.text.coffeeMid,
};

const KpiCard: React.FC<KpiProps> = ({
  label,
  value,
  icon,
  tone = 'neutral',
  helper,
  numeric,
}) => (
  <Paper
    elevation={1}
    sx={{
      p: 2.5,
      display: 'flex',
      gap: 2,
      alignItems: 'flex-start',
      height: '100%',
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 3,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        bgcolor: TONE_BG[tone],
        color: TONE_FG[tone],
        '& svg': { fontSize: 22 },
      }}
    >
      {icon}
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography variant="overline" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          lineHeight: 1.1,
          color: glassboxTokens.text.espresso,
          ...(numeric ? glassboxTokens.tabularNum : {}),
        }}
      >
        {value}
      </Typography>
      {helper && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.75,
            color: glassboxTokens.text.coffeeMid,
          }}
        >
          {helper}
        </Typography>
      )}
    </Box>
  </Paper>
);

const PublisherDashboard: React.FC = () => {
  const { user } = useAuth();
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
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data) {
    return <Alert severity="error">{error || 'No data'}</Alert>;
  }

  const pendingApprovalCount = data.approvals_pending;
  const heroLine =
    pendingApprovalCount > 0
      ? `${pendingApprovalCount} iklan menunggu persetujuan venue`
      : 'Tidak ada yang menunggu persetujuan saat ini';

  return (
    <Box>
      {/* Hero greeting — Direction C anchor. Display type, Bahasa
          greeting + name, then the single most actionable context line
          beneath. */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h1"
          sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}
        >
          {greetIndonesian()},{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {user?.username || 'Publisher'}
          </Box>
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: glassboxTokens.text.coffeeMid, mt: 0.5 }}
        >
          {heroLine}
        </Typography>
      </Box>

      {/* KPI grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Pending payout"
            value={formatCurrencyDetailed(data.pending_payout_idr)}
            icon={<HourglassIcon />}
            tone="accent"
            numeric
            helper={`${data.settlements_draft} draft · ${data.settlements_locked} locked`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Paid this month"
            value={formatCurrencyDetailed(data.paid_this_month_idr)}
            icon={<MoneyIcon />}
            tone="success"
            numeric
            helper={`${data.settlements_paid} settlements paid · lifetime`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Active approvals"
            value={data.approvals_approved}
            icon={<CheckIcon />}
            tone="primary"
            helper={`${data.approvals_pending} awaiting · ${data.approvals_rejected} rejected`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Advertisers"
            value={data.advertisers_total}
            icon={<CampaignIcon />}
            tone="neutral"
            helper="Brands you manage"
          />
        </Grid>
      </Grid>

      {/* Recent settlements — table styled per the Direction C spec.
          Money columns use tabular figures so values align across rows;
          status is a soft-tinted pill. */}
      <Paper sx={{ overflow: 'hidden' }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${glassboxTokens.border.stone}` }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent settlements
            </Typography>
            <Typography variant="caption">
              Latest revenue entries against your publisher account
            </Typography>
          </Box>
          {data.recent_settlements.length > 0 && (
            <Chip
              label={`${data.recent_settlements.length} entries`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>

        {data.recent_settlements.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No settlements yet. They'll appear here once ops records
              your first revenue entry.
            </Typography>
          </Box>
        ) : (
          <Table size="medium">
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
                <TableRow key={s.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatPeriod(s.period_start, s.period_end)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={s.status}
                      color={statusChipColor(s.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right" sx={glassboxTokens.tabularNum}>
                    {formatCurrencyDetailed(s.source_gross_idr)}
                  </TableCell>
                  <TableCell align="right" sx={glassboxTokens.tabularNum}>
                    {s.split_pct}%
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...glassboxTokens.tabularNum,
                      fontWeight: 700,
                      color: glassboxTokens.text.espresso,
                    }}
                  >
                    {formatCurrencyDetailed(s.net_idr)}
                  </TableCell>
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
