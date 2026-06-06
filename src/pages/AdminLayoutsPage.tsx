import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ArrowForward as ArrowForwardIcon,
  Bolt as BoltIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  ExpandLess as CollapseIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Device, Layout, LayoutZone, VenuePartner } from '../types';

// Admin layouts catalog. Read-only by design — layouts are platform
// templates; editing happens in code via DB seeds. This page exists
// so admins can:
//   1. See which layouts exist (visual preview of zone geometry)
//   2. See how many devices currently use each layout (coverage view)
//   3. Deep-link to the devices list filtered by that layout, where
//      they can actually do bulk reassignment.
//
// "Fullscreen" is included as a synthetic card representing devices
// with empty layout_id — these aren't a real layout row, but they're
// a real cohort the admin cares about.

const AdminLayoutsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  // venue_partner role auto-scopes to their own venue's devices.
  // The page UX is otherwise identical — coverage stats and the
  // assign drawer just operate on the smaller device set.
  const isVenueScoped = hasRole('venue_partner');
  const devicePathPrefix = isVenueScoped ? '/venue' : '/admin';

  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [venues, setVenues] = useState<VenuePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Assign drawer state. `assignTo` is the target layout id ('' for
  // Fullscreen). `selectedIds` is the desired set after save —
  // pre-populated with devices currently on this layout so the admin
  // sees the current state and can add/remove from there.
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTo, setAssignTo] = useState<{ id: string; name: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [layoutsRes, devicesRes, venuesRes] = await Promise.all([
        apiService.listLayouts(),
        // Pull a generous chunk for the device-count rollup. At fleet
        // scale (10k+ devices) move this to a dedicated coverage
        // endpoint; for now N×PUT-the-list is fine.
        //
        // venue_partner uses the venue-scoped endpoint so the
        // coverage cards reflect only their own fleet (admin sees
        // every venue's devices via the unscoped endpoint).
        isVenueScoped && user?.venue_partner_id
          ? apiService.listDevicesByVenuePartner(user.venue_partner_id, {
              limit: 10000,
            })
          : apiService.getDevices({ limit: 10000 }),
        apiService.listVenuePartners({ limit: 1000 }),
      ]);
      setLayouts(layoutsRes);
      setDevices(devicesRes.data);
      setVenues(venuesRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load layouts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Counts per layout_id + fullscreen (empty/missing).
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    let fullscreen = 0;
    for (const d of devices) {
      if (!d.layout_id) {
        fullscreen += 1;
      } else {
        m.set(d.layout_id, (m.get(d.layout_id) || 0) + 1);
      }
    }
    return { byLayoutID: m, fullscreen };
  }, [devices]);

  // Total goes in the header — gives a sense of the denominator.
  const totalDevices = devices.length;

  const openDevicesFiltered = (layoutId: string) => {
    navigate(`${devicePathPrefix}/devices?layout_id=${encodeURIComponent(layoutId)}`);
  };

  // Pre-populates the drawer with devices currently on this layout
  // (or fullscreen). The admin then ticks/unticks to express the
  // desired final state; save reconciles via PUTs.
  const openAssign = (layoutId: string, displayName: string) => {
    const initial = new Set<string>();
    for (const d of devices) {
      const onThis =
        layoutId === 'none' ? !d.layout_id : d.layout_id === layoutId;
      if (onThis) initial.add(d.id);
    }
    setAssignTo({ id: layoutId, name: displayName });
    setSelectedIds(initial);
    setAssignOpen(true);
  };

  const venueById = useMemo(() => {
    const m = new Map<string, VenuePartner>();
    venues.forEach((v) => m.set(v.id, v));
    return m;
  }, [venues]);

  const applyAssign = async () => {
    if (!assignTo) return;
    setApplying(true);
    try {
      const targetLayoutId = assignTo.id === 'none' ? '' : assignTo.id;
      // Diff against current state — adds and removes go through the
      // bulk endpoint in at most TWO calls (one per target layout_id
      // value), down from N parallel PUTs. Same diff semantics as
      // before: ticked-but-not-on-this → switch to target; on-this-
      // but-unticked → clear to fullscreen.
      const adds: string[] = [];
      const removes: string[] = [];
      for (const d of devices) {
        const shouldBeOnThis = selectedIds.has(d.id);
        const isOnThis =
          assignTo.id === 'none' ? !d.layout_id : d.layout_id === assignTo.id;
        if (shouldBeOnThis && !isOnThis) adds.push(d.id);
        else if (!shouldBeOnThis && isOnThis) removes.push(d.id);
      }
      const total = adds.length + removes.length;
      if (total === 0) {
        setAssignOpen(false);
        setSuccess('No changes — selection already matches');
        return;
      }
      let affected = 0;
      if (adds.length > 0) {
        const res = await apiService.setDevicesBulkLayout(adds, targetLayoutId);
        affected += res.affected;
      }
      if (removes.length > 0) {
        // Removals always go back to fullscreen — we don't know which
        // other layout the admin meant, and the cascade UX on the
        // outlet page is the right place to set a venue-wide default.
        const res = await apiService.setDevicesBulkLayout(removes, '');
        affected += res.affected;
      }
      setAssignOpen(false);
      setSuccess(
        `Applied to ${affected} device${affected === 1 ? '' : 's'}`,
      );
      await load();
    } catch (e: any) {
      setError(
        e?.response?.data?.error || e?.message || 'Bulk apply failed',
      );
    } finally {
      setApplying(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4">Layouts</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Platform-defined screen templates. Devices reference one
            layout via <code>layout_id</code>; the device renderer
            composes per-zone widgets from the geometry below.
            Read-only — edit assignment on the Devices page.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={load}
          disabled={loading}
          variant="outlined"
        >
          Refresh
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

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Coverage summary strip */}
          <Paper sx={{ mb: 3, p: 2 }} variant="outlined">
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Stat label="Total devices" value={totalDevices} />
              <Stat
                label="On fullscreen"
                value={counts.fullscreen}
                hint={percent(counts.fullscreen, totalDevices)}
              />
              <Stat
                label="On a layout"
                value={totalDevices - counts.fullscreen}
                hint={percent(totalDevices - counts.fullscreen, totalDevices)}
              />
              <Stat label="Layout templates" value={layouts.length} />
            </Stack>
          </Paper>

          {/* Layout cards grid */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              },
            }}
          >
            {/* Fullscreen pseudo-card — always shown so admin can
                deep-link to "everyone without a layout". */}
            <LayoutCard
              displayName="Fullscreen"
              description="Devices with no layout assigned — playlist renders edge-to-edge in a single main zone."
              zones={[]}
              count={counts.fullscreen}
              totalDevices={totalDevices}
              isVirtual
              onShowDevices={() => openDevicesFiltered('none')}
              onAssign={() => openAssign('none', 'Fullscreen')}
            />

            {layouts.map((l) => (
              <LayoutCard
                key={l.id}
                displayName={l.display_name}
                description={l.description}
                zones={l.zones || []}
                count={counts.byLayoutID.get(l.id) || 0}
                totalDevices={totalDevices}
                onShowDevices={() => openDevicesFiltered(l.id)}
                onAssign={() => openAssign(l.id, l.display_name)}
                status={l.status}
              />
            ))}
          </Box>
        </>
      )}

      {/* Assign-devices drawer — scoped to the layout the admin
          clicked. Pre-checked = currently on this layout; the admin
          ticks to add, unticks to remove (removal clears the device
          back to fullscreen). Save reconciles via per-device PUTs. */}
      <Drawer
        anchor="right"
        open={assignOpen}
        onClose={() => !applying && setAssignOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
      >
        <DialogTitle>
          Assign devices to{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            {assignTo?.name || ''}
          </Box>
        </DialogTitle>
        <DialogContent>
          {assignTo && (
            <AssignPicker
              devices={devices}
              venueById={venueById}
              targetLayoutId={assignTo.id}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)} disabled={applying}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={applyAssign}
            disabled={applying}
          >
            {applying ? <CircularProgress size={20} /> : 'Apply'}
          </Button>
        </DialogActions>
      </Drawer>
    </Box>
  );
};

// ---- AssignPicker --------------------------------------------------
//
// Picker designed for fleets of hundreds of devices. Same pattern as
// the outlet-groups MemberPicker:
//   - Search (name, device_id, venue, outlet)
//   - Group-by Venue / Status / Flat
//   - Selected chip strip with quick-remove
//   - Tri-state group headers
//
// We compute "current vs desired" labels per row so the admin sees
// what they're changing. Rows currently on this layout are tagged
// "ON THIS"; rows on other layouts show their current layout name in
// the secondary line so the admin doesn't accidentally hijack a
// device that's already pinned to something else.
interface AssignPickerProps {
  devices: Device[];
  venueById: Map<string, VenuePartner>;
  targetLayoutId: string; // 'none' for fullscreen
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

type AssignGroupKey = 'venue' | 'status' | 'none';

const AssignPicker: React.FC<AssignPickerProps> = ({
  devices,
  venueById,
  targetLayoutId,
  selectedIds,
  setSelectedIds,
}) => {
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<AssignGroupKey>('venue');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isOnThis = (d: Device) =>
    targetLayoutId === 'none' ? !d.layout_id : d.layout_id === targetLayoutId;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) => {
      const venue = venueById.get(d.venue_partner_id || '');
      return [
        (d as any).device_name,
        d.device_id,
        venue?.display_name,
        venue?.legal_name,
      ]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [devices, search, venueById]);

  const groups = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'All devices', items: filtered }];
    }
    const buckets = new Map<string, Device[]>();
    for (const d of filtered) {
      let k: string;
      if (groupBy === 'venue') {
        k =
          venueById.get(d.venue_partner_id || '')?.display_name ||
          'Unassigned';
      } else {
        k = (d.status || 'unknown').toUpperCase();
      }
      const arr = buckets.get(k);
      if (arr) arr.push(d);
      else buckets.set(k, [d]);
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy, venueById]);

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (items: Device[]) => {
    const ids = items.map((d) => d.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  // Stats — give the admin a sense of the diff at a glance.
  const currentCount = devices.filter(isOnThis).length;
  const addingCount = devices.filter(
    (d) => selectedIds.has(d.id) && !isOnThis(d),
  ).length;
  const removingCount = devices.filter(
    (d) => !selectedIds.has(d.id) && isOnThis(d),
  ).length;

  return (
    <Box sx={{ pt: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.2 }}>
          {selectedIds.size} selected · {currentCount} currently · {addingCount > 0 ? `+${addingCount}` : '·'}
          {removingCount > 0 && `, −${removingCount}`}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            onClick={() => setSelectedIds(new Set(filtered.map((d) => d.id)))}
            disabled={filtered.length === 0}
          >
            Select filtered
          </Button>
          <Button
            size="small"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedIds.size === 0}
          >
            Clear
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search devices, venues…"
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
        >
          <ToggleButton value="venue">Venue</ToggleButton>
          <ToggleButton value="status">Status</ToggleButton>
          <ToggleButton value="none">Flat</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mb: 1 }}>
        Showing {filtered.length} of {devices.length} devices
        {search && ` matching "${search}"`}
      </Typography>

      <Paper variant="outlined" sx={{ maxHeight: 460, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.disabled">
              No devices match this search.
            </Typography>
          </Box>
        ) : (
          groups.map((g) => {
            const isCollapsed = collapsed.has(g.key);
            const selectedInGroup = g.items.filter((d) => selectedIds.has(d.id)).length;
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
                  {groupBy !== 'none' && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        const next = new Set(collapsed);
                        if (next.has(g.key)) next.delete(g.key);
                        else next.add(g.key);
                        setCollapsed(next);
                      }}
                      sx={{ p: 0.25 }}
                    >
                      {isCollapsed ? (
                        <ExpandIcon fontSize="small" />
                      ) : (
                        <CollapseIcon fontSize="small" />
                      )}
                    </IconButton>
                  )}
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={partial}
                    onChange={() => toggleGroup(g.items)}
                    sx={{ p: 0.5 }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
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
                  {g.items.map((d) => {
                    const checked = selectedIds.has(d.id);
                    const onThis = isOnThis(d);
                    const onOther = !!d.layout_id && d.layout_id !== targetLayoutId && targetLayoutId !== 'none';
                    return (
                      <Box
                        key={d.id}
                        onClick={() => toggleOne(d.id)}
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
                          onChange={() => toggleOne(d.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ p: 0.5 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: checked ? 600 : 400 }}>
                              {(d as any).device_name || d.device_id}
                            </Typography>
                            {onThis && (
                              <Chip
                                size="small"
                                label="ON THIS"
                                sx={{
                                  bgcolor: '#DCFCE7',
                                  color: '#166534',
                                  fontSize: 9,
                                  height: 16,
                                  fontWeight: 700,
                                }}
                              />
                            )}
                            {onOther && (
                              <Tooltip
                                title="Currently on another layout — checking will switch it"
                              >
                                <Chip
                                  size="small"
                                  label="OTHER"
                                  variant="outlined"
                                  sx={{ fontSize: 9, height: 16 }}
                                />
                              </Tooltip>
                            )}
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: 'block', fontFamily: 'monospace', fontSize: 11 }}
                          >
                            {d.device_id}
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

// ---- helpers -----------------------------------------------------

const Stat: React.FC<{ label: string; value: number; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <Box>
    <Typography
      variant="overline"
      sx={{ color: 'text.secondary', letterSpacing: 1.2, fontSize: 10 }}
    >
      {label}
    </Typography>
    <Stack direction="row" alignItems="baseline" spacing={1}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {value.toLocaleString()}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
  </Box>
);

const percent = (n: number, d: number) =>
  d === 0 ? '—' : `${Math.round((n / d) * 100)}%`;

interface LayoutCardProps {
  displayName: string;
  description?: string;
  zones: LayoutZone[];
  count: number;
  totalDevices: number;
  status?: string;
  isVirtual?: boolean;
  onShowDevices: () => void;
  onAssign: () => void;
}

const LayoutCard: React.FC<LayoutCardProps> = ({
  displayName,
  description,
  zones,
  count,
  totalDevices,
  status,
  isVirtual,
  onShowDevices,
  onAssign,
}) => {
  const isDeprecated = status === 'DEPRECATED';
  return (
    <Card
      variant="outlined"
      sx={{
        opacity: isDeprecated ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }} noWrap>
            {displayName}
          </Typography>
          {isVirtual && (
            <Chip
              size="small"
              label="DEFAULT"
              variant="outlined"
              sx={{ fontSize: 10, height: 20 }}
            />
          )}
          {isDeprecated && (
            <Chip
              size="small"
              label="DEPRECATED"
              color="default"
              sx={{ fontSize: 10, height: 20 }}
            />
          )}
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 2, minHeight: 32 }}
        >
          {description || '—'}
        </Typography>

        <ZonePreview zones={zones} />

        <Stack
          direction="row"
          alignItems="baseline"
          spacing={1}
          sx={{ mt: 2 }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {count.toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            device{count === 1 ? '' : 's'} · {percent(count, totalDevices)}
          </Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {zones.length === 0
            ? 'Single full-screen zone'
            : `${zones.length} zone${zones.length === 1 ? '' : 's'}`}
        </Typography>
      </CardContent>
      <CardActions
        sx={{ justifyContent: 'space-between', borderTop: 1, borderColor: 'divider' }}
      >
        <Button
          size="small"
          endIcon={<ArrowForwardIcon />}
          onClick={onShowDevices}
          disabled={count === 0}
        >
          Show devices
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<BoltIcon />}
          onClick={onAssign}
          disabled={isDeprecated}
        >
          Assign devices
        </Button>
      </CardActions>
    </Card>
  );
};

const ZonePreview: React.FC<{ zones: LayoutZone[] }> = ({ zones }) => (
  <Paper
    variant="outlined"
    sx={{
      position: 'relative',
      width: '100%',
      aspectRatio: '16 / 9',
      bgcolor: 'grey.50',
      overflow: 'hidden',
    }}
  >
    {zones.length === 0 ? (
      <Box
        sx={{
          position: 'absolute',
          inset: 8,
          border: '1px dashed',
          borderColor: 'text.disabled',
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: 1,
            fontSize: 10,
          }}
        >
          Fullscreen
        </Typography>
      </Box>
    ) : (
      zones.map((z, idx) => (
        <Box
          key={z.slug}
          sx={{
            position: 'absolute',
            left: `${z.x_pct}%`,
            top: `${z.y_pct}%`,
            width: `${z.w_pct}%`,
            height: `${z.h_pct}%`,
            border: '1px dashed',
            borderColor: 'primary.main',
            bgcolor: idx % 2 === 0 ? 'primary.50' : 'primary.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600,
            color: 'primary.dark',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {z.slug}
        </Box>
      ))
    )}
  </Paper>
);

export default AdminLayoutsPage;
