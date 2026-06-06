import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
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
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { VenuePartner, VenuePartnerStatus } from '../types';

const STATUSES: VenuePartnerStatus[] = ['ACTIVE', 'SUSPENDED', 'CHURNED'];

const EMPTY_PARTNER: Partial<VenuePartner> = {
  legal_name: '',
  display_name: '',
  npwp: '',
  pkp_registered: false,
  billing_address: '',
  bank_name: '',
  bank_account_no: '',
  bank_account_owner: '',
  contact_name: '',
  contact_email: '',
  contact_phone_wa: '',
  default_revenue_share_pct: 50,
  status: 'ACTIVE',
};

const VenuePartnersManagement: React.FC = () => {
  // ── list state ──────────────────────────────────────────────────────
  const [rows, setRows] = useState<VenuePartner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── partner dialog ──────────────────────────────────────────────────
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<VenuePartner>>(EMPTY_PARTNER);
  const [savingPartner, setSavingPartner] = useState(false);

  // Outlet management moved to /admin/outlets (its own page). The
  // nested master-detail that used to live here is gone — admin
  // navigates between the two pages instead. Removing the nesting
  // also removed: outletsDialogOpen, outlets list state, outlet form
  // state, the openOutlets/openCreateOutlet/openEditOutlet/saveOutlet
  // handlers, and the per-row "Outlets (N)" button.

  const loadPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { page: page + 1, limit: rowsPerPage };
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      const res = await apiService.listVenuePartners(filters);
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load venue partners');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  // ── partner CRUD ────────────────────────────────────────────────────
  const openCreatePartner = () => {
    setEditingPartner(EMPTY_PARTNER);
    setPartnerDialogOpen(true);
  };
  const openEditPartner = (vp: VenuePartner) => {
    setEditingPartner(vp);
    setPartnerDialogOpen(true);
  };
  const savePartner = async () => {
    setSavingPartner(true);
    try {
      if (editingPartner.id) {
        await apiService.updateVenuePartner(editingPartner.id, editingPartner);
      } else {
        await apiService.createVenuePartner(editingPartner);
      }
      setPartnerDialogOpen(false);
      await loadPartners();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setSavingPartner(false);
    }
  };


  // ── render helpers ─────────────────────────────────────────────────
  const statusChip = (s: VenuePartnerStatus) => {
    const color: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
      ACTIVE: 'success', SUSPENDED: 'warning', CHURNED: 'default',
      PAUSED: 'warning', DECOMMISSIONED: 'default',
    };
    return <Chip size="small" label={s} color={color[s] || 'default'} />;
  };

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" mb={3} spacing={2}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={600}>Venue Partners</Typography>
          <Typography variant="body2" color="text.secondary">
            Landlord / tenant chains that host screens. Each partner has one or more outlets.
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadPartners}><RefreshIcon /></IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreatePartner}>
          New venue partner
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search legal / display name…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status"
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Display name</TableCell>
              <TableCell>Legal name / NPWP</TableCell>
              <TableCell>Rev-share %</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {search || statusFilter ? 'No match' : 'No venue partners yet — onboard your first one'}
                </Typography>
              </TableCell></TableRow>
            ) : (
              rows.map((vp) => (
                <TableRow key={vp.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{vp.display_name}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2">{vp.legal_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{vp.npwp || '—'}</Typography>
                  </TableCell>
                  <TableCell>{vp.default_revenue_share_pct?.toFixed(2)}%</TableCell>
                  <TableCell>{statusChip(vp.status)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditPartner(vp)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </TableContainer>

      {/* ── Venue Partner create / edit drawer ───────────────────────── */}
      <Drawer
        anchor="right"
        open={partnerDialogOpen}
        onClose={() => setPartnerDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
      >
        <DialogTitle>
          {editingPartner.id ? 'Edit venue partner' : 'New venue partner'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Legal name" value={editingPartner.legal_name || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, legal_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Display name" value={editingPartner.display_name || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, display_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="NPWP" value={editingPartner.npwp || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, npwp: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel control={
                <Switch checked={!!editingPartner.pkp_registered}
                  onChange={(e) => setEditingPartner({ ...editingPartner, pkp_registered: e.target.checked })} />
              } label="PKP registered (VAT)" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Billing address" value={editingPartner.billing_address || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, billing_address: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Bank / Payout</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Bank name" value={editingPartner.bank_name || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, bank_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Account number" value={editingPartner.bank_account_no || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, bank_account_no: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Account owner" value={editingPartner.bank_account_owner || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, bank_account_owner: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Contact</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Contact name" value={editingPartner.contact_name || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, contact_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Email" value={editingPartner.contact_email || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, contact_email: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="WhatsApp (+62…)" value={editingPartner.contact_phone_wa || ''}
                onChange={(e) => setEditingPartner({ ...editingPartner, contact_phone_wa: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Commercial</Typography></Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Default rev-share %"
                value={editingPartner.default_revenue_share_pct ?? 50}
                onChange={(e) => setEditingPartner({ ...editingPartner, default_revenue_share_pct: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 100, step: 0.01 }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={editingPartner.status || 'ACTIVE'} label="Status"
                  onChange={(e) => setEditingPartner({ ...editingPartner, status: e.target.value as VenuePartnerStatus })}>
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPartnerDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={savingPartner || !editingPartner.legal_name || !editingPartner.display_name}
            onClick={savePartner}>
            {savingPartner ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Drawer>


    </Box>
  );
};

export default VenuePartnersManagement;
