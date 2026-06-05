/**
 * CampaignsManagement — V2 list page.
 *
 * Pure list / filter / delete / quick-publish surface. Create + edit
 * happen on the dedicated CampaignEditor page (/campaigns/new and
 * /campaigns/:id/edit) so the publisher has room for the expected-
 * layout picker + the live preview rail. Clicking a row navigates
 * to the editor; the "New campaign" button does the same.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import LaunchIcon from '@mui/icons-material/Launch';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Advertiser, ApprovalSummary, Campaign } from '../types';

const STATE_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  PUBLISHED: 'success',
  REJECTED: 'error',
  INACTIVE: 'warning',
};

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Compact submission-status indicator for the table cell. Shows a row
 *  of small status pills with counts; nothing when the campaign has
 *  never been submitted. */
const SubmissionsCell: React.FC<{ summary?: ApprovalSummary }> = ({
  summary,
}) => {
  if (!summary) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }
  const total =
    summary.proposed + summary.approved + summary.rejected + summary.revoked;
  if (total === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        not submitted
      </Typography>
    );
  }
  const pills: { label: string; value: number; color: 'warning' | 'success' | 'error' | 'default' }[] = [
    { label: 'pending', value: summary.proposed, color: 'warning' },
    { label: 'approved', value: summary.approved, color: 'success' },
    { label: 'rejected', value: summary.rejected, color: 'error' },
    { label: 'revoked', value: summary.revoked, color: 'default' },
  ];
  return (
    <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
      {pills
        .filter((p) => p.value > 0)
        .map((p) => (
          <Chip
            key={p.label}
            size="small"
            label={`${p.value} ${p.label}`}
            color={p.color}
            variant={p.color === 'default' ? 'outlined' : 'filled'}
            sx={{ fontWeight: 600 }}
          />
        ))}
    </Stack>
  );
};

/** Friendly one-liner for the table cell. Empty CSV = "24/7"; same
 *  hours across all 7 days = "Daily 08:00–22:00"; otherwise list the
 *  days that play. */
const summarisePlayingHours = (csv?: string): string => {
  if (!csv) return '24/7';
  const entries: { day: string; window: string }[] = [];
  csv.split(',').forEach((p) => {
    const eq = p.indexOf('=');
    if (eq <= 0) return;
    const day = p.slice(0, eq).trim().toLowerCase();
    const window = p.slice(eq + 1).trim();
    if (DAY_ORDER.includes(day)) entries.push({ day, window });
  });
  if (entries.length === 0) return 'Dark';
  const windows = new Set(entries.map((e) => e.window));
  if (entries.length === 7 && windows.size === 1) {
    return `Daily ${entries[0].window}`;
  }
  const days = entries
    .map((e) => e.day)
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b))
    .map((d) => d[0].toUpperCase() + d.slice(1));
  if (windows.size === 1) {
    return `${days.join(', ')} · ${Array.from(windows)[0]}`;
  }
  return `${days.length} day${days.length === 1 ? '' : 's'} · mixed hours`;
};

const CampaignsManagement: React.FC = () => {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const basePath = `/${user?.role || 'admin'}`;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [stateFilter, setStateFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- load ----

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiService.listCampaigns({
        limit: rowsPerPage,
        page: page + 1,
        state: stateFilter || undefined,
      });
      setCampaigns(res.data);
      setTotal(res.pagination?.total || 0);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, stateFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    apiService
      .listAdvertisersV2({ limit: 200 })
      .then((r: any) => setAdvertisers(r.data || []))
      .catch(() => setAdvertisers([]));
  }, []);

  // ---- handlers ----

  const handleDelete = async (c: Campaign) => {
    if (!window.confirm(`Delete campaign "${c.title}"? This also drops its assets.`))
      return;
    try {
      await apiService.deleteCampaign(c.id);
      setSuccess('Campaign deleted');
      fetchCampaigns();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Delete failed');
    }
  };

  const handlePublish = async (c: Campaign) => {
    try {
      const updated = await apiService.publishCampaign(c.id);
      setSuccess('Campaign published');
      setCampaigns((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Publish failed');
    }
  };

  // ---- render ----

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            One campaign per advertiser intent. Each campaign owns one
            asset per layout zone and ships as a single booking decision.
          </Typography>
        </Box>
        {(hasRole('publisher') || hasRole('admin')) && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`${basePath}/campaigns/new`)}
          >
            New campaign
          </Button>
        )}
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>State</InputLabel>
          <Select
            value={stateFilter}
            label="State"
            onChange={(e) => {
              setStateFilter(e.target.value as string);
              setPage(0);
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="DRAFT">Draft</MenuItem>
            <MenuItem value="PUBLISHED">Published</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Advertiser</TableCell>
              <TableCell>Period</TableCell>
              <TableCell align="center">Submissions</TableCell>
              <TableCell align="center">Zones</TableCell>
              <TableCell>State</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  No campaigns yet.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((c) => {
                const advName =
                  advertisers.find((a) => a.id === c.advertiser_id)?.display_name ||
                  c.advertiser_id?.slice(0, 8) ||
                  '—';
                const zoneSlugs = Array.from(
                  new Set((c.assets || []).map((a) => a.zone_slug)),
                );
                return (
                  <TableRow
                    key={c.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`${basePath}/campaigns/${c.id}/edit`)}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>{c.title}</Typography>
                      {c.categories && (
                        <Typography variant="caption" color="text.secondary">
                          {c.categories}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{advName}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {c.published_time_start?.slice(0, 10)} →{' '}
                        {c.published_time_end?.slice(0, 10)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {summarisePlayingHours(c.playing_hours)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <SubmissionsCell summary={c.approval_summary} />
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        justifyContent="center"
                        flexWrap="wrap"
                      >
                        {zoneSlugs.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
                            no assets
                          </Typography>
                        ) : (
                          zoneSlugs.map((z) => (
                            <Chip key={z} label={z} size="small" />
                          ))
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.state}
                        size="small"
                        color={STATE_COLOR[c.state] || 'default'}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip title="Open editor">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`${basePath}/campaigns/${c.id}/edit`)
                          }
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {c.state === 'DRAFT' && (c.assets?.length || 0) > 0 && (
                        <Tooltip title="Publish">
                          <IconButton size="small" onClick={() => handlePublish(c)}>
                            <LaunchIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {c.state === 'PUBLISHED' && (c.assets?.length || 0) > 0 && (
                        <Tooltip title="Submit to venues">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`${basePath}/campaigns/${c.id}/submit`)
                            }
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(hasRole('publisher') || hasRole('admin')) && (
                        <Tooltip title="Delete">
                          <IconButton size="small" onClick={() => handleDelete(c)}>
                            <DeleteOutlineIcon fontSize="small" />
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
    </Box>
  );
};

export default CampaignsManagement;
