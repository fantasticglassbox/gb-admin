import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  VpnKey as KeyIcon,
  ContentCopy as CopyIcon,
  Delete as RevokeIcon,
  Autorenew as RotateIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { VenuePartner, VenuePartnerApiKeyResult } from '../types';

const fmtDateTime = (s?: string) =>
  s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const IntegrationsManagement: React.FC = () => {
  const [rows, setRows] = useState<VenuePartner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Key-action dialog state. Single `target` covers the rotate-confirm,
  // rotate-result, and revoke-confirm flows so we don't end up with 3
  // half-overlapping dialogs.
  type Mode = 'rotate-confirm' | 'rotate-result' | 'revoke-confirm';
  const [mode, setMode] = useState<Mode | null>(null);
  const [target, setTarget] = useState<VenuePartner | null>(null);
  const [result, setResult] = useState<VenuePartnerApiKeyResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Integration guide modal — opens from the page header. Kept separate
  // from the per-row key dialogs (mode/target above) because they're
  // unrelated flows.
  const [guideOpen, setGuideOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listVenuePartners({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
      });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    load();
  }, [load]);

  // ----- key actions -----

  const openRotateConfirm = (vp: VenuePartner) => {
    setTarget(vp);
    setResult(null);
    setMode('rotate-confirm');
  };
  const openRevokeConfirm = (vp: VenuePartner) => {
    setTarget(vp);
    setResult(null);
    setMode('revoke-confirm');
  };
  const closeAll = () => {
    setMode(null);
    setTarget(null);
    setResult(null);
  };

  const doRotate = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const res = await apiService.rotateVenuePartnerApiKey(target.id);
      setResult(res);
      setMode('rotate-result');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate API key');
      closeAll();
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await apiService.revokeVenuePartnerApiKey(target.id);
      setSuccess(`Revoked API key for ${target.display_name}`);
      closeAll();
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke API key');
    } finally {
      setBusy(false);
    }
  };

  const keyStatusChip = (vp: VenuePartner) =>
    vp.api_key_prefix ? (
      <Chip label="ACTIVE" color="success" size="small" />
    ) : (
      <Chip label="NO KEY" size="small" variant="outlined" />
    );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">Integrations</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Partner-integration API keys. Each venue partner can have one active
            key used as the password in HTTP Basic auth (username = venue partner
            id) against the <code>/partner/*</code> endpoints.
          </Typography>
        </Box>
        <Tooltip title="View integration guide (curl examples)">
          <Button
            variant="outlined"
            startIcon={<HelpIcon />}
            onClick={() => setGuideOpen(true)}
            sx={{ flexShrink: 0, ml: 2 }}
          >
            How to integrate
          </Button>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Box p={2} display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="Search venue partners…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 320 }}
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Venue Partner</TableCell>
                <TableCell>Username (venue_partner_id)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Key Prefix</TableCell>
                <TableCell>Issued</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No venue partners found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((vp) => (
                  <TableRow key={vp.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {vp.display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {vp.legal_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}
                        >
                          {vp.id}
                        </Typography>
                        <Tooltip title="Copy username">
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(vp.id);
                              setSuccess('Username copied');
                            }}
                          >
                            <CopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>{keyStatusChip(vp)}</TableCell>
                    <TableCell>
                      {vp.api_key_prefix ? (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {vp.api_key_prefix}…
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{fmtDateTime(vp.api_key_set_at)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={vp.api_key_prefix ? 'Rotate key' : 'Generate key'}>
                        <IconButton size="small" onClick={() => openRotateConfirm(vp)}>
                          {vp.api_key_prefix ? <RotateIcon fontSize="small" /> : <KeyIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {vp.api_key_prefix && (
                        <Tooltip title="Revoke key">
                          <IconButton size="small" color="error" onClick={() => openRevokeConfirm(vp)}>
                            <RevokeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      {/* Rotate confirm */}
      <Dialog open={mode === 'rotate-confirm'} onClose={closeAll} maxWidth="sm" fullWidth>
        <DialogTitle>{target?.api_key_prefix ? 'Rotate' : 'Generate'} API Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Venue: <strong>{target?.display_name}</strong>
          </Typography>
          {target?.api_key_prefix ? (
            <Alert severity="warning">
              Generating a new key <strong>immediately invalidates</strong> the existing key (
              <code>{target.api_key_prefix}…</code>, issued {fmtDateTime(target.api_key_set_at)}).
              Any in-flight integration using it will start failing.
            </Alert>
          ) : (
            <Typography variant="body2" color="text.secondary">
              A fresh key will be generated and shown once. Hand it to the partner
              securely — we do not store the plaintext.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAll}>Cancel</Button>
          <Button onClick={doRotate} variant="contained" color="warning" disabled={busy}>
            {busy ? <CircularProgress size={20} /> : target?.api_key_prefix ? 'Rotate' : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rotate result — plaintext shown once */}
      <Dialog open={mode === 'rotate-result'} onClose={closeAll} maxWidth="sm" fullWidth>
        <DialogTitle>API Key — {target?.display_name}</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Shown <strong>once</strong>. Copy it now — we don't store the plaintext.
          </Alert>
          {result && (
            <>
              <Typography variant="caption" color="text.secondary">
                Username (HTTP Basic auth)
              </Typography>
              <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {result.username}
                </Typography>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(result.username)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary">
                API key (password)
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {result.api_key}
                </Typography>
                <Tooltip title="Copy">
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(result.api_key)}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAll} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Integration guide modal */}
      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>How to integrate</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Two endpoints. Both authenticate with HTTP Basic:{' '}
            <strong>username = venue partner id</strong> (the Username column on this page),
            <strong> password = the API key</strong> (shown once when you generate it).
          </Typography>

          <Typography variant="caption" color="text.secondary">
            1. Register a device (idempotent on <code>device_id</code>)
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 1.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              mt: 0.5,
              mb: 1,
            }}
          >
{`curl -X POST https://3.1.119.216/partner/devices/register \\
  -u "<venue_partner_id>:<api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "device_id":   "POS-JAKARTA-001",
    "device_name": "Front register screen",
    "device_type": "TV"
  }'`}
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            After registration the device sits in <code>REGISTERED</code> status and the
            playlist will return an empty list. A Glassbox admin then needs to assign
            it to one of your outlets via the admin Devices page before any ads start playing.
          </Alert>

          <Typography variant="caption" color="text.secondary">
            2. Pull the current playlist for that device
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 1.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              mt: 0.5,
              mb: 2,
            }}
          >
{`curl https://3.1.119.216/partner/devices/POS-JAKARTA-001/playlist \\
  -u "<venue_partner_id>:<api_key>"`}
          </Box>

          <Typography variant="caption" color="text.secondary">
            Sample response
          </Typography>
          <Box
            component="pre"
            sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 1.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              overflow: 'auto',
              mt: 0.5,
            }}
          >
{`{
  "device_id": "POS-JAKARTA-001",
  "outlet_id": "44444444-4444-4444-4444-444444444403",
  "as_of":     "2026-05-26T03:15:42Z",
  "data": [
    {
      "id":                   "9a7e1f3c-...",
      "title":                "Unilever Sunsilk Q2",
      "content":              "https://cdn.glassbox.id/ads/sunsilk-q2.mp4",
      "type":                 "video",
      "categories":           "BEAUTY",
      "duration":             30,
      "state":                "PUBLISHED",
      "published_time_start": "2026-05-01T00:00:00Z",
      "published_time_end":   "2026-05-31T23:59:59Z",
      "sha256":               "f1e2d3c4b5a6...",
      "size_bytes":           8423104,
      "version":              3,
      "approval_id":          "a4b8c2d1-...",
      "venue_partner_id":     "33333333-3333-3333-3333-333333333302"
    },
    {
      "id":                   "5c1b8d2a-...",
      "title":                "GoTo Lebaran promo",
      "content":              "https://cdn.glassbox.id/ads/goto-lebaran.mp4",
      "type":                 "video",
      "categories":           "TECHNOLOGY",
      "duration":             15,
      "state":                "PUBLISHED",
      "published_time_start": "2026-05-15T00:00:00Z",
      "published_time_end":   "2026-06-15T23:59:59Z",
      "sha256":               "9b8a7c6d5e4f...",
      "size_bytes":           4321089,
      "version":              1,
      "approval_id":          "b7d3e9f2-...",
      "venue_partner_id":     "33333333-3333-3333-3333-333333333302"
    }
  ]
}`}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            <strong>Notes:</strong> <code>data</code> is empty <code>[]</code> if you have no approved ads or
            none are currently in their publish window. <code>content</code> is a direct CDN URL —
            download once and cache locally, then re-download only when <code>version</code> or{' '}
            <code>sha256</code> changes. Poll every few minutes; there's no push channel.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuideOpen(false)} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke confirm */}
      <Dialog open={mode === 'revoke-confirm'} onClose={closeAll} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Venue: <strong>{target?.display_name}</strong>
          </Typography>
          <Alert severity="error">
            Revoking <strong>immediately disables</strong> the partner integration.
            All <code>/partner/*</code> requests using key <code>{target?.api_key_prefix}…</code>
            will start returning 401. Issue a new key only when the partner is ready to swap it in.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAll}>Cancel</Button>
          <Button onClick={doRevoke} variant="contained" color="error" disabled={busy}>
            {busy ? <CircularProgress size={20} /> : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationsManagement;
