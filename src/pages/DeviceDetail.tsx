import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Link as MuiLink,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Bolt as BoltIcon,
  Edit as EditIcon,
  Map as MapIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  DeviceResponse,
  Layout,
  Outlet,
  PlaylistAd,
  VenuePartner,
} from '../types';
import { apiService } from '../services/api';

// Full-page device detail. Replaces the legacy DeviceDetail (which
// rendered the old Merchant + Advertisement model) with a view built
// around the V2 shape: venue → outlet → device, optional layout, live
// playlist, GPS coordinates.
//
// Edit / Assign / Layout flows live in the DevicesManagement drawers
// and are reached via the "Edit on list" button. This page is for
// reading state and triggering quick actions (Pull latest, Open in
// Maps) — it does not duplicate the form drawers.
const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();

  const [device, setDevice] = useState<DeviceResponse | null>(null);
  const [venue, setVenue] = useState<VenuePartner | null>(null);
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [playlist, setPlaylist] = useState<PlaylistAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullMsg, setPullMsg] = useState<string | null>(null);

  const pathPrefix = useMemo(
    () => (window.location.pathname.split('/devices')[0] || '/admin'),
    [],
  );

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const d = (await apiService.getDevice(deviceId)) as DeviceResponse;
      setDevice(d);

      const tasks: Promise<unknown>[] = [];
      if (d.venue_partner_id) {
        tasks.push(
          apiService
            .listVenuePartners({ limit: 1000 })
            .then((res) => {
              const v = res.data.find((x) => x.id === d.venue_partner_id);
              if (v) setVenue(v);
            })
            .catch(() => {}),
        );
      }
      if (d.outlet_id) {
        tasks.push(
          apiService
            .listOutlets({ limit: 1000 })
            .then((res) => {
              const o = res.data.find((x) => x.id === d.outlet_id);
              if (o) setOutlet(o);
            })
            .catch(() => {}),
        );
      }
      if (d.layout_id) {
        tasks.push(
          apiService
            .listLayouts()
            .then((all) => {
              const l = all.find((x) => x.id === d.layout_id);
              if (l) setLayout(l);
            })
            .catch(() => {}),
        );
      }
      tasks.push(
        apiService
          .getDevicePlaylist(d.id)
          .then((ads) => setPlaylist(ads))
          .catch(() => setPlaylist([])),
      );
      await Promise.all(tasks);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load device');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePullLatest = async () => {
    if (!device) return;
    setPulling(true);
    setPullMsg(null);
    try {
      await apiService.forceSyncDevice(device.id);
      setPullMsg('Sync token bumped — device will refetch on next heartbeat.');
    } catch (e: any) {
      setPullMsg(`Failed: ${e?.response?.data?.error || e?.message || 'unknown error'}`);
    } finally {
      setPulling(false);
    }
  };

  const handleEdit = () => {
    // Reuses the drawer-based form on the list page. We pass ?edit=<id>
    // so DevicesManagement can auto-open the drawer (cheap; matches
    // how /campaigns/:id/edit reuses the campaign editor).
    navigate(`${pathPrefix}/devices?edit=${device?.id ?? ''}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !device) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`${pathPrefix}/devices`)}
          sx={{ mb: 2 }}
        >
          Back to devices
        </Button>
        <Alert severity="error">{error || 'Device not found'}</Alert>
      </Box>
    );
  }

  const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    active: 'success',
    inactive: 'default',
    maintenance: 'warning',
    offline: 'error',
  };

  const mapsHref =
    device.location?.latitude != null && device.location?.longitude != null
      ? `https://www.google.com/maps?q=${device.location.latitude},${device.location.longitude}`
      : null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: 'auto' }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Tooltip title="Back to devices">
          <IconButton onClick={() => navigate(`${pathPrefix}/devices`)} size="small">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
          >
            DEVICE
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }} noWrap>
              {device.name || device.device_id}
            </Typography>
            <Chip
              label={device.status.toUpperCase()}
              color={statusColor[device.status] || 'default'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            {device.device_id}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={pulling ? <CircularProgress size={16} /> : <BoltIcon />}
            variant="outlined"
            onClick={handlePullLatest}
            disabled={pulling}
          >
            Pull latest
          </Button>
          <Button startIcon={<RefreshIcon />} onClick={() => void load()}>
            Refresh
          </Button>
          <Button startIcon={<EditIcon />} variant="contained" onClick={handleEdit}>
            Edit
          </Button>
        </Stack>
      </Stack>

      {pullMsg && (
        <Alert
          severity={pullMsg.startsWith('Failed') ? 'error' : 'success'}
          onClose={() => setPullMsg(null)}
          sx={{ mb: 2 }}
        >
          {pullMsg}
        </Alert>
      )}

      {/* Two-column grid (right column collapses below 900px) */}
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 360px' },
          alignItems: 'start',
        }}
      >
        {/* LEFT column */}
        <Stack spacing={2.5}>
          {/* Layout card */}
          <Card>
            <CardContent>
              <SectionHeader title="Layout" />
              {layout ? (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {layout.display_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {layout.zones.length} zone{layout.zones.length === 1 ? '' : 's'}
                    {layout.description ? ` · ${layout.description}` : ''}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <ZonePreview zones={layout.zones} />
                  </Box>
                </>
              ) : device.layout_id ? (
                <EmptyHint text="Layout assigned but not in catalog." />
              ) : (
                <EmptyHint text="No layout assigned — device renders fullscreen." />
              )}
            </CardContent>
          </Card>

          {/* Playlist card. Multi-zone layouts produce one row per asset,
              so a single campaign with a main + sidebar + ticker asset
              surfaces as 3 rows here. The Zone column makes that
              breakdown visible — without it the rows look like
              accidental duplicates. */}
          <Card>
            <CardContent>
              <SectionHeader
                title="Current playlist"
                hint={`${playlist.length} asset${playlist.length === 1 ? '' : 's'} · ${uniqueCampaignCount(playlist)} campaign${uniqueCampaignCount(playlist) === 1 ? '' : 's'}`}
              />
              {playlist.length === 0 ? (
                <EmptyHint text="No ads currently scheduled for this device." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Zone</TableCell>
                      <TableCell>Title</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {playlist.map((ad) => (
                      <TableRow key={ad.id}>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ad.target_zone_slug || 'main'}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: 11,
                              height: 22,
                            }}
                          />
                        </TableCell>
                        <TableCell>{ad.title || ad.id}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={ad.content_type || '—'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {ad.duration_seconds ? `${ad.duration_seconds}s` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </Stack>

        {/* RIGHT column */}
        <Stack spacing={2.5}>
          {/* Assignment card */}
          <Card>
            <CardContent>
              <SectionHeader title="Assignment" />
              <KeyValueRow
                label="Venue"
                value={venue?.display_name || venue?.legal_name || (device.venue_partner_id ? 'Unknown venue' : '—')}
              />
              <KeyValueRow
                label="Outlet"
                value={outlet?.display_name || (device.outlet_id ? 'Unknown outlet' : 'Not assigned')}
              />
              {outlet?.address && (
                <KeyValueRow label="Address" value={outlet.address} />
              )}
              {outlet?.city && (
                <KeyValueRow label="City" value={`${outlet.city}, ${outlet.province}`} />
              )}
            </CardContent>
          </Card>

          {/* Location card */}
          <Card>
            <CardContent>
              <SectionHeader title="Location" icon={<MapIcon fontSize="small" />} />
              {device.location?.latitude != null && device.location?.longitude != null ? (
                <>
                  <KeyValueRow
                    label="Coordinates"
                    value={
                      <Typography
                        component="span"
                        sx={{ fontFamily: 'monospace', fontSize: 13 }}
                      >
                        {device.location.latitude.toFixed(5)},{' '}
                        {device.location.longitude.toFixed(5)}
                      </Typography>
                    }
                  />
                  {device.location.address && (
                    <KeyValueRow label="Address" value={device.location.address} />
                  )}
                  {mapsHref && (
                    <MuiLink
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        mt: 1.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: 13,
                      }}
                    >
                      Open in Google Maps <OpenInNewIcon sx={{ fontSize: 14 }} />
                    </MuiLink>
                  )}
                </>
              ) : (
                <EmptyHint text="No GPS captured. Devices paired before the location feature shipped have no coordinates." />
              )}
            </CardContent>
          </Card>

          {/* Device info card */}
          <Card>
            <CardContent>
              <SectionHeader title="Device" />
              <KeyValueRow label="Type" value={device.device_type.toUpperCase()} />
              {device.device_info?.model && (
                <KeyValueRow label="Model" value={device.device_info.model} />
              )}
              {device.device_info?.os && (
                <KeyValueRow label="OS" value={device.device_info.os} />
              )}
              {device.device_info?.app_version && (
                <KeyValueRow label="App" value={device.device_info.app_version} />
              )}
              {device.device_info?.screen_resolution && (
                <KeyValueRow label="Screen" value={device.device_info.screen_resolution} />
              )}
              <Divider sx={{ my: 1.5 }} />
              <KeyValueRow
                label="Created"
                value={new Date(device.created_at).toLocaleDateString()}
              />
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Box>
  );
};

// --- helpers ---

// Distinct campaigns in the playlist. We key on approval_id because
// each campaign × venue has exactly one approval row, and a single
// device only ever sees one venue's approvals.
const uniqueCampaignCount = (ads: PlaylistAd[]): number =>
  new Set(ads.map((a) => a.approval_id).filter(Boolean)).size;


const SectionHeader: React.FC<{ title: string; hint?: string; icon?: React.ReactNode }> = ({
  title,
  hint,
  icon,
}) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
    {icon}
    <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2 }}>
      {title}
    </Typography>
    {hint && (
      <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
        {hint}
      </Typography>
    )}
  </Stack>
);

const KeyValueRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Stack direction="row" spacing={2} sx={{ py: 0.75, alignItems: 'baseline' }}>
    <Typography
      variant="caption"
      sx={{ color: 'text.secondary', minWidth: 92, fontWeight: 600 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-word' }}>
      {value || '—'}
    </Typography>
  </Stack>
);

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
  <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
    {text}
  </Typography>
);

// Renders a layout's zones as proportional rectangles inside a
// 16:9-ish frame. Pure-CSS preview — keeps the page dep-free.
const ZonePreview: React.FC<{ zones: { slug: string; x_pct: number; y_pct: number; w_pct: number; h_pct: number }[] }> = ({
  zones,
}) => (
  <Paper
    variant="outlined"
    sx={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16 / 9',
      bgcolor: 'grey.50',
      overflow: 'hidden',
    }}
  >
    {zones.map((z, idx) => (
      <Box
        key={z.slug}
        sx={{
          position: 'absolute',
          left: `${z.x_pct}%`,
          top: `${z.y_pct}%`,
          width: `${z.w_pct}%`,
          height: `${z.h_pct}%`,
          border: '1px dashed',
          borderColor: 'primary.main',
          bgcolor: idx % 2 === 0 ? 'primary.50' : 'primary.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'primary.dark',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {z.slug}
      </Box>
    ))}
  </Paper>
);

export default DeviceDetail;
