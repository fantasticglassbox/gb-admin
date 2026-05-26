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
import { Outlet, OutletType } from '../types';

// Dedicated outlets page for venue_partner users. Skips the
// VenuePartner master/detail (which would leak other venues' rows)
// and goes straight to the outlets list scoped to the user's own
// venue_partner_id from the JWT.
//
// Admin users continue to manage outlets via VenuePartnersManagement
// (master/detail with nested outlets per venue).

const OUTLET_TYPES: OutletType[] = [
  'MALL', 'CONVENIENCE_STORE', 'FNB', 'TRANSIT', 'OFFICE',
  'KOST', 'HOSPITAL', 'GYM', 'SALON', 'EDUCATION', 'GOVERNMENT', 'OTHER',
];

const EMPTY_OUTLET: Partial<Outlet> = {
  display_name: '',
  address: '',
  city: '',
  province: '',
  country: 'Indonesia',
  postal_code: '',
  timezone: 'Asia/Jakarta',
  outlet_type: 'OTHER',
  halal_only: false,
  permitted_categories: '',
  blocked_categories: '',
  operating_hours: '',
  status: 'ACTIVE',
};

const statusChip = (status: string) => {
  const colorMap: Record<string, 'success' | 'warning' | 'default'> = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    DECOMMISSIONED: 'default',
  };
  return <Chip label={status} color={colorMap[status] || 'default'} size="small" />;
};

const VenueOutletsPage: React.FC = () => {
  const { user } = useAuth();
  const venueId = user?.venue_partner_id || '';

  const [rows, setRows] = useState<Outlet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Outlet>>(EMPTY_OUTLET);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!venueId) {
      setError('venue_partner_id missing from your account — contact admin');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.listOutlets({
        page: page + 1,
        limit: rowsPerPage,
        venue_partner_id: venueId,
      });
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load outlets');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, venueId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing({ ...EMPTY_OUTLET, venue_partner_id: venueId });
    setDialogOpen(true);
  };
  const openEdit = (o: Outlet) => {
    setEditing(o);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editing.display_name?.trim()) {
      setError('Display name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await apiService.updateOutlet(editing.id, editing);
        setSuccess('Outlet updated');
      } else {
        await apiService.createOutlet({ ...editing, venue_partner_id: venueId });
        setSuccess('Outlet created');
      }
      setDialogOpen(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">Outlets</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Physical locations under your venue. Each outlet can host one or
            more devices and carries its own compliance policy (halal flag,
            blocked ad categories, operating hours).
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Outlet
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
                <TableCell>Outlet</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>City</TableCell>
                <TableCell>Compliance</TableCell>
                <TableCell>Status</TableCell>
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
                      No outlets yet — click "New Outlet" to add your first location.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {o.display_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {o.address}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={o.outlet_type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{o.city}</TableCell>
                    <TableCell>
                      {o.halal_only && (
                        <Chip label="Halal only" color="success" size="small" sx={{ mr: 0.5 }} />
                      )}
                      {o.blocked_categories && (
                        <Tooltip title={o.blocked_categories}>
                          <Chip label="Block list" size="small" variant="outlined" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>{statusChip(o.status)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(o)}>
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
        <DialogTitle>{editing.id ? 'Edit Outlet' : 'New Outlet'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                required
                label="Display name"
                value={editing.display_name || ''}
                onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={editing.outlet_type || 'OTHER'}
                  label="Type"
                  onChange={(e) => setEditing({ ...editing, outlet_type: e.target.value as OutletType })}
                >
                  {OUTLET_TYPES.map((t) => (
                    <MenuItem key={t} value={t}>{t}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={editing.address || ''}
                onChange={(e) => setEditing({ ...editing, address: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="City"
                value={editing.city || ''}
                onChange={(e) => setEditing({ ...editing, city: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                label="Province"
                value={editing.province || ''}
                onChange={(e) => setEditing({ ...editing, province: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                label="Postal"
                value={editing.postal_code || ''}
                onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                label="Timezone"
                value={editing.timezone || 'Asia/Jakarta'}
                onChange={(e) => setEditing({ ...editing, timezone: e.target.value })}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={!!editing.halal_only}
                    onChange={(e) => setEditing({ ...editing, halal_only: e.target.checked })}
                  />
                }
                label="Halal only"
              />
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editing.status || 'ACTIVE'}
                  label="Status"
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="PAUSED">PAUSED</MenuItem>
                  <MenuItem value="DECOMMISSIONED">DECOMMISSIONED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Blocked categories (CSV)"
                value={editing.blocked_categories || ''}
                onChange={(e) => setEditing({ ...editing, blocked_categories: e.target.value })}
                helperText="Comma-separated. Example: TOBACCO,ALCOHOL,POLITICAL"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Operating hours"
                value={editing.operating_hours || ''}
                onChange={(e) => setEditing({ ...editing, operating_hours: e.target.value })}
                helperText="Format: mon=08:00-22:00,tue=08:00-22:00 — empty = 24/7"
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

export default VenueOutletsPage;
