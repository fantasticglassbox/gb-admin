/**
 * Per-campaign proof-of-play roll-up card.
 *
 * Shared between the publisher and venue-partner analytics pages.
 * The /v2/analytics/campaign-playback endpoint auto-scopes from the
 * JWT, so the same component works for both roles without props.
 *
 * Data source is `playback_aggregates` — the V2 hourly counter table
 * the v2 player writes to. Campaigns with no recorded playback (or
 * publishers whose campaigns predate the cutover) get the friendly
 * "no playback yet" placeholder instead of a misleading zero row.
 */

import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { apiService } from '../services/api';
import { CampaignPlaybackRow } from '../types';

const fmtMs = (ms: number): string => {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const CampaignPlaybackCard: React.FC = () => {
  const [rows, setRows] = React.useState<CampaignPlaybackRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    apiService
      .getCampaignPlayback()
      .then((r) => {
        if (cancelled) return;
        setRows(r.data || []);
      })
      .catch((e: any) =>
        setErr(e?.response?.data?.error || 'Failed to load proof-of-play'),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography variant="subtitle1">
          Proof of play · per campaign (last 30 days)
        </Typography>
        <Typography variant="caption" color="text.secondary">
          impressions = completed renders
        </Typography>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : err ? (
        <Alert severity="warning" sx={{ mt: 1 }}>{err}</Alert>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No playback recorded in this window. The V2 player ships counts
          hourly — give it some time after a device boots, then refresh.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Campaign</TableCell>
              <TableCell align="right">Impressions</TableCell>
              <TableCell align="right">Errors</TableCell>
              <TableCell align="right">Played time</TableCell>
              <TableCell align="right">Venues · Devices</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.campaign_id} hover>
                <TableCell>
                  {r.campaign_title || r.campaign_id.slice(0, 8) + '…'}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
                >
                  {r.complete_count.toLocaleString()}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontVariantNumeric: 'tabular-nums',
                    color: r.error_count > 0 ? 'error.main' : 'text.secondary',
                  }}
                >
                  {r.error_count.toLocaleString()}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {fmtMs(r.total_played_ms)}
                </TableCell>
                <TableCell align="right">
                  {r.venue_count} · {r.device_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
};

export default CampaignPlaybackCard;
