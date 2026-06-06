import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
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
  FilterAltOff as ClearFilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { Advertiser, AdvertiserCategory, Publisher } from '../types';

const CATEGORIES: AdvertiserCategory[] = [
  'FOOD', 'BEVERAGE', 'RETAIL', 'BEAUTY', 'FASHION',
  'TECHNOLOGY', 'AUTOMOTIVE', 'HEALTHCARE', 'FINANCE',
  'EDUCATION', 'TRAVEL', 'ENTERTAINMENT', 'SPORTS',
  'REAL_ESTATE', 'TELCO', 'GOVERNMENT',
  'POLITICAL', 'TOBACCO', 'ALCOHOL', 'GAMBLING', 'OTHER',
];

// Categories the backend treats as "regulated" — admin can override
// per-advertiser but this is the sensible default for the toggle.
const DEFAULT_REGULATED: AdvertiserCategory[] = ['POLITICAL', 'TOBACCO', 'ALCOHOL', 'GAMBLING'];

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

// Admin-side Advertisers page. Lists every advertiser across every
// publisher, with a publisher filter on top. Starts empty so an
// admin opening this page on a fleet with thousands of advertisers
// doesn't fire a giant list — they pick a publisher first.
//
// Distinct from /admin/publishers (which lets you manage publishers
// themselves) and from PublisherAdvertisersPage (the publisher-side
// scoped view).
const AdminAdvertisersPage: React.FC = () => {
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [publisher, setPublisher] = useState<Publisher | null>(null);

  const [rows, setRows] = useState<Advertiser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Inline edit / create drawer state.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Advertiser>>(EMPTY_ADVERTISER);
  const [saving, setSaving] = useState(false);

  // Load the publisher list once for the filter dropdown. Limit
  // generous because the dropdown is searchable.
  useEffect(() => {
    apiService
      .listPublishers({ limit: 1000 })
      .then((r) => setPublishers(r.data))
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load publishers'));
  }, []);

  const load = useCallback(async () => {
    if (!publisher) {
      // Empty state — table stays blank until admin scopes the view.
      setRows([]);
      setTotal(0);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listAdvertisersV2({
        page: page + 1,
        limit: rowsPerPage,
        publisher_id: publisher.id,
      });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load advertisers');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, publisher]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!editing.display_name?.trim() && !editing.legal_name?.trim()) {
      setError('Display name or legal name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await apiService.updateAdvertiserV2(editing.id, editing);
        setSuccess('Advertiser updated');
      } else {
        await apiService.createAdvertiserV2({
          ...editing,
          publisher_id: editing.publisher_id || publisher?.id,
        });
        setSuccess('Advertiser created');
      }
      setDrawerOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Advertisers</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            All advertisers across the platform, grouped under their
            owning publisher. Pick a publisher to see its book.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            if (!publisher) return;
            setEditing({ ...EMPTY_ADVERTISER, publisher_id: publisher.id });
            setDrawerOpen(true);
          }}
          disabled={!publisher}
        >
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

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Autocomplete
            value={publisher}
            onChange={(_, v) => {
              setPublisher(v);
              setPage(0);
            }}
            options={publishers}
            getOptionLabel={(p) => p.display_name || p.legal_name || p.id}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{ minWidth: 320 }}
            renderInput={(params) => (
              <TextField {...params} label="Publisher" placeholder="Pick a publisher" />
            )}
          />
          {publisher && (
            <Tooltip title="Clear filter">
              <IconButton size="small" onClick={() => setPublisher(null)}>
                <ClearFilterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
          <Button startIcon={<RefreshIcon />} onClick={load} disabled={!publisher || loading}>
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Advertiser</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!publisher ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Pick a publisher above to view its advertisers.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No advertisers under this publisher yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {a.display_name || a.legal_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.legal_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.category}
                        size="small"
                        variant="outlined"
                        color={a.requires_regulated_slot ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{a.contact_name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.contact_email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.status}
                        size="small"
                        color={a.status === 'ACTIVE' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditing(a);
                            setDrawerOpen(true);
                          }}
                        >
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
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      {/* Create / edit drawer — same shape as the publisher-scoped
          advertiser drawer, but admin can move an advertiser between
          publishers via the publisher_id select. */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 640 } } }}
      >
        <DialogTitle>
          {editing.id ? 'Edit Advertiser' : 'New Advertiser'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Publisher</InputLabel>
                <Select
                  value={editing.publisher_id || ''}
                  label="Publisher"
                  onChange={(e) =>
                    setEditing({ ...editing, publisher_id: e.target.value as string })
                  }
                >
                  {publishers.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.display_name || p.legal_name || p.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Display name"
                value={editing.display_name || ''}
                onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Legal name"
                value={editing.legal_name || ''}
                onChange={(e) => setEditing({ ...editing, legal_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={editing.category || 'OTHER'}
                  label="Category"
                  onChange={(e) => {
                    const cat = e.target.value as AdvertiserCategory;
                    setEditing({
                      ...editing,
                      category: cat,
                      // Auto-flip the regulated toggle if the admin hasn't
                      // explicitly diverged from the default for the
                      // new category.
                      requires_regulated_slot: DEFAULT_REGULATED.includes(cat)
                        ? true
                        : editing.requires_regulated_slot && !DEFAULT_REGULATED.includes(editing.category || 'OTHER'),
                    });
                  }}
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
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="PAUSED">PAUSED</MenuItem>
                  <MenuItem value="BLACKLISTED">BLACKLISTED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!editing.requires_regulated_slot}
                    onChange={(e) =>
                      setEditing({ ...editing, requires_regulated_slot: e.target.checked })
                    }
                  />
                }
                label="Regulated (booking enforces against per-outlet block list)"
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
                onChange={(e) =>
                  setEditing({ ...editing, billing_address: e.target.value })
                }
                multiline
                rows={2}
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
                onChange={(e) =>
                  setEditing({ ...editing, contact_phone_wa: e.target.value })
                }
                placeholder="+62..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDrawerOpen(false)}>Cancel</Button>
          <Button onClick={save} variant="contained" disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Drawer>
    </Box>
  );
};

export default AdminAdvertisersPage;
