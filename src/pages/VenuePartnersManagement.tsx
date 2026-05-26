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
  Storefront as OutletIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import {
  Outlet,
  OutletType,
  VenuePartner,
  VenuePartnerStatus,
  VenuePartnerTier,
} from '../types';

const TIERS: VenuePartnerTier[] = ['NATIONAL', 'REGIONAL', 'SINGLE'];
const STATUSES: VenuePartnerStatus[] = ['ACTIVE', 'SUSPENDED', 'CHURNED'];
const OUTLET_TYPES: OutletType[] = [
  'MALL', 'CONVENIENCE_STORE', 'FNB', 'TRANSIT', 'OFFICE',
  'KOST', 'HOSPITAL', 'GYM', 'SALON', 'EDUCATION', 'GOVERNMENT', 'OTHER',
];

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
  tier: 'SINGLE',
  status: 'ACTIVE',
};

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

const VenuePartnersManagement: React.FC = () => {
  // ── list state ──────────────────────────────────────────────────────
  const [rows, setRows] = useState<VenuePartner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── partner dialog ──────────────────────────────────────────────────
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<VenuePartner>>(EMPTY_PARTNER);
  const [savingPartner, setSavingPartner] = useState(false);

  // ── outlets drawer/dialog ───────────────────────────────────────────
  const [outletsDialogOpen, setOutletsDialogOpen] = useState(false);
  const [outletsFor, setOutletsFor] = useState<VenuePartner | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);
  const [outletFormOpen, setOutletFormOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Partial<Outlet>>(EMPTY_OUTLET);
  const [savingOutlet, setSavingOutlet] = useState(false);

  const loadPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { page: page + 1, limit: rowsPerPage };
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      if (tierFilter) filters.tier = tierFilter;
      const res = await apiService.listVenuePartners(filters);
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load venue partners');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, tierFilter]);

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

  // ── outlets ────────────────────────────────────────────────────────
  const openOutlets = async (vp: VenuePartner) => {
    setOutletsFor(vp);
    setOutletsDialogOpen(true);
    setOutletsLoading(true);
    try {
      const res = await apiService.listOutletsForVenuePartner(vp.id, { limit: 100 });
      setOutlets(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load outlets');
    } finally {
      setOutletsLoading(false);
    }
  };
  const openCreateOutlet = () => {
    setEditingOutlet({ ...EMPTY_OUTLET, venue_partner_id: outletsFor?.id });
    setOutletFormOpen(true);
  };
  const openEditOutlet = (o: Outlet) => {
    setEditingOutlet(o);
    setOutletFormOpen(true);
  };
  const saveOutlet = async () => {
    if (!outletsFor) return;
    setSavingOutlet(true);
    try {
      if (editingOutlet.id) {
        await apiService.updateOutlet(editingOutlet.id, editingOutlet);
      } else {
        await apiService.createOutlet({ ...editingOutlet, venue_partner_id: outletsFor.id });
      }
      setOutletFormOpen(false);
      // refresh outlets list + partner row (for outlet_count)
      const res = await apiService.listOutletsForVenuePartner(outletsFor.id, { limit: 100 });
      setOutlets(res.data);
      await loadPartners();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSavingOutlet(false);
    }
  };

  // ── render helpers ─────────────────────────────────────────────────
  const statusChip = (s: VenuePartnerStatus | OutletStatus) => {
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
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Tier</InputLabel>
            <Select value={tierFilter} label="Tier"
              onChange={(e) => { setTierFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
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
              <TableCell>Tier</TableCell>
              <TableCell>Outlets</TableCell>
              <TableCell>Rev-share %</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {search || statusFilter || tierFilter ? 'No match' : 'No venue partners yet — onboard your first one'}
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
                  <TableCell><Chip size="small" label={vp.tier} variant="outlined" /></TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<OutletIcon />} onClick={() => openOutlets(vp)}>
                      {vp.outlet_count ?? 0}
                    </Button>
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

      {/* ── Venue Partner create / edit dialog ───────────────────────── */}
      <Dialog open={partnerDialogOpen} onClose={() => setPartnerDialogOpen(false)} maxWidth="md" fullWidth>
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
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="number" label="Default rev-share %"
                value={editingPartner.default_revenue_share_pct ?? 50}
                onChange={(e) => setEditingPartner({ ...editingPartner, default_revenue_share_pct: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 100, step: 0.01 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select value={editingPartner.tier || 'SINGLE'} label="Tier"
                  onChange={(e) => setEditingPartner({ ...editingPartner, tier: e.target.value as VenuePartnerTier })}>
                  {TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
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
      </Dialog>

      {/* ── Outlets dialog (master-detail) ───────────────────────────── */}
      <Dialog open={outletsDialogOpen} onClose={() => setOutletsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center">
            <Box flex={1}>
              <Typography variant="h6">Outlets — {outletsFor?.display_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                Physical locations under this venue partner
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateOutlet} sx={{ mr: 1 }}>
              New outlet
            </Button>
            <IconButton onClick={() => setOutletsDialogOpen(false)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {outletsLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : outlets.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">No outlets yet — add the first one</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Display name</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Halal</TableCell>
                    <TableCell>Blocked categories</TableCell>
                    <TableCell>Rev-share</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {outlets.map((o) => (
                    <TableRow key={o.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{o.display_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{o.address}</Typography>
                      </TableCell>
                      <TableCell>{o.city}</TableCell>
                      <TableCell><Chip size="small" label={o.outlet_type} variant="outlined" /></TableCell>
                      <TableCell>{o.halal_only ? <Chip size="small" label="Halal only" color="success" /> : '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {o.blocked_categories || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {o.revenue_share_pct_override != null
                          ? `${o.revenue_share_pct_override.toFixed(2)}% (override)`
                          : `${outletsFor?.default_revenue_share_pct?.toFixed(2) ?? '—'}%`}
                      </TableCell>
                      <TableCell>{statusChip(o.status)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditOutlet(o)}><EditIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Outlet form dialog ───────────────────────────────────────── */}
      <Dialog open={outletFormOpen} onClose={() => setOutletFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingOutlet.id ? 'Edit outlet' : 'New outlet'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Display name" value={editingOutlet.display_name || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, display_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Outlet type</InputLabel>
                <Select value={editingOutlet.outlet_type || 'OTHER'} label="Outlet type"
                  onChange={(e) => setEditingOutlet({ ...editingOutlet, outlet_type: e.target.value as OutletType })}>
                  {OUTLET_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Address" value={editingOutlet.address || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, address: e.target.value })} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth label="City" value={editingOutlet.city || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, city: e.target.value })} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth label="Province" value={editingOutlet.province || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, province: e.target.value })} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth label="Postal" value={editingOutlet.postal_code || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, postal_code: e.target.value })} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select value={editingOutlet.timezone || 'Asia/Jakarta'} label="Timezone"
                  onChange={(e) => setEditingOutlet({ ...editingOutlet, timezone: e.target.value })}>
                  <MenuItem value="Asia/Jakarta">WIB · Asia/Jakarta</MenuItem>
                  <MenuItem value="Asia/Makassar">WITA · Asia/Makassar</MenuItem>
                  <MenuItem value="Asia/Jayapura">WIT · Asia/Jayapura</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Compliance</Typography></Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={
                <Switch checked={!!editingOutlet.halal_only}
                  onChange={(e) => setEditingOutlet({ ...editingOutlet, halal_only: e.target.checked })} />
              } label="Halal only" />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField fullWidth label="Blocked categories (CSV)"
                placeholder="TOBACCO,ALCOHOL,POLITICAL"
                value={editingOutlet.blocked_categories || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, blocked_categories: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Operating hours (HH:MM-HH:MM, comma per-day, blank = 24/7)"
                placeholder="mon=08:00-22:00,tue=08:00-22:00,..."
                value={editingOutlet.operating_hours || ''}
                onChange={(e) => setEditingOutlet({ ...editingOutlet, operating_hours: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Commercial</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="number" label="Rev-share % override (optional)"
                value={editingOutlet.revenue_share_pct_override ?? ''}
                onChange={(e) => setEditingOutlet({
                  ...editingOutlet,
                  revenue_share_pct_override: e.target.value === '' ? null : parseFloat(e.target.value),
                })}
                helperText={`Inherits ${outletsFor?.default_revenue_share_pct?.toFixed(2) ?? '—'}% if left blank`}
                inputProps={{ min: 0, max: 100, step: 0.01 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={editingOutlet.status || 'ACTIVE'} label="Status"
                  onChange={(e) => setEditingOutlet({ ...editingOutlet, status: e.target.value as OutletStatus })}>
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="PAUSED">PAUSED</MenuItem>
                  <MenuItem value="DECOMMISSIONED">DECOMMISSIONED</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutletFormOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={savingOutlet || !editingOutlet.display_name}
            onClick={saveOutlet}>
            {savingOutlet ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

// re-export the OutletStatus type from index for the helper function above
type OutletStatus = 'ACTIVE' | 'PAUSED' | 'DECOMMISSIONED';

export default VenuePartnersManagement;
