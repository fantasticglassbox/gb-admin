import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
  FilterAltOff as ClearFilterIcon,
  LocationCity as CityIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Collapse, InputAdornment, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Outlet, OutletGroup, VenuePartner } from '../types';
import { pageHeaderSx } from '../utils/responsive';

// Admin-side Outlet Groups page. Only VENUE_CURATED groups are
// editable through this UI; the ANY group is hidden (it's an
// implementation detail of the targeting layer) and SYSTEM_AUTO
// groups are shown read-only.
//
// Like AdminOutletsPage / AdminAdvertisersPage, the table starts
// empty until a venue is picked — keeps the load light and matches
// the pair-page UX.

const AdminOutletGroupsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  // venue_partner role auto-pins to their own venue via JWT —
  // they don't see the cross-venue picker. Admin keeps the picker.
  const isVenueScoped = hasRole('venue_partner');

  const [venues, setVenues] = useState<VenuePartner[]>([]);
  const [venue, setVenue] = useState<VenuePartner | null>(null);

  const [groups, setGroups] = useState<OutletGroup[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'DEPRECATED'>('ACTIVE');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiService
      .listVenuePartners({ limit: 1000 })
      .then((r) => {
        setVenues(r.data);
        // venue_partner sees their own venue auto-selected (the
        // backend already filters listVenuePartners to their own
        // row via JWT scoping, so r.data is one item).
        if (isVenueScoped) {
          const own =
            r.data.find((v) => v.id === user?.venue_partner_id) || r.data[0];
          if (own) setVenue(own);
        }
      })
      .catch((e) => setError(e?.response?.data?.error || 'Failed to load venues'));
  }, []);

  const load = useCallback(async () => {
    if (!venue) {
      setGroups([]);
      setOutlets([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [groupRes, outletRes] = await Promise.all([
        apiService.listOutletGroupsForVenue(venue.id),
        apiService.listOutlets({ venue_partner_id: venue.id, limit: 1000 }),
      ]);
      setGroups(groupRes);
      setOutlets(outletRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [venue]);

  useEffect(() => {
    void load();
  }, [load]);

  const outletById = useMemo(() => {
    const m = new Map<string, Outlet>();
    outlets.forEach((o) => m.set(o.id, o));
    return m;
  }, [outlets]);

  // ANY is hidden — it's an implementation detail. SYSTEM_AUTO groups
  // show up read-only so admins can still see what predicate-based
  // groups exist for the venue.
  const visibleGroups = useMemo(
    () => groups.filter((g) => g.kind !== 'ANY'),
    [groups],
  );

  const resetDrawer = () => {
    setEditingId(null);
    setDisplayName('');
    setDescription('');
    setStatus('ACTIVE');
    setMemberIds([]);
  };

  const openCreate = () => {
    if (!venue) return;
    resetDrawer();
    setDrawerOpen(true);
  };

  const openEdit = async (g: OutletGroup) => {
    resetDrawer();
    setEditingId(g.id);
    setDisplayName(g.display_name);
    setDescription(g.description || '');
    setStatus(g.status);
    try {
      const ids = await apiService.listOutletGroupMembers(g.id);
      setMemberIds(ids);
    } catch {
      setMemberIds([]);
    }
    setDrawerOpen(true);
  };

  const save = async () => {
    if (!venue) return;
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiService.updateOutletGroup(editingId, {
          display_name: displayName,
          description,
          status,
          outlet_ids: memberIds,
        });
        setSuccess('Group updated');
      } else {
        await apiService.createOutletGroup(venue.id, {
          display_name: displayName,
          description,
          outlet_ids: memberIds,
        });
        setSuccess('Group created');
      }
      setDrawerOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (g: OutletGroup) => {
    if (
      !window.confirm(
        `Deprecate group "${g.display_name}"? It will be hidden from the picker; existing campaign approvals keep resolving.`,
      )
    )
      return;
    try {
      await apiService.deleteOutletGroup(g.id);
      setSuccess('Group deprecated');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Delete failed');
    }
  };

  const kindChip = (kind: OutletGroup['kind']) => {
    const palette: Record<
      OutletGroup['kind'],
      { bg: string; fg: string; label: string }
    > = {
      ANY: { bg: '#FFEDD5', fg: '#C2410C', label: 'ANY' },
      SYSTEM_AUTO: { bg: '#E0F4FF', fg: '#0773A3', label: 'SYSTEM' },
      VENUE_CURATED: { bg: '#DCFCE7', fg: '#166534', label: 'CURATED' },
    };
    const p = palette[kind];
    return (
      <Chip
        size="small"
        label={p.label}
        sx={{ bgcolor: p.bg, color: p.fg, fontWeight: 600 }}
      />
    );
  };

  return (
    <Box>
      <Box sx={pageHeaderSx}>
        <Box>
          <Typography variant="h4">Outlet groups</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Curated targeting sets that publishers pick when submitting
            a campaign (e.g. "Jabodetabek Urban", "Surabaya tier-1").
            Pick a venue to see its groups. SYSTEM groups are read-only.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          disabled={!venue}
        >
          New Group
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
          {isVenueScoped ? (
            // Venue partner sees their own venue as a read-only chip;
            // they can't switch venues and have no need to.
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2 }}>
                Venue
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {venue?.display_name || venue?.legal_name || '—'}
              </Typography>
            </Stack>
          ) : (
            <>
              <Autocomplete
                value={venue}
                onChange={(_, v) => setVenue(v)}
                options={venues}
                getOptionLabel={(v) => v.display_name || v.legal_name || v.id}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                sx={{ minWidth: 320 }}
                renderInput={(params) => (
                  <TextField {...params} label="Venue" placeholder="Pick a venue" />
                )}
              />
              {venue && (
                <Tooltip title="Clear filter">
                  <IconButton size="small" onClick={() => setVenue(null)}>
                    <ClearFilterIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            startIcon={<RefreshIcon />}
            onClick={load}
            disabled={!venue || loading}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Group</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell align="right">Members</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!venue ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Pick a venue above to view its outlet groups.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : visibleGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      No curated groups yet — click "New Group".
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleGroups.map((g) => {
                  const readOnly = g.kind !== 'VENUE_CURATED';
                  return (
                    <TableRow key={g.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {g.display_name}
                        </Typography>
                        {g.description && (
                          <Typography variant="caption" color="text.secondary">
                            {g.description}
                          </Typography>
                        )}
                        {g.predicate && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.disabled',
                              fontFamily: 'monospace',
                              display: 'block',
                            }}
                          >
                            {g.predicate.field} = {g.predicate.value}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{kindChip(g.kind)}</TableCell>
                      <TableCell align="right">{g.member_count}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={g.status}
                          color={g.status === 'ACTIVE' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip
                          title={
                            readOnly
                              ? 'SYSTEM groups are platform-managed'
                              : 'Edit'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => openEdit(g)}
                              disabled={readOnly}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip
                          title={
                            readOnly
                              ? 'SYSTEM groups are platform-managed'
                              : 'Deprecate'
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => remove(g)}
                              disabled={readOnly}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create / edit drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 640 } } }}
      >
        <DialogTitle>{editingId ? 'Edit group' : 'New group'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              required
              fullWidth
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jabodetabek Urban"
            />
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              placeholder="What this group represents (optional)"
            />
            {editingId && (
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={status}
                  label="Status"
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                  <MenuItem value="DEPRECATED">DEPRECATED (hidden from picker)</MenuItem>
                </Select>
              </FormControl>
            )}

            <Divider sx={{ my: 1 }} />

            <MemberPicker
              outlets={outlets}
              outletById={outletById}
              memberIds={memberIds}
              setMemberIds={setMemberIds}
            />
          </Stack>
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

// ---- Member picker --------------------------------------------------
//
// Designed to handle a 1,000+ outlet venue. Three controls:
//   1. Search          — substring match across name, city, province
//   2. Group by        — None / City / Province; collapsible buckets
//                        with per-bucket select-all
//   3. Selected chips  — currently-selected outlets rendered as a
//                        scrollable chip row at the top with a Clear-all
//                        so the admin always sees what they have without
//                        scrolling the full list.
//
// "All in venue" stays a one-click bulk action. Per-group select-all
// flips that group's outlets, leaving other groups untouched.
type GroupKey = 'none' | 'city' | 'province';

interface MemberPickerProps {
  outlets: Outlet[];
  outletById: Map<string, Outlet>;
  memberIds: string[];
  setMemberIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const MemberPicker: React.FC<MemberPickerProps> = ({
  outlets,
  outletById,
  memberIds,
  setMemberIds,
}) => {
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupKey>('city');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const memberSet = useMemo(() => new Set(memberIds), [memberIds]);

  // Substring filter — name, city, province, district, outlet_type.
  // Case-insensitive. Empty query passes everything.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return outlets;
    return outlets.filter((o) =>
      [o.display_name, o.city, o.province, o.outlet_type]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [outlets, search]);

  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'All outlets', items: filtered }];
    }
    const buckets = new Map<string, Outlet[]>();
    for (const o of filtered) {
      const k = (groupBy === 'city' ? o.city : o.province) || '— Unknown';
      const arr = buckets.get(k);
      if (arr) arr.push(o);
      else buckets.set(k, [o]);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy]);

  const toggleOne = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleGroup = (items: Outlet[]) => {
    const ids = items.map((o) => o.id);
    const allSelected = ids.every((id) => memberSet.has(id));
    setMemberIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return Array.from(next);
    });
  };

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Selected chips — capped at 12 visible; remainder collapses into
  // "+N more" so the row never wraps to 4+ lines on a 640px drawer.
  const MAX_CHIPS = 12;
  const selectedOutlets = memberIds
    .map((id) => outletById.get(id))
    .filter(Boolean) as Outlet[];

  if (outlets.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          This venue has no outlets yet — add outlets before curating
          groups.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', letterSpacing: 1.2 }}
        >
          Members ({memberIds.length} / {outlets.length})
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            onClick={() => setMemberIds(outlets.map((o) => o.id))}
            disabled={memberIds.length === outlets.length}
          >
            All
          </Button>
          <Button
            size="small"
            onClick={() => setMemberIds([])}
            disabled={memberIds.length === 0}
          >
            Clear
          </Button>
        </Stack>
      </Stack>

      {/* Selected chips strip — gives the admin a permanent at-a-glance
          view of what they've picked without scrolling the full list. */}
      {selectedOutlets.length > 0 && (
        <Box
          sx={{
            p: 1,
            mb: 1.5,
            bgcolor: 'primary.50',
            border: '1px solid',
            borderColor: 'primary.100',
            borderRadius: 1,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5,
          }}
        >
          {selectedOutlets.slice(0, MAX_CHIPS).map((o) => (
            <Chip
              key={o.id}
              size="small"
              label={o.display_name}
              onDelete={() => toggleOne(o.id)}
              deleteIcon={<ClearIcon sx={{ fontSize: 14 }} />}
              sx={{ bgcolor: 'background.paper' }}
            />
          ))}
          {selectedOutlets.length > MAX_CHIPS && (
            <Chip
              size="small"
              label={`+${selectedOutlets.length - MAX_CHIPS} more`}
              variant="outlined"
              sx={{ borderStyle: 'dashed' }}
            />
          )}
        </Box>
      )}

      {/* Search + group-by controls */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search outlets, cities, provinces…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={groupBy}
          onChange={(_, v) => v && setGroupBy(v)}
          aria-label="group by"
        >
          <ToggleButton value="city" aria-label="city">
            <CityIcon fontSize="small" sx={{ mr: 0.5 }} /> City
          </ToggleButton>
          <ToggleButton value="province" aria-label="province">
            Province
          </ToggleButton>
          <ToggleButton value="none" aria-label="flat">
            Flat
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Live filter summary */}
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', display: 'block', mb: 1 }}
      >
        Showing {filtered.length} of {outlets.length} outlets
        {search && ` matching "${search}"`}
        {groupBy !== 'none' && ` · ${groups.length} ${groupBy}s`}
      </Typography>

      {/* Grouped list. Each group header shows N/M selected and a
          one-click select-all for the visible items in that group. */}
      <Paper
        variant="outlined"
        sx={{ maxHeight: 420, overflow: 'auto', p: 0 }}
      >
        {filtered.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled">
              No outlets match this search.
            </Typography>
          </Box>
        ) : (
          groups.map((g) => {
            const isCollapsed = collapsed.has(g.key);
            const selectedInGroup = g.items.filter((o) =>
              memberSet.has(o.id),
            ).length;
            const allSelected = selectedInGroup === g.items.length;
            const partial = selectedInGroup > 0 && !allSelected;

            return (
              <Box key={g.key}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    bgcolor: 'grey.50',
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  {groupBy !== 'none' ? (
                    <IconButton
                      size="small"
                      onClick={() => toggleCollapse(g.key)}
                      sx={{ p: 0.25 }}
                    >
                      {isCollapsed ? (
                        <ExpandIcon fontSize="small" />
                      ) : (
                        <CollapseIcon fontSize="small" />
                      )}
                    </IconButton>
                  ) : null}
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={partial}
                    onChange={() => toggleGroup(g.items)}
                    sx={{ p: 0.5 }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, flex: 1 }}
                  >
                    {g.key}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${selectedInGroup} / ${g.items.length}`}
                    color={allSelected ? 'primary' : 'default'}
                    variant={partial ? 'outlined' : 'filled'}
                    sx={{ fontSize: 11, height: 20 }}
                  />
                </Box>
                <Collapse in={!isCollapsed} unmountOnExit>
                  {g.items.map((o) => {
                    const checked = memberSet.has(o.id);
                    return (
                      <Box
                        key={o.id}
                        onClick={() => toggleOne(o.id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          px: 1.5,
                          py: 0.75,
                          cursor: 'pointer',
                          borderBottom: 1,
                          borderColor: 'divider',
                          bgcolor: checked ? 'primary.50' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          pl: groupBy !== 'none' ? 5 : 1.5,
                        }}
                      >
                        <Checkbox
                          size="small"
                          checked={checked}
                          onChange={() => toggleOne(o.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ p: 0.5 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ fontWeight: checked ? 600 : 400 }}
                          >
                            {o.display_name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: 'block' }}
                          >
                            {[o.city, o.province, o.outlet_type]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Collapse>
              </Box>
            );
          })
        )}
      </Paper>
    </Box>
  );
};

export default AdminOutletGroupsPage;
