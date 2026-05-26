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
  Storefront as BrandIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import {
  Advertiser,
  AdvertiserCategory,
  AdvertiserStatus,
  Publisher,
  PublisherKind,
  PublisherStatus,
  PublisherTier,
} from '../types';

const KINDS: PublisherKind[] = ['AGENCY', 'BRAND_DIRECT', 'RESELLER', 'HOUSE'];
const TIERS: PublisherTier[] = ['STRATEGIC', 'STANDARD', 'SELF_SERVE'];
const STATUSES: PublisherStatus[] = ['ACTIVE', 'SUSPENDED', 'CHURNED'];

const ADV_STATUSES: AdvertiserStatus[] = ['ACTIVE', 'PAUSED', 'BLACKLISTED'];
const ADV_CATEGORIES: AdvertiserCategory[] = [
  'FOOD', 'BEVERAGE', 'RETAIL', 'BEAUTY', 'FASHION',
  'TECHNOLOGY', 'AUTOMOTIVE', 'HEALTHCARE', 'FINANCE',
  'EDUCATION', 'TRAVEL', 'ENTERTAINMENT', 'SPORTS',
  'REAL_ESTATE', 'TELCO', 'GOVERNMENT',
  'POLITICAL', 'TOBACCO', 'ALCOHOL', 'GAMBLING',
  'OTHER',
];

// Categories that should auto-flag `requires_regulated_slot` on save
const REGULATED_CATEGORIES: AdvertiserCategory[] = ['POLITICAL', 'TOBACCO', 'ALCOHOL', 'GAMBLING'];

const EMPTY_PUBLISHER: Partial<Publisher> = {
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
  default_commission_pct: 15,
  kind: 'RESELLER',
  tier: 'STANDARD',
  status: 'ACTIVE',
};

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

const PublishersManagement: React.FC = () => {
  // list state
  const [rows, setRows] = useState<Publisher[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // publisher dialog
  const [pubDialogOpen, setPubDialogOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Partial<Publisher>>(EMPTY_PUBLISHER);
  const [savingPub, setSavingPub] = useState(false);

  // advertisers drawer
  const [advsDialogOpen, setAdvsDialogOpen] = useState(false);
  const [advsFor, setAdvsFor] = useState<Publisher | null>(null);
  const [advs, setAdvs] = useState<Advertiser[]>([]);
  const [advsLoading, setAdvsLoading] = useState(false);
  const [advFormOpen, setAdvFormOpen] = useState(false);
  const [editingAdv, setEditingAdv] = useState<Partial<Advertiser>>(EMPTY_ADVERTISER);
  const [savingAdv, setSavingAdv] = useState(false);

  const loadPublishers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { page: page + 1, limit: rowsPerPage };
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      if (kindFilter) filters.kind = kindFilter;
      if (tierFilter) filters.tier = tierFilter;
      const res = await apiService.listPublishers(filters);
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Failed to load publishers');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, statusFilter, kindFilter, tierFilter]);

  useEffect(() => { loadPublishers(); }, [loadPublishers]);

  // publisher CRUD
  const openCreatePub = () => {
    setEditingPub(EMPTY_PUBLISHER);
    setPubDialogOpen(true);
  };
  const openEditPub = (p: Publisher) => {
    setEditingPub(p);
    setPubDialogOpen(true);
  };
  const savePub = async () => {
    setSavingPub(true);
    try {
      if (editingPub.id) {
        await apiService.updatePublisher(editingPub.id, editingPub);
      } else {
        await apiService.createPublisher(editingPub);
      }
      setPubDialogOpen(false);
      await loadPublishers();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setSavingPub(false);
    }
  };

  // advertisers
  const openAdvs = async (p: Publisher) => {
    setAdvsFor(p);
    setAdvsDialogOpen(true);
    setAdvsLoading(true);
    try {
      const res = await apiService.listAdvertisersForPublisher(p.id, { limit: 100 });
      setAdvs(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load advertisers');
    } finally {
      setAdvsLoading(false);
    }
  };
  const openCreateAdv = () => {
    setEditingAdv({ ...EMPTY_ADVERTISER, publisher_id: advsFor?.id });
    setAdvFormOpen(true);
  };
  const openEditAdv = (a: Advertiser) => {
    setEditingAdv(a);
    setAdvFormOpen(true);
  };
  const saveAdv = async () => {
    if (!advsFor) return;
    setSavingAdv(true);
    try {
      // Auto-flag regulated for known categories — saves ops from forgetting.
      const isRegulated = REGULATED_CATEGORIES.includes(editingAdv.category as AdvertiserCategory);
      const payload = {
        ...editingAdv,
        publisher_id: advsFor.id,
        requires_regulated_slot: isRegulated || !!editingAdv.requires_regulated_slot,
      };
      if (editingAdv.id) {
        await apiService.updateAdvertiserV2(editingAdv.id, payload);
      } else {
        await apiService.createAdvertiserV2(payload);
      }
      setAdvFormOpen(false);
      const res = await apiService.listAdvertisersForPublisher(advsFor.id, { limit: 100 });
      setAdvs(res.data);
      await loadPublishers(); // refresh counts
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSavingAdv(false);
    }
  };

  const statusChip = (s: string) => {
    const color: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
      ACTIVE: 'success', SUSPENDED: 'warning', CHURNED: 'default',
      PAUSED: 'warning', BLACKLISTED: 'error',
    };
    return <Chip size="small" label={s} color={color[s] || 'default'} />;
  };

  const kindChipColor: Record<PublisherKind, 'primary' | 'secondary' | 'default' | 'info'> = {
    AGENCY: 'primary',
    BRAND_DIRECT: 'secondary',
    RESELLER: 'info',
    HOUSE: 'default',
  };

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" mb={3} spacing={2}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={600}>Publishers</Typography>
          <Typography variant="body2" color="text.secondary">
            Sellers of ad inventory — agencies, brand-direct buyers, resellers, and platform house sales. Each publisher manages 1+ advertisers (brands).
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadPublishers}><RefreshIcon /></IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreatePub}>
          New publisher
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
            <InputLabel>Kind</InputLabel>
            <Select value={kindFilter} label="Kind"
              onChange={(e) => { setKindFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {KINDS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
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
              <TableCell>Kind</TableCell>
              <TableCell>Tier</TableCell>
              <TableCell>Advertisers</TableCell>
              <TableCell>Commission %</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {search || statusFilter || kindFilter || tierFilter ? 'No match' : 'No publishers yet — onboard your first one'}
                </Typography>
              </TableCell></TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{p.display_name}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2">{p.legal_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.npwp || '—'}</Typography>
                  </TableCell>
                  <TableCell><Chip size="small" label={p.kind} color={kindChipColor[p.kind] || 'default'} variant="outlined" /></TableCell>
                  <TableCell><Chip size="small" label={p.tier} variant="outlined" /></TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<BrandIcon />} onClick={() => openAdvs(p)}>
                      {p.advertiser_count ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell>{p.default_commission_pct?.toFixed(2)}%</TableCell>
                  <TableCell>{statusChip(p.status)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEditPub(p)}><EditIcon fontSize="small" /></IconButton>
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

      {/* ── Publisher create / edit dialog ───────────────────────────── */}
      <Dialog open={pubDialogOpen} onClose={() => setPubDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingPub.id ? 'Edit publisher' : 'New publisher'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Legal name" value={editingPub.legal_name || ''}
                onChange={(e) => setEditingPub({ ...editingPub, legal_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Display name" value={editingPub.display_name || ''}
                onChange={(e) => setEditingPub({ ...editingPub, display_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Kind</InputLabel>
                <Select value={editingPub.kind || 'RESELLER'} label="Kind"
                  onChange={(e) => setEditingPub({ ...editingPub, kind: e.target.value as PublisherKind })}>
                  {KINDS.map((k) => <MenuItem key={k} value={k}>{k}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="NPWP" value={editingPub.npwp || ''}
                onChange={(e) => setEditingPub({ ...editingPub, npwp: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={
                <Switch checked={!!editingPub.pkp_registered}
                  onChange={(e) => setEditingPub({ ...editingPub, pkp_registered: e.target.checked })} />
              } label="PKP registered (VAT)" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Billing address" value={editingPub.billing_address || ''}
                onChange={(e) => setEditingPub({ ...editingPub, billing_address: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Bank / Payout</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Bank name" value={editingPub.bank_name || ''}
                onChange={(e) => setEditingPub({ ...editingPub, bank_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Account number" value={editingPub.bank_account_no || ''}
                onChange={(e) => setEditingPub({ ...editingPub, bank_account_no: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Account owner" value={editingPub.bank_account_owner || ''}
                onChange={(e) => setEditingPub({ ...editingPub, bank_account_owner: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Contact</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Contact name" value={editingPub.contact_name || ''}
                onChange={(e) => setEditingPub({ ...editingPub, contact_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Email" value={editingPub.contact_email || ''}
                onChange={(e) => setEditingPub({ ...editingPub, contact_email: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="WhatsApp (+62…)" value={editingPub.contact_phone_wa || ''}
                onChange={(e) => setEditingPub({ ...editingPub, contact_phone_wa: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Commercial</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth type="number" label="Default commission %"
                value={editingPub.default_commission_pct ?? 15}
                onChange={(e) => setEditingPub({ ...editingPub, default_commission_pct: parseFloat(e.target.value) })}
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                helperText="Publisher's cut of gross billable (Contract overrides win)" />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tier</InputLabel>
                <Select value={editingPub.tier || 'STANDARD'} label="Tier"
                  onChange={(e) => setEditingPub({ ...editingPub, tier: e.target.value as PublisherTier })}>
                  {TIERS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={editingPub.status || 'ACTIVE'} label="Status"
                  onChange={(e) => setEditingPub({ ...editingPub, status: e.target.value as PublisherStatus })}>
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPubDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={savingPub || !editingPub.legal_name || !editingPub.display_name}
            onClick={savePub}>
            {savingPub ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Advertisers dialog ────────────────────────────────────── */}
      <Dialog open={advsDialogOpen} onClose={() => setAdvsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center">
            <Box flex={1}>
              <Typography variant="h6">Advertisers — {advsFor?.display_name}</Typography>
              <Typography variant="caption" color="text.secondary">
                Brands managed by this publisher
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateAdv} sx={{ mr: 1 }}>
              New advertiser
            </Button>
            <IconButton onClick={() => setAdvsDialogOpen(false)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {advsLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : advs.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">No advertisers yet — add the first brand</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Display name</TableCell>
                    <TableCell>Legal name / NPWP</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Regulated</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advs.map((a) => (
                    <TableRow key={a.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{a.display_name}</Typography>
                        {a.contact_email && (
                          <Typography variant="caption" color="text.secondary">{a.contact_email}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{a.legal_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.npwp || '—'}</Typography>
                      </TableCell>
                      <TableCell><Chip size="small" label={a.category} variant="outlined" /></TableCell>
                      <TableCell>
                        {a.requires_regulated_slot
                          ? <Chip size="small" label="Regulated" color="warning" />
                          : '—'}
                      </TableCell>
                      <TableCell>{statusChip(a.status)}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEditAdv(a)}><EditIcon fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Advertiser form dialog ────────────────────────────────── */}
      <Dialog open={advFormOpen} onClose={() => setAdvFormOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingAdv.id ? 'Edit advertiser' : 'New advertiser'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Legal name" value={editingAdv.legal_name || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, legal_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField required fullWidth label="Display / brand name" value={editingAdv.display_name || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, display_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Logo URL (optional)" value={editingAdv.logo_url || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, logo_url: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="NPWP (if billed directly)" value={editingAdv.npwp || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, npwp: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Billing address (if billed directly)"
                value={editingAdv.billing_address || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, billing_address: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Direct contact (optional)</Typography></Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Contact name" value={editingAdv.contact_name || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, contact_name: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="Email" value={editingAdv.contact_email || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, contact_email: e.target.value })} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField fullWidth label="WhatsApp (+62…)" value={editingAdv.contact_phone_wa || ''}
                onChange={(e) => setEditingAdv({ ...editingAdv, contact_phone_wa: e.target.value })} />
            </Grid>

            <Grid item xs={12}><Typography variant="overline" color="text.secondary">Classification</Typography></Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={editingAdv.category || 'OTHER'} label="Category"
                  onChange={(e) => {
                    const cat = e.target.value as AdvertiserCategory;
                    setEditingAdv({
                      ...editingAdv,
                      category: cat,
                      // Auto-flag regulated for known sensitive categories.
                      requires_regulated_slot:
                        REGULATED_CATEGORIES.includes(cat) || !!editingAdv.requires_regulated_slot,
                    });
                  }}>
                  {ADV_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={editingAdv.status || 'ACTIVE'} label="Status"
                  onChange={(e) => setEditingAdv({ ...editingAdv, status: e.target.value as AdvertiserStatus })}>
                  {ADV_STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel control={
                <Switch checked={!!editingAdv.requires_regulated_slot}
                  onChange={(e) => setEditingAdv({ ...editingAdv, requires_regulated_slot: e.target.checked })} />
              } label="Requires regulated slot"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Tobacco / alcohol / political / gambling
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvFormOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={savingAdv || !editingAdv.legal_name || !editingAdv.display_name}
            onClick={saveAdv}>
            {savingAdv ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PublishersManagement;
