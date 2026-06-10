import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import {
  Campaign,
  CampaignApproval,
  CampaignApprovalStatus,
  PlaybackErrorRow,
  VenuePartner,
} from '../types';

// Campaign coverage view. Surfaces "this campaign was submitted to N
// venues — X approved, Y proposed, Z rejected" so a publisher can
// track decision progress without scanning the full approvals list.
//
// Routed at:
//   /admin/campaigns/:campaignId/coverage
//   /publisher/campaigns/:campaignId/coverage
//
// Read-only by design — actions on an approval row (approve / reject /
// revoke) live on AdApprovalsManagement which already handles role
// scoping. This page links each row out to that page filtered by
// approval id when the row is actionable from the current role.

const STATUS_PALETTE: Record<
  CampaignApprovalStatus,
  { bg: string; fg: string; label: string }
> = {
  PROPOSED: { bg: '#FFEDD5', fg: '#C2410C', label: 'PROPOSED' },
  APPROVED: { bg: '#DCFCE7', fg: '#166534', label: 'APPROVED' },
  REJECTED: { bg: '#FEE2E2', fg: '#B91C1C', label: 'REJECTED' },
  REVOKED: { bg: '#F3F4F6', fg: '#374151', label: 'REVOKED' },
};

const CampaignCoveragePage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [approvals, setApprovals] = useState<CampaignApproval[]>([]);
  const [venues, setVenues] = useState<VenuePartner[]>([]);
  const [playbackErrors, setPlaybackErrors] = useState<PlaybackErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pathPrefix = useMemo(
    () => window.location.pathname.split('/campaigns')[0] || '/admin',
    [],
  );

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [cmp, approvalsRes, venuesRes, errorsRes] = await Promise.all([
        apiService.getCampaign(campaignId),
        // limit=1000 — a single campaign rarely targets that many
        // venues; if you hit this ceiling we'll paginate properly.
        apiService.listCampaignApprovals({
          campaign_id: campaignId,
          limit: 1000,
        }),
        apiService.listVenuePartners({ limit: 1000 }),
        // Playback errors over the default 30-day window; the panel
        // filters to this campaign client-side. Don't break the page
        // if the analytics endpoint errors — a venue partner role on
        // an admin-only build, e.g., would 403 here; surface a soft
        // empty state rather than killing the whole coverage view.
        apiService
          .getPlaybackErrors()
          .catch(() => ({ data: [], from: '', to: '' })),
      ]);
      setCampaign(cmp);
      setApprovals(approvalsRes.data);
      setVenues(venuesRes.data);
      // Backend returns `data: null` (Go nil slice) when no errors
      // are recorded for the window — coalesce to [] so downstream
      // .filter / .sort don't blow up.
      setPlaybackErrors(errorsRes.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load coverage');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  const venueById = useMemo(() => {
    const m = new Map<string, VenuePartner>();
    venues.forEach((v) => m.set(v.id, v));
    return m;
  }, [venues]);

  // Playback errors filtered to this campaign and sorted by frequency.
  // The endpoint returns errors across all of the caller's campaigns so
  // we narrow client-side; payloads are small (one row per failing
  // device-asset-error_code tuple over the 30d window).
  const campaignErrors = useMemo(
    () =>
      playbackErrors
        .filter((r) => r.campaign_id === campaignId)
        .sort((a, b) => b.error_count - a.error_count),
    [playbackErrors, campaignId],
  );

  // Counts per status — drives the summary strip.
  const counts = useMemo(() => {
    const m: Record<CampaignApprovalStatus, number> = {
      PROPOSED: 0,
      APPROVED: 0,
      REJECTED: 0,
      REVOKED: 0,
    };
    approvals.forEach((a) => {
      m[a.status] = (m[a.status] || 0) + 1;
    });
    return m;
  }, [approvals]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !campaign) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`${pathPrefix}/campaigns`)}
          sx={{ mb: 2 }}
        >
          Back to campaigns
        </Button>
        <Alert severity="error">{error || 'Campaign not found'}</Alert>
      </Box>
    );
  }

  const fmt = (s?: string) => (s ? new Date(s).toLocaleString() : '—');

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Tooltip title="Back to campaigns">
          <IconButton
            size="small"
            onClick={() => navigate(`${pathPrefix}/campaigns`)}
          >
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
          >
            CAMPAIGN COVERAGE
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mt: 0.5 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {campaign.title}
            </Typography>
            <Chip
              size="small"
              label={campaign.state}
              color={campaign.state === 'PUBLISHED' ? 'success' : 'default'}
            />
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {campaign.published_time_start?.slice(0, 10)} →{' '}
            {campaign.published_time_end?.slice(0, 10)}
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={load}
          disabled={loading}
          variant="outlined"
        >
          Refresh
        </Button>
      </Stack>

      {/* Summary strip — at-a-glance status breakdown */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap">
          <Stat
            label="Submitted to"
            value={approvals.length}
            sublabel={`${approvals.length === 1 ? 'venue' : 'venues'}`}
          />
          <Stat
            label="Approved"
            value={counts.APPROVED}
            color={STATUS_PALETTE.APPROVED.fg}
          />
          <Stat
            label="Proposed"
            value={counts.PROPOSED}
            color={STATUS_PALETTE.PROPOSED.fg}
            sublabel="awaiting venue"
          />
          <Stat
            label="Rejected"
            value={counts.REJECTED}
            color={STATUS_PALETTE.REJECTED.fg}
          />
          {counts.REVOKED > 0 && (
            <Stat
              label="Revoked"
              value={counts.REVOKED}
              color={STATUS_PALETTE.REVOKED.fg}
            />
          )}
        </Stack>
        {approvals.length === 0 && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info">
              This campaign hasn't been submitted to any venues yet.
              {campaign.state === 'DRAFT' && (
                <Button
                  size="small"
                  sx={{ ml: 1 }}
                  onClick={() =>
                    navigate(`${pathPrefix}/campaigns/${campaign.id}/submit`)
                  }
                >
                  Submit now
                </Button>
              )}
            </Alert>
          </Box>
        )}
      </Paper>

      {/* Per-venue table */}
      {approvals.length > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Venue</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested at</TableCell>
                <TableCell>Decided at</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvals.map((a) => {
                const venue = venueById.get(a.venue_partner_id);
                const palette = STATUS_PALETTE[a.status];
                const reason =
                  a.status === 'REJECTED'
                    ? a.reject_reason
                    : a.status === 'REVOKED'
                      ? a.revoked_reason
                      : '';
                return (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {venue?.display_name ||
                          venue?.legal_name ||
                          a.venue_partner_id}
                      </Typography>
                      {venue && (
                        <Typography variant="caption" color="text.secondary">
                          {venue.legal_name}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={palette.label}
                        sx={{
                          bgcolor: palette.bg,
                          color: palette.fg,
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {fmt(a.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {fmt(a.decided_at || a.revoked_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ maxWidth: 320, display: 'block' }}
                      >
                        {reason || '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Playback health — surfaces device × asset × error_code tuples
          so the admin can spot OEM-specific patterns ("Cocaa TVs are
          dropping CODEC_UNSUPPORTED on the same hero asset"). */}
      <Box sx={{ mt: 4 }}>
        <Stack
          direction="row"
          alignItems="baseline"
          spacing={1.5}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Playback health
          </Typography>
          <Typography variant="caption" color="text.secondary">
            last 30 days · {campaignErrors.length}{' '}
            {campaignErrors.length === 1 ? 'incident' : 'incidents'}
          </Typography>
        </Stack>
        {campaignErrors.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No playback errors reported for this campaign in the last
              30 days. Devices are rendering the assets without
              codec/network/DRM failures.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Device</TableCell>
                  <TableCell>Hardware</TableCell>
                  <TableCell>Asset</TableCell>
                  <TableCell>Error code</TableCell>
                  <TableCell align="right">Failures</TableCell>
                  <TableCell>Last seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaignErrors.map((row) => {
                  const hw = [row.manufacturer, row.model]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <TableRow
                      key={`${row.device_id}|${row.campaign_asset_id}|${row.error_code}`}
                      hover
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {row.device_name || row.device_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.device_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {hw || '—'}
                        </Typography>
                        {row.device_type && (
                          <Chip
                            size="small"
                            label={row.device_type}
                            sx={{ ml: 0.5, height: 18, fontSize: 10 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {row.campaign_asset_id.slice(0, 8)}…
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.error_code}
                          sx={{
                            bgcolor: '#FEF3C7',
                            color: '#92400E',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>
                          {row.error_count.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {fmt(row.last_seen)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

// ---- helpers --------------------------------------------------

const Stat: React.FC<{
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
}> = ({ label, value, color, sublabel }) => (
  <Box>
    <Typography
      variant="overline"
      sx={{ color: 'text.secondary', letterSpacing: 1.2, fontSize: 10 }}
    >
      {label}
    </Typography>
    <Stack direction="row" alignItems="baseline" spacing={1}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: color || 'text.primary' }}
      >
        {value.toLocaleString()}
      </Typography>
      {sublabel && (
        <Typography variant="caption" color="text.secondary">
          {sublabel}
        </Typography>
      )}
    </Stack>
  </Box>
);

export default CampaignCoveragePage;
