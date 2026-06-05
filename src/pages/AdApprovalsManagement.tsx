/**
 * CampaignApprovalsManagement (was AdApprovalsManagement).
 *
 * One row per (campaign × venue) approval. Replaces the legacy
 * ad-approval list now that /v2/ad-approvals has been retired in favour
 * of /v2/campaign-approvals.
 *
 * Detail panel is a right-side drawer per the user's modal preference;
 * the reject + revoke confirms stay as small centered Dialogs since
 * they're yes/no prompts rather than forms.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
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
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Block as RevokeIcon,
  Visibility as PreviewIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  Campaign,
  CampaignApproval,
  CampaignApprovalStatus,
  VenuePartner,
} from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLOR: Record<CampaignApprovalStatus, 'default' | 'warning' | 'success' | 'error'> = {
  PROPOSED: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  REVOKED: 'default',
};

const CampaignApprovalsManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<CampaignApproval[]>([]);
  const [campaignsById, setCampaignsById] = useState<Record<string, Campaign>>({});
  const [venuesById, setVenuesById] = useState<Record<string, VenuePartner>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  // Detail drawer
  const [previewFor, setPreviewFor] = useState<CampaignApproval | null>(null);
  // Reject / revoke confirm dialogs
  const [rejectFor, setRejectFor] = useState<CampaignApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [revokeFor, setRevokeFor] = useState<CampaignApproval | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // ---- fetch ----

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.listCampaignApprovals({
        limit: rowsPerPage,
        page: page + 1,
        status: statusFilter || undefined,
      });
      setRows(res.data);
      setTotal(res.pagination?.total || 0);

      const newCampaignIds = Array.from(
        new Set(res.data.map((r) => r.campaign_id)),
      ).filter((id) => !campaignsById[id]);
      if (newCampaignIds.length > 0) {
        const fetched = await Promise.all(
          newCampaignIds.map((id) =>
            apiService.getCampaign(id).catch(() => null),
          ),
        );
        const map = { ...campaignsById };
        fetched.forEach((c) => {
          if (c) map[c.id] = c;
        });
        setCampaignsById(map);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, campaignsById]);

  useEffect(() => {
    fetchApprovals();
  }, [page, rowsPerPage, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiService
      .listVenuePartners({ limit: 200 })
      .then((r) => {
        const map: Record<string, VenuePartner> = {};
        (r.data || []).forEach((v) => (map[v.id] = v));
        setVenuesById(map);
      })
      .catch(() => {});
  }, []);

  // ---- handlers ----

  const handleApprove = async (a: CampaignApproval) => {
    try {
      await apiService.approveCampaignApproval(a.id);
      setSuccess('Approval recorded');
      fetchApprovals();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Approve failed');
    }
  };

  const handleReject = async () => {
    if (!rejectFor) return;
    try {
      await apiService.rejectCampaignApproval(rejectFor.id, rejectReason);
      setSuccess('Rejection recorded');
      setRejectFor(null);
      setRejectReason('');
      fetchApprovals();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Reject failed');
    }
  };

  const handleRevoke = async () => {
    if (!revokeFor) return;
    try {
      await apiService.revokeCampaignApproval(revokeFor.id, revokeReason);
      setSuccess('Revoke recorded');
      setRevokeFor(null);
      setRevokeReason('');
      fetchApprovals();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Revoke failed');
    }
  };

  const canDecide = hasRole('admin') || hasRole('venue_partner');
  const canRevoke = hasRole('admin') || hasRole('venue_partner') || hasRole('publisher');

  // ---- render ----

  const previewCampaign = previewFor ? campaignsById[previewFor.campaign_id] : null;
  const previewVenue = previewFor ? venuesById[previewFor.venue_partner_id] : null;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Campaign approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            One booking decision per (campaign × venue). Approving a row plays
            every asset of the campaign on the venue's devices.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchApprovals}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

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

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl sx={{ minWidth: 220 }} size="small">
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
            <MenuItem value="PROPOSED">Proposed</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
            <MenuItem value="REVOKED">Revoked</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Campaign</TableCell>
              <TableCell>Venue</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  No approvals yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((a) => {
                const cmp = campaignsById[a.campaign_id];
                const ven = venuesById[a.venue_partner_id];
                return (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {cmp?.title || a.campaign_id.slice(0, 8) + '…'}
                      </Typography>
                      {cmp && (
                        <Typography variant="caption" color="text.secondary">
                          {(cmp.assets || []).length} asset
                          {(cmp.assets || []).length === 1 ? '' : 's'} · zones:{' '}
                          {Array.from(
                            new Set((cmp.assets || []).map((x) => x.zone_slug)),
                          ).join(', ') || '—'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{ven?.display_name || a.venue_partner_id.slice(0, 8) + '…'}</TableCell>
                    <TableCell>
                      <Chip
                        label={a.status}
                        size="small"
                        color={STATUS_COLOR[a.status] || 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {a.created_at?.slice(0, 10)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Open detail">
                        <IconButton size="small" onClick={() => setPreviewFor(a)}>
                          <PreviewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {a.status === 'PROPOSED' && canDecide && (
                        <>
                          <Tooltip title="Approve">
                            <IconButton size="small" color="success" onClick={() => handleApprove(a)}>
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Reject">
                            <IconButton size="small" color="error" onClick={() => setRejectFor(a)}>
                              <RejectIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {a.status === 'APPROVED' && canRevoke && (
                        <Tooltip title="Revoke">
                          <IconButton size="small" onClick={() => setRevokeFor(a)}>
                            <RevokeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
        />
      </TableContainer>

      {/* ---- right-side detail drawer ---- */}
      <Drawer
        anchor="right"
        open={!!previewFor}
        onClose={() => setPreviewFor(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}
      >
        {previewFor && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 2,
                bgcolor: 'background.paper',
                borderBottom: '1px solid #E8E2D7',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#F97316',
                  }}
                >
                  Approval · {previewFor.status}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {previewCampaign?.title || previewFor.campaign_id}
                </Typography>
              </Box>
              <IconButton onClick={() => setPreviewFor(null)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Venue
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {previewVenue?.display_name || previewFor.venue_partner_id}
              </Typography>

              {previewCampaign && (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Period
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    {previewCampaign.published_time_start?.slice(0, 10)} →{' '}
                    {previewCampaign.published_time_end?.slice(0, 10)}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    Categories
                  </Typography>
                  <Typography sx={{ mb: 2 }}>{previewCampaign.categories || '—'}</Typography>

                  <Divider sx={{ my: 2 }} />
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      mb: 1,
                    }}
                  >
                    Assets ({(previewCampaign.assets || []).length})
                  </Typography>
                  <Stack spacing={1.5}>
                    {(previewCampaign.assets || []).map((a) => (
                      <Stack
                        key={a.id}
                        direction="row"
                        spacing={1.5}
                        sx={{ p: 1.5, border: '1px solid #E8E2D7', borderRadius: 1 }}
                      >
                        {a.content_type === 'IMAGE' ? (
                          <Box
                            component="img"
                            src={a.content_url}
                            alt={a.zone_slug}
                            sx={{
                              width: 72,
                              height: 48,
                              objectFit: 'cover',
                              borderRadius: 1,
                              border: '1px solid #E8E2D7',
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 72,
                              height: 48,
                              borderRadius: 1,
                              background: '#1A1816',
                              color: 'white',
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            VIDEO
                          </Box>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                            zone <code>{a.zone_slug}</code>
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                            noWrap
                          >
                            {a.content_url}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}

              {previewFor.notes && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography>{previewFor.notes}</Typography>
                </>
              )}
              {previewFor.reject_reason && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <strong>Rejected:</strong> {previewFor.reject_reason}
                </Alert>
              )}
              {previewFor.revoked_reason && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <strong>Revoked:</strong> {previewFor.revoked_reason}
                </Alert>
              )}
            </Box>
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                bgcolor: 'background.paper',
                borderTop: '1px solid #E8E2D7',
                px: 3,
                py: 2,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Button onClick={() => setPreviewFor(null)}>Close</Button>
              {previewCampaign && (
                <Button
                  variant="text"
                  onClick={() => navigate(`/admin/campaigns/${previewCampaign.id}/submit`)}
                >
                  Submit elsewhere…
                </Button>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ---- reject confirm (small centered dialog is fine for yes/no) ---- */}
      <Dialog open={!!rejectFor} onClose={() => setRejectFor(null)}>
        <DialogTitle>Reject this approval</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            The publisher will see your reason. They can re-submit a revised
            campaign afterwards.
          </Typography>
          <TextField
            label="Reason"
            fullWidth
            multiline
            minRows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectFor(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleReject}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---- revoke confirm ---- */}
      <Dialog open={!!revokeFor} onClose={() => setRevokeFor(null)}>
        <DialogTitle>Revoke this approval</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Devices at this venue will stop playing the campaign on the next
            playlist refresh. A push is fired automatically.
          </Typography>
          <TextField
            label="Reason (optional)"
            fullWidth
            multiline
            minRows={2}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeFor(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleRevoke}>
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CampaignApprovalsManagement;
