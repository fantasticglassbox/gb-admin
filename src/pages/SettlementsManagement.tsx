import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  FormControl,
  Grid,
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
  Add as AddIcon,
  Lock as LockIcon,
  Block as VoidIcon,
  Payments as PayIcon,
  Refresh as RefreshIcon,
  Calculate as CalcIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  CreateEntryResult,
  PaymentMethod,
  Publisher,
  Settlement,
  SettlementStakeholderType,
  SettlementStatus,
  VenuePartner,
} from '../types';

const STAKEHOLDER_TYPES: SettlementStakeholderType[] = ['VENUE', 'PUBLISHER'];
const STATUSES: SettlementStatus[] = ['DRAFT', 'LOCKED', 'PAID', 'VOID'];
const PAY_METHODS: PaymentMethod[] = ['BANK_TRANSFER', 'VA', 'CASH', 'OTHER'];

/** Indonesian Rupiah formatter — "Rp 12.345.678". */
const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

/** YYYY-MM-DD for <input type="date">. */
const todayDate = () => new Date().toISOString().slice(0, 10);

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const endOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

const statusChip = (s: SettlementStatus) => {
  const color: Record<SettlementStatus, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
    DRAFT: 'warning',
    LOCKED: 'info',
    PAID: 'success',
    VOID: 'default',
  };
  return <Chip size="small" label={s} color={color[s]} />;
};

const SettlementsManagement: React.FC = () => {
  // Settlement creation is admin-only. Publishers and venue partners
  // see the same list and KPIs but can't open the entry drawer or
  // mutate rows — settlement is a money-side action that lives with
  // the admin who reconciles gross revenue.
  const { hasRole } = useAuth();
  const canCreate = hasRole('admin');

  // ── list state ──────────────────────────────────────────────────────
  const [rows, setRows] = useState<Settlement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [stakeholderTypeFilter, setStakeholderTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [periodStartFilter, setPeriodStartFilter] = useState<string>(startOfMonth());
  const [periodEndFilter, setPeriodEndFilter] = useState<string>(endOfMonth());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── lookups for the entry form ──────────────────────────────────────
  const [venues, setVenues] = useState<VenuePartner[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  // ── create-entry dialog ─────────────────────────────────────────────
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryVenueId, setEntryVenueId] = useState<string>('');
  const [entryPublisherId, setEntryPublisherId] = useState<string>('');
  const [entryPeriodStart, setEntryPeriodStart] = useState<string>(startOfMonth());
  const [entryPeriodEnd, setEntryPeriodEnd] = useState<string>(endOfMonth());
  const [entryGross, setEntryGross] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [entryVenuePctOverride, setEntryVenuePctOverride] = useState<string>('');
  const [entryPublisherPctOverride, setEntryPublisherPctOverride] = useState<string>('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryResult, setEntryResult] = useState<CreateEntryResult | null>(null);

  // ── mark-paid dialog ────────────────────────────────────────────────
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paySettlement, setPaySettlement] = useState<Settlement | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [payReference, setPayReference] = useState<string>('');
  const [payAt, setPayAt] = useState<string>(todayDate());
  const [payNotes, setPayNotes] = useState<string>('');
  const [savingPay, setSavingPay] = useState(false);

  // ── load lookups once on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [v, p] = await Promise.all([
          apiService.listVenuePartners({ limit: 200, status: 'ACTIVE' }),
          apiService.listPublishers({ limit: 200, status: 'ACTIVE' }),
        ]);
        setVenues(v.data);
        setPublishers(p.data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load lookups');
      } finally {
        setLookupsLoaded(true);
      }
    })();
  }, []);

  const loadSettlements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const filters: any = { page: page + 1, limit: rowsPerPage };
      if (stakeholderTypeFilter) filters.stakeholder_type = stakeholderTypeFilter;
      if (statusFilter) filters.status = statusFilter;
      if (periodStartFilter) filters.period_start_gte = periodStartFilter;
      if (periodEndFilter) filters.period_end_lte = periodEndFilter;
      const res = await apiService.listSettlements(filters);
      setRows(res.data);
      setTotal(res.pagination.total);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, stakeholderTypeFilter, statusFilter, periodStartFilter, periodEndFilter]);

  useEffect(() => { loadSettlements(); }, [loadSettlements]);

  // ── period summary (top KPI strip) ──────────────────────────────────
  const summary = useMemo(() => {
    let venuePayable = 0, pubPayable = 0, paid = 0, draft = 0, locked = 0;
    for (const s of rows) {
      if (s.stakeholder_type === 'VENUE' && s.status !== 'VOID' && s.status !== 'PAID') venuePayable += s.net_idr;
      if (s.stakeholder_type === 'PUBLISHER' && s.status !== 'VOID' && s.status !== 'PAID') pubPayable += s.net_idr;
      if (s.status === 'PAID') paid += s.net_idr;
      if (s.status === 'DRAFT') draft += s.net_idr;
      if (s.status === 'LOCKED') locked += s.net_idr;
    }
    return { venuePayable, pubPayable, paid, draft, locked };
  }, [rows]);

  // ── entry helpers ───────────────────────────────────────────────────
  const resetEntry = () => {
    setEntryVenueId('');
    setEntryPublisherId('');
    setEntryPeriodStart(startOfMonth());
    setEntryPeriodEnd(endOfMonth());
    setEntryGross('');
    setEntryNotes('');
    setEntryVenuePctOverride('');
    setEntryPublisherPctOverride('');
    setEntryResult(null);
  };
  const openEntry = () => { resetEntry(); setEntryDialogOpen(true); };

  /** Live preview of the waterfall as the user types (no network). */
  const livePreview = useMemo(() => {
    const gross = parseFloat(entryGross);
    if (!gross || !entryVenueId || !entryPublisherId) return null;
    const venue = venues.find((v) => v.id === entryVenueId);
    const pub = publishers.find((p) => p.id === entryPublisherId);
    if (!venue || !pub) return null;
    const vp = entryVenuePctOverride !== '' ? parseFloat(entryVenuePctOverride) : venue.default_revenue_share_pct;
    const pp = entryPublisherPctOverride !== '' ? parseFloat(entryPublisherPctOverride) : pub.default_commission_pct;
    if (isNaN(vp) || isNaN(pp) || vp + pp > 100) return null;
    const platformPct = 100 - vp - pp;
    const venueAmt = gross * vp / 100;
    const pubAmt = gross * pp / 100;
    const platformAmt = gross * platformPct / 100;
    const PPH = 0.02;
    return {
      venuePct: vp, pubPct: pp, platformPct,
      venueAmt, venuePph: venueAmt * PPH, venueNet: venueAmt * (1 - PPH),
      pubAmt, pubPph: pubAmt * PPH, pubNet: pubAmt * (1 - PPH),
      platformAmt,
      ppnOnGross: gross * 0.11,
    };
  }, [entryGross, entryVenueId, entryPublisherId, entryVenuePctOverride, entryPublisherPctOverride, venues, publishers]);

  const submitEntry = async () => {
    setSavingEntry(true);
    try {
      const res = await apiService.createSettlementEntry({
        venue_partner_id: entryVenueId,
        publisher_id: entryPublisherId,
        period_start: entryPeriodStart,
        period_end: entryPeriodEnd,
        gross_idr: parseFloat(entryGross),
        notes: entryNotes,
        venue_pct_override: entryVenuePctOverride !== '' ? parseFloat(entryVenuePctOverride) : null,
        publisher_pct_override: entryPublisherPctOverride !== '' ? parseFloat(entryPublisherPctOverride) : null,
      });
      setEntryResult(res);
      await loadSettlements();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
    } finally {
      setSavingEntry(false);
    }
  };

  // ── lock / void / mark-paid ─────────────────────────────────────────
  const lock = async (s: Settlement) => {
    if (!window.confirm(`Lock settlement of ${formatIDR(s.net_idr)}? Numbers can't be edited after.`)) return;
    try {
      await apiService.lockSettlement(s.id);
      await loadSettlements();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Lock failed');
    }
  };
  const voidIt = async (s: Settlement) => {
    if (!window.confirm(`Void this settlement? It stays in the DB for audit but won't be paid.`)) return;
    try {
      await apiService.voidSettlement(s.id);
      await loadSettlements();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Void failed');
    }
  };
  const openPay = (s: Settlement) => {
    setPaySettlement(s);
    setPayMethod('BANK_TRANSFER');
    setPayReference('');
    setPayAt(todayDate());
    setPayNotes('');
    setPayDialogOpen(true);
  };
  const submitPay = async () => {
    if (!paySettlement) return;
    setSavingPay(true);
    try {
      await apiService.markSettlementsPaid({
        settlement_ids: [paySettlement.id],
        method: payMethod,
        reference: payReference,
        paid_at: new Date(payAt).toISOString(),
        notes: payNotes,
      });
      setPayDialogOpen(false);
      await loadSettlements();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Payment recording failed');
    } finally {
      setSavingPay(false);
    }
  };

  // ── name lookups for the row display ────────────────────────────────
  const venueName = (id: string) => venues.find((v) => v.id === id)?.display_name || id.slice(0, 8);
  const publisherName = (id: string) => publishers.find((p) => p.id === id)?.display_name || id.slice(0, 8);
  const stakeholderName = (s: Settlement) =>
    s.stakeholder_type === 'VENUE' ? venueName(s.stakeholder_id) : publisherName(s.stakeholder_id);

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" mb={3} spacing={2}>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={600}>Settlements</Typography>
          <Typography variant="body2" color="text.secondary">
            Revenue waterfall. Enter the gross for a (venue × publisher × period); we compute splits with each side's default %.
          </Typography>
        </Box>
        <Tooltip title="Refresh"><IconButton onClick={loadSettlements}><RefreshIcon /></IconButton></Tooltip>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openEntry} disabled={!lookupsLoaded}>
            New revenue entry
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* KPI strip — for the FILTERED period */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">DRAFT (this filter)</Typography>
            <Typography variant="h6">{formatIDR(summary.draft)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">LOCKED (this filter)</Typography>
            <Typography variant="h6">{formatIDR(summary.locked)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '3px solid', borderColor: 'success.main' }}>
            <Typography variant="caption" color="text.secondary">PAID (this filter)</Typography>
            <Typography variant="h6">{formatIDR(summary.paid)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2, borderLeft: '3px solid', borderColor: 'warning.main' }}>
            <Typography variant="caption" color="text.secondary">Outstanding payable</Typography>
            <Typography variant="h6">{formatIDR(summary.venuePayable + summary.pubPayable)}</Typography>
            <Typography variant="caption" color="text.secondary">
              Venue {formatIDR(summary.venuePayable)} · Publisher {formatIDR(summary.pubPayable)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <Select value={stakeholderTypeFilter} label="Type"
              onChange={(e) => { setStakeholderTypeFilter(e.target.value); setPage(0); }}>
              <MenuItem value="">All</MenuItem>
              {STAKEHOLDER_TYPES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
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
          <TextField size="small" type="date" label="Period from"
            InputLabelProps={{ shrink: true }}
            value={periodStartFilter}
            onChange={(e) => { setPeriodStartFilter(e.target.value); setPage(0); }} />
          <TextField size="small" type="date" label="Period to"
            InputLabelProps={{ shrink: true }}
            value={periodEndFilter}
            onChange={(e) => { setPeriodEndFilter(e.target.value); setPage(0); }} />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Stakeholder</TableCell>
              <TableCell align="right">Source gross</TableCell>
              <TableCell align="right">Split %</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">PPh 23 (2%)</TableCell>
              <TableCell align="right">Net payable</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">No settlements match. Create a new revenue entry to start.</Typography>
              </TableCell></TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.period_start.slice(0, 10)} → {s.period_end.slice(0, 10)}</TableCell>
                  <TableCell><Chip size="small" label={s.stakeholder_type} variant="outlined" /></TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{stakeholderName(s)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.stakeholder_type === 'VENUE'
                        ? `via ${publisherName(s.source_publisher_id)}`
                        : `via ${venueName(s.source_venue_partner_id)}`}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatIDR(s.source_gross_idr)}</TableCell>
                  <TableCell align="right">{s.split_pct.toFixed(2)}%</TableCell>
                  <TableCell align="right">{formatIDR(s.amount_idr)}</TableCell>
                  <TableCell align="right">{formatIDR(s.pph23_idr)}</TableCell>
                  <TableCell align="right"><b>{formatIDR(s.net_idr)}</b></TableCell>
                  <TableCell>{statusChip(s.status)}</TableCell>
                  <TableCell align="right">
                    {/* Mutating row actions (Lock / Mark paid / Void)
                        are admin-only — publishers and venue
                        partners get a read-only view. */}
                    {canCreate && s.status === 'DRAFT' && (
                      <>
                        <Tooltip title="Lock"><IconButton size="small" onClick={() => lock(s)}><LockIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Void"><IconButton size="small" onClick={() => voidIt(s)}><VoidIcon fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                    {canCreate && s.status === 'LOCKED' && (
                      <>
                        <Tooltip title="Mark paid"><IconButton size="small" color="primary" onClick={() => openPay(s)}><PayIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Void"><IconButton size="small" onClick={() => voidIt(s)}><VoidIcon fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                    {s.status === 'PAID' && s.paid_at && (
                      <Typography variant="caption" color="text.secondary">
                        Paid {new Date(s.paid_at).toLocaleDateString('id-ID')}
                      </Typography>
                    )}
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
          rowsPerPageOptions={[25, 50, 100]}
        />
      </TableContainer>

      {/* ── Create entry dialog ─────────────────────────────────────── */}
      <Dialog open={entryDialogOpen} onClose={() => setEntryDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center">
            <Box flex={1}>
              <Typography variant="h6">New revenue entry</Typography>
              <Typography variant="caption" color="text.secondary">
                Manual gross for a (venue × publisher × period). We compute splits.
              </Typography>
            </Box>
            <IconButton onClick={() => setEntryDialogOpen(false)}><CloseIcon /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {entryResult ? (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Entry created. {entryResult.settlements.length} settlement rows generated (source {entryResult.source_id.slice(0, 8)}…).
              </Alert>
              <Typography variant="overline" color="text.secondary">Waterfall</Typography>
              <Paper sx={{ p: 2, mt: 1 }}>
                <Stack spacing={1}>
                  {entryResult.settlements.map((s) => (
                    <Stack direction="row" key={s.id}>
                      <Typography sx={{ flex: 1 }}>
                        {s.stakeholder_type} · {stakeholderName(s)} ({s.split_pct.toFixed(2)}%)
                      </Typography>
                      <Typography>{formatIDR(s.net_idr)} net</Typography>
                    </Stack>
                  ))}
                  <Divider />
                  <Stack direction="row">
                    <Typography sx={{ flex: 1 }} color="text.secondary">
                      Platform keep ({entryResult.platform_pct.toFixed(2)}%)
                    </Typography>
                    <Typography color="text.secondary">{formatIDR(entryResult.platform_idr)}</Typography>
                  </Stack>
                </Stack>
              </Paper>
              <Box mt={2} textAlign="right">
                <Button onClick={() => { resetEntry(); }}>Create another</Button>
                <Button variant="contained" onClick={() => setEntryDialogOpen(false)} sx={{ ml: 1 }}>Done</Button>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Venue partner</InputLabel>
                  <Select value={entryVenueId} label="Venue partner"
                    onChange={(e) => setEntryVenueId(e.target.value)}>
                    {venues.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.display_name} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({v.default_revenue_share_pct.toFixed(2)}%)</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Publisher</InputLabel>
                  <Select value={entryPublisherId} label="Publisher"
                    onChange={(e) => setEntryPublisherId(e.target.value)}>
                    {publishers.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.display_name} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>({p.default_commission_pct.toFixed(2)}%)</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6} md={4}>
                <TextField required fullWidth type="date" label="Period start"
                  InputLabelProps={{ shrink: true }}
                  value={entryPeriodStart} onChange={(e) => setEntryPeriodStart(e.target.value)} />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField required fullWidth type="date" label="Period end"
                  InputLabelProps={{ shrink: true }}
                  value={entryPeriodEnd} onChange={(e) => setEntryPeriodEnd(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField required fullWidth type="number" label="Gross IDR"
                  value={entryGross} onChange={(e) => setEntryGross(e.target.value)}
                  inputProps={{ min: 0, step: 1 }}
                  helperText={entryGross ? formatIDR(parseFloat(entryGross) || 0) : ' '} />
              </Grid>

              <Grid item xs={6} md={4}>
                <TextField fullWidth type="number" label="Venue % override (optional)"
                  value={entryVenuePctOverride}
                  onChange={(e) => setEntryVenuePctOverride(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  helperText="Blank = use venue default" />
              </Grid>
              <Grid item xs={6} md={4}>
                <TextField fullWidth type="number" label="Publisher % override (optional)"
                  value={entryPublisherPctOverride}
                  onChange={(e) => setEntryPublisherPctOverride(e.target.value)}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  helperText="Blank = use publisher default" />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} label="Notes" value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)} />
              </Grid>

              {livePreview && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <CalcIcon fontSize="small" color="action" />
                      <Typography variant="overline" color="text.secondary">Waterfall preview</Typography>
                    </Stack>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Venue ({livePreview.venuePct.toFixed(2)}%)</Typography>
                        <Typography>{formatIDR(livePreview.venueAmt)}</Typography>
                        <Typography variant="caption" color="text.secondary">net {formatIDR(livePreview.venueNet)} (−PPh23)</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Publisher ({livePreview.pubPct.toFixed(2)}%)</Typography>
                        <Typography>{formatIDR(livePreview.pubAmt)}</Typography>
                        <Typography variant="caption" color="text.secondary">net {formatIDR(livePreview.pubNet)} (−PPh23)</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">Platform keep ({livePreview.platformPct.toFixed(2)}%)</Typography>
                        <Typography>{formatIDR(livePreview.platformAmt)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">PPN to advertiser (11%, on top)</Typography>
                        <Typography>{formatIDR(livePreview.ppnOnGross)}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        {!entryResult && (
          <DialogActions>
            <Button onClick={() => setEntryDialogOpen(false)}>Cancel</Button>
            <Button variant="contained"
              disabled={savingEntry || !entryVenueId || !entryPublisherId || !parseFloat(entryGross)}
              onClick={submitEntry}>
              {savingEntry ? <CircularProgress size={20} /> : 'Create entry'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* ── Mark-paid dialog ────────────────────────────────────────── */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record payment</DialogTitle>
        <DialogContent dividers>
          {paySettlement && (
            <>
              <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Settlement</Typography>
                <Typography variant="body2">
                  {paySettlement.stakeholder_type} · {stakeholderName(paySettlement)}
                  &nbsp;· {paySettlement.period_start.slice(0, 10)} → {paySettlement.period_end.slice(0, 10)}
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>{formatIDR(paySettlement.net_idr)} net</Typography>
              </Paper>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Method</InputLabel>
                    <Select value={payMethod} label="Method" onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}>
                      {PAY_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField fullWidth type="date" label="Paid at"
                    InputLabelProps={{ shrink: true }}
                    value={payAt} onChange={(e) => setPayAt(e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Reference (transfer no., VA, receipt)"
                    value={payReference} onChange={(e) => setPayReference(e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth multiline minRows={2} label="Notes"
                    value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={savingPay} onClick={submitPay}>
            {savingPay ? <CircularProgress size={20} /> : 'Record payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettlementsManagement;
