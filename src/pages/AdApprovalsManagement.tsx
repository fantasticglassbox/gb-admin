import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
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
  Add as AddIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Block as RevokeIcon,
  Visibility as PreviewIcon,
  PlayCircle as VideoIcon,
} from '@mui/icons-material';
import {
  AdApproval,
  AdApprovalStatus,
  Advertisement,
  VenuePartner,
} from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLOR: Record<AdApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  PROPOSED: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  REVOKED: 'default',
};

const AdApprovalsManagement: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  // Venue partners see their approval queue by default (PROPOSED).
  const [statusFilter, setStatusFilter] = useState<string>(
    role === 'venue_partner' ? 'PROPOSED' : '',
  );

  const [rows, setRows] = useState<AdApproval[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Lookups for name resolution in the table.
  const [adsById, setAdsById] = useState<Record<string, Advertisement>>({});
  const [venuesById, setVenuesById] = useState<Record<string, VenuePartner>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listAdApprovals({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
      });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Backfill ad title + venue name lookup tables (one shot per page).
  useEffect(() => {
    if (rows.length === 0) return;
    const adIds = Array.from(new Set(rows.map((r) => r.advertisement_id))).filter((id) => !adsById[id]);
    const vIds = Array.from(new Set(rows.map((r) => r.venue_partner_id))).filter((id) => !venuesById[id]);

    (async () => {
      if (adIds.length > 0) {
        try {
          const ads = await apiService.getAdvertisements({ limit: 500 });
          const map = { ...adsById };
          for (const a of ads.data) map[a.id] = a;
          setAdsById(map);
        } catch {
          /* non-fatal */
        }
      }
      if (vIds.length > 0) {
        try {
          const vs = await apiService.listVenuePartners({ limit: 500 });
          const map = { ...venuesById };
          for (const v of vs.data) map[v.id] = v;
          setVenuesById(map);
        } catch {
          /* non-fatal */
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ----- Submit dialog (publisher / admin only) -----
  const canSubmit = role === 'publisher' || role === 'admin';
  const [submitOpen, setSubmitOpen] = useState(false);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [venues, setVenues] = useState<VenuePartner[]>([]);
  const [pickersLoading, setPickersLoading] = useState(false);
  const [form, setForm] = useState({
    advertisement_id: '',
    venue_partner_ids: [] as string[],
    notes: '',
  });

  const openSubmit = async () => {
    setForm({ advertisement_id: '', venue_partner_ids: [], notes: '' });
    setSubmitOpen(true);
    setPickersLoading(true);
    try {
      // V2 ad list — backend forces publisher_id scope from the JWT
      // and we explicitly ask for DRAFT only (the new rule: only
      // unsubmitted creatives are eligible).
      const [ads, vs] = await Promise.all([
        apiService.listAdvertisementsV2({ state: 'DRAFT', limit: 200 }),
        apiService.listVenuePartners({ limit: 500 }),
      ]);
      setAdvertisements(ads.data);
      setVenues(vs.data);
    } catch {
      /* non-fatal */
    } finally {
      setPickersLoading(false);
    }
  };

  const doSubmit = async () => {
    if (!form.advertisement_id || form.venue_partner_ids.length === 0) {
      setError('pick an ad and at least one venue');
      return;
    }
    try {
      const res = await apiService.submitAdApprovals({
        advertisement_id: form.advertisement_id,
        venue_partner_ids: form.venue_partner_ids,
        notes: form.notes,
      });
      const skippedNote = res.skipped.length
        ? ` (${res.skipped.length} skipped: ${res.skipped.map((s) => s.reason).join('; ')})`
        : '';
      setSuccess(`Submitted to ${res.created.length} venue(s)${skippedNote}`);
      setSubmitOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submit failed');
    }
  };

  // ----- Decision actions -----
  // Preview dialog state — opens to show the actual creative + metadata
  // so the venue isn't approving sight-unseen. Approve/Reject are
  // surfaced inside the preview too.
  const [previewFor, setPreviewFor] = useState<AdApproval | null>(null);
  const previewAd: Advertisement | undefined = previewFor
    ? adsById[previewFor.advertisement_id]
    : undefined;
  const previewVenue: VenuePartner | undefined = previewFor
    ? venuesById[previewFor.venue_partner_id]
    : undefined;

  // Heuristic: if Advertisement.type starts with "video" OR content URL
  // ends with a video extension, render as <video>; otherwise <img>.
  // Falls back to a download link if we can't tell.
  const isVideo = (ad?: Advertisement) => {
    if (!ad) return false;
    const t = (ad.type || '').toLowerCase();
    if (t.includes('video')) return true;
    const c = (ad.content || '').toLowerCase();
    return /\.(mp4|webm|mov|m4v|avi)(\?|#|$)/.test(c);
  };
  const isImage = (ad?: Advertisement) => {
    if (!ad) return false;
    const t = (ad.type || '').toLowerCase();
    if (t.includes('image') || t.includes('img')) return true;
    const c = (ad.content || '').toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?|#|$)/.test(c);
  };

  const doApprove = async (a: AdApproval) => {
    try {
      await apiService.approveAdApproval(a.id);
      setSuccess('Ad approved');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Approve failed');
    }
  };
  const [rejectFor, setRejectFor] = useState<AdApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const doReject = async () => {
    if (!rejectFor) return;
    try {
      await apiService.rejectAdApproval(rejectFor.id, rejectReason);
      setSuccess('Ad rejected');
      setRejectFor(null);
      setRejectReason('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reject failed');
    }
  };
  const [revokeFor, setRevokeFor] = useState<AdApproval | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const doRevoke = async () => {
    if (!revokeFor) return;
    try {
      await apiService.revokeAdApproval(revokeFor.id, revokeReason);
      setSuccess('Approval revoked');
      setRevokeFor(null);
      setRevokeReason('');
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Revoke failed');
    }
  };

  // Per-row action visibility — mirrors backend lifecycle gates.
  const canDecide = (a: AdApproval) =>
    a.status === 'PROPOSED' && (role === 'venue_partner' || role === 'admin');
  const canRevokeRow = (a: AdApproval) =>
    a.status === 'APPROVED' && (role === 'venue_partner' || role === 'admin' || role === 'publisher');

  const title = useMemo(() => {
    switch (role) {
      case 'venue_partner':
        return 'Approval Queue';
      case 'publisher':
        return 'My Submissions';
      default:
        return 'Ad Approvals';
    }
  }, [role]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{title}</Typography>
        {canSubmit && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openSubmit}>
            Submit Ad to Venues
          </Button>
        )}
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
          <FormControl sx={{ minWidth: 220 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => {
                setStatusFilter(e.target.value as string);
                setPage(0);
              }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PROPOSED">Proposed (awaiting decision)</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="REVOKED">Revoked</MenuItem>
            </Select>
          </FormControl>
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
                <TableCell>Ad</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No approvals found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                        onClick={() => setPreviewFor(a)}
                        title="Click to preview"
                      >
                        {adsById[a.advertisement_id]?.title || a.advertisement_id.slice(0, 8) + '…'}
                      </Typography>
                      {adsById[a.advertisement_id]?.type && (
                        <Typography variant="caption" color="text.secondary">
                          {adsById[a.advertisement_id]?.type}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {venuesById[a.venue_partner_id]?.display_name || a.venue_partner_id.slice(0, 8) + '…'}
                    </TableCell>
                    <TableCell>
                      <Chip label={a.status} color={STATUS_COLOR[a.status]} size="small" />
                      {a.status === 'REJECTED' && a.reject_reason && (
                        <Tooltip title={a.reject_reason}>
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            (reason)
                          </Typography>
                        </Tooltip>
                      )}
                      {a.status === 'REVOKED' && a.revoked_reason && (
                        <Tooltip title={a.revoked_reason}>
                          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                            (reason)
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(a.created_at).toLocaleString('id-ID')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Preview the creative + metadata">
                        <IconButton size="small" onClick={() => setPreviewFor(a)}>
                          <PreviewIcon />
                        </IconButton>
                      </Tooltip>
                      {canDecide(a) && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => doApprove(a)}>
                              <ApproveIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" color="error" onClick={() => setRejectFor(a)}>
                              <RejectIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {canRevokeRow(a) && (
                        <Tooltip title="Revoke approval">
                          <IconButton size="small" onClick={() => setRevokeFor(a)}>
                            <RevokeIcon />
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

      {/* Submit dialog: pick ad + venues */}
      <Dialog open={submitOpen} onClose={() => setSubmitOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Submit Ad to Venues</DialogTitle>
        <DialogContent>
          {pickersLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Advertisement (DRAFT only)</InputLabel>
                <Select
                  value={form.advertisement_id}
                  label="Advertisement (DRAFT only)"
                  onChange={(e) => setForm({ ...form, advertisement_id: e.target.value as string })}
                >
                  {advertisements.length === 0 ? (
                    <MenuItem disabled value="">
                      No DRAFT ads available — create one in Advertisements first
                    </MenuItem>
                  ) : (
                    advertisements.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.title} ({a.type})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Venues to submit to</InputLabel>
                <Select
                  multiple
                  value={form.venue_partner_ids}
                  label="Venues to submit to"
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm({
                      ...form,
                      venue_partner_ids: typeof v === 'string' ? v.split(',') : (v as string[]),
                    });
                  }}
                  renderValue={(selected) =>
                    venues
                      .filter((v) => (selected as string[]).includes(v.id))
                      .map((v) => v.display_name)
                      .join(', ')
                  }
                >
                  {venues.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      <Checkbox checked={form.venue_partner_ids.includes(v.id)} />
                      <ListItemText primary={v.display_name} secondary={`${v.tier} · ${v.status}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                helperText="Shown to each venue alongside the approval request."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubmitOpen(false)}>Cancel</Button>
          <Button onClick={doSubmit} variant="contained" disabled={pickersLoading}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview dialog — shows the actual creative + metadata so the
          venue isn't approving sight-unseen. Surfaces Approve / Reject
          inline for PROPOSED rows. */}
      <Dialog open={!!previewFor} onClose={() => setPreviewFor(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {previewAd?.title || 'Advertisement'}
          {previewAd?.state && (
            <Chip label={previewAd.state} size="small" variant="outlined" sx={{ ml: 1 }} />
          )}
        </DialogTitle>
        <DialogContent>
          {!previewAd ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading creative…
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Creative preview — video / image / fallback */}
              <Box
                sx={{
                  bgcolor: '#000',
                  borderRadius: 1,
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 200,
                  overflow: 'hidden',
                }}
              >
                {isVideo(previewAd) ? (
                  <video
                    src={previewAd.content}
                    controls
                    style={{ maxWidth: '100%', maxHeight: 480 }}
                  />
                ) : isImage(previewAd) ? (
                  <img
                    src={previewAd.content}
                    alt={previewAd.title}
                    style={{ maxWidth: '100%', maxHeight: 480 }}
                  />
                ) : (
                  <Box color="white" textAlign="center" p={3}>
                    <VideoIcon sx={{ fontSize: 48, opacity: 0.6 }} />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      Unknown content type — open directly:
                    </Typography>
                    <Typography
                      variant="caption"
                      component="a"
                      href={previewAd.content}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ color: 'lightblue', wordBreak: 'break-all' }}
                    >
                      {previewAd.content}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Metadata grid */}
              <Box display="grid" gridTemplateColumns="auto 1fr" gap={1.5} sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">Submitted to</Typography>
                <Typography variant="body2">
                  {previewVenue?.display_name || previewFor?.venue_partner_id}
                </Typography>

                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{previewAd.description || '—'}</Typography>

                <Typography variant="caption" color="text.secondary">Categories</Typography>
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {(previewAd.categories || '')
                    .split(',')
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .map((c) => (
                      <Chip key={c} label={c} size="small" variant="outlined" />
                    ))}
                  {!previewAd.categories && <Typography variant="body2">—</Typography>}
                </Box>

                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Typography variant="body2">{previewAd.type || '—'}</Typography>

                <Typography variant="caption" color="text.secondary">Duration</Typography>
                <Typography variant="body2">
                  {previewAd.duration ? `${previewAd.duration} sec` : '—'}
                </Typography>

                <Typography variant="caption" color="text.secondary">Publish window</Typography>
                <Typography variant="body2">
                  {previewAd.published_time_start
                    ? new Date(previewAd.published_time_start).toLocaleString('id-ID')
                    : '—'}
                  {' → '}
                  {previewAd.published_time_end
                    ? new Date(previewAd.published_time_end).toLocaleString('id-ID')
                    : '—'}
                </Typography>

                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip
                  label={previewFor!.status}
                  color={STATUS_COLOR[previewFor!.status]}
                  size="small"
                  sx={{ justifySelf: 'start' }}
                />

                {previewFor!.notes && (
                  <>
                    <Typography variant="caption" color="text.secondary">Publisher note</Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {previewFor!.notes}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewFor(null)}>Close</Button>
          {previewFor && canDecide(previewFor) && (
            <>
              <Button
                color="error"
                variant="outlined"
                startIcon={<RejectIcon />}
                onClick={() => {
                  const a = previewFor;
                  setPreviewFor(null);
                  setRejectFor(a);
                }}
              >
                Reject
              </Button>
              <Button
                color="success"
                variant="contained"
                startIcon={<ApproveIcon />}
                onClick={async () => {
                  const a = previewFor;
                  setPreviewFor(null);
                  await doApprove(a);
                }}
              >
                Approve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectFor} onClose={() => setRejectFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject ad</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            helperText="Shared back to the publisher. Be specific."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectFor(null)}>Cancel</Button>
          <Button onClick={doReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={!!revokeFor} onClose={() => setRevokeFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Revoke approval</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The ad will stop playing on this venue's devices immediately on the next playlist refresh.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeFor(null)}>Cancel</Button>
          <Button onClick={doRevoke} color="warning" variant="contained">
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdApprovalsManagement;
