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
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
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
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Advertiser, AdvertiserCategory, AdvertiserStatus } from '../types';
import { pageHeaderSx } from '../utils/responsive';

// Dedicated advertisers page for publisher users. Skips the
// PublishersManagement master/detail (which is the admin UI for managing
// all publishers + their nested advertisers) and goes straight to the
// publisher's own brand list — scoped to the user's publisher_id from
// the JWT.
//
// Admin users continue to manage advertisers via PublishersManagement
// (master/detail with nested advertisers per publisher).

const CATEGORIES: AdvertiserCategory[] = [
  'FOOD', 'BEVERAGE', 'RETAIL', 'BEAUTY', 'FASHION',
  'TECHNOLOGY', 'AUTOMOTIVE', 'HEALTHCARE', 'FINANCE',
  'EDUCATION', 'TRAVEL', 'ENTERTAINMENT', 'SPORTS',
  'REAL_ESTATE', 'TELCO', 'GOVERNMENT',
  'POLITICAL', 'TOBACCO', 'ALCOHOL', 'GAMBLING',
  'OTHER',
];

// Booking flow blocks these on most outlets; auto-flag the
// requires_regulated_slot toggle when one of them is picked.
const REGULATED_CATEGORIES = new Set<AdvertiserCategory>([
  'POLITICAL', 'TOBACCO', 'ALCOHOL', 'GAMBLING',
]);

const STATUSES: AdvertiserStatus[] = ['ACTIVE', 'PAUSED', 'BLACKLISTED'];

const EMPTY_ADVERTISER: Partial<Advertiser> = {
  legal_name: '',
  display_name: '',
  logo_url: '',
  npwp: '',
  billing_address: '',
  contact_name: '',
  contact_email: '',
  contact_phone_wa: '',
  category: 'OTHER',
  status: 'ACTIVE',
  requires_regulated_slot: false,
};

const statusChip = (status: AdvertiserStatus) => {
  const colorMap: Record<AdvertiserStatus, 'success' | 'warning' | 'error'> = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    BLACKLISTED: 'error',
  };
  return <Chip label={status} color={colorMap[status]} size="small" />;
};

const PublisherAdvertisersPage: React.FC = () => {
  const { user } = useAuth();
  const publisherId = user?.publisher_id || '';

  const [rows, setRows] = useState<Advertiser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Advertiser>>(EMPTY_ADVERTISER);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!publisherId) {
      setError('publisher_id missing from your account — contact admin');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      // Backend forces publisher_id from the JWT for the publisher
      // role, so passing it explicitly is belt-and-braces.
      const res = await apiService.listAdvertisersV2({
        page: page + 1,
        limit: rowsPerPage,
        publisher_id: publisherId,
      });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load advertisers');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, publisherId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing({ ...EMPTY_ADVERTISER, publisher_id: publisherId });
    setDialogOpen(true);
  };
  const openEdit = (a: Advertiser) => {
    setEditing(a);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editing.display_name?.trim() || !editing.legal_name?.trim()) {
      setError('Legal name and display name are required');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await apiService.updateAdvertiserV2(editing.id, editing);
        setSuccess('Advertiser updated');
      } else {
        await apiService.createAdvertiserV2({ ...editing, publisher_id: publisherId });
        setSuccess('Advertiser created');
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Auto-flag regulated-slot when a sensitive category is picked, so
  // the publisher knows upfront that most outlets will block this brand.
  const onCategoryChange = (cat: AdvertiserCategory) => {
    setEditing({
      ...editing,
      category: cat,
      requires_regulated_slot: REGULATED_CATEGORIES.has(cat),
    });
  };

  return (
    <Box>
      <Box sx={pageHeaderSx}>
        <Box>
          <Typography variant="h4">Advertisers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Brands you sell on behalf of. Each ad creative you upload must
            belong to one of these — pick from this list when creating an
            Advertisement.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Advertiser
        </Button>
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
        <Box p={2} display="flex" gap={2}>
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
                <TableCell>Brand</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
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
                    <Typography variant="body2" color="text.secondary">
                      No advertisers yet — click "New Advertiser" to add your first brand.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {a.display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.legal_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={a.category} size="small" variant="outlined" />
                      {a.requires_regulated_slot && (
                        <Tooltip title="Booking is blocked on outlets that block this category">
                          <Chip label="REGULATED" color="warning" size="small" sx={{ ml: 0.5 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {a.contact_name || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.contact_email}
                      </Typography>
                    </TableCell>
                    <TableCell>{statusChip(a.status)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(a)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing.id ? 'Edit Advertiser' : 'New Advertiser'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Legal name"
                value={editing.legal_name || ''}
                onChange={(e) => setEditing({ ...editing, legal_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Display name"
                value={editing.display_name || ''}
                onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
                helperText="Shown in the booking flow + venue approval UI."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={editing.category || 'OTHER'}
                  label="Category"
                  onChange={(e) => onCategoryChange(e.target.value as AdvertiserCategory)}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editing.status || 'ACTIVE'}
                  label="Status"
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as AdvertiserStatus })}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!editing.requires_regulated_slot}
                    onChange={(e) => setEditing({ ...editing, requires_regulated_slot: e.target.checked })}
                  />
                }
                label="Requires regulated slot (tobacco / alcohol / political / gambling)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="NPWP"
                value={editing.npwp || ''}
                onChange={(e) => setEditing({ ...editing, npwp: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Logo URL"
                value={editing.logo_url || ''}
                onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Billing address"
                value={editing.billing_address || ''}
                onChange={(e) => setEditing({ ...editing, billing_address: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Contact name"
                value={editing.contact_name || ''}
                onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Contact email"
                value={editing.contact_email || ''}
                onChange={(e) => setEditing({ ...editing, contact_email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="WhatsApp"
                value={editing.contact_phone_wa || ''}
                onChange={(e) => setEditing({ ...editing, contact_phone_wa: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={save} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PublisherAdvertisersPage;
