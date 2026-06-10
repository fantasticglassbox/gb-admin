import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Checkbox,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Grid,
  Tabs,
  Tab,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
  Drawer,
} from '@mui/material';
import {
  Add as AddIcon,
  Link as LinkIcon,
  Sync as SyncIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Store as StoreIcon,
  LinkOff as LinkOffIcon,
  PowerSettingsNew as PowerSettingsNewIcon,
  ViewQuilt as LayoutIcon,
  QrCodeScanner as QrCodeScannerIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { DeviceResponse, Merchant, FilterOptions, Outlet, Layout, VenuePartner } from '../types';
import { apiService } from '../services/api';
import PairDeviceDialog from '../components/PairDeviceDialog';
import PairDeviceByScan from '../components/PairDeviceByScan';
import DeviceLayoutDialog from '../components/DeviceLayoutDialog';
import { pageHeaderSx } from '../utils/responsive';
import { useAuth } from '../contexts/AuthContext';

// Section header inside the device drawer form. Replaces the old
// 3-tab layout — a single scroll with section dividers is faster to
// fill out than tabs and makes the underlying data model obvious.
const FormSection: React.FC<{ title: string; hint?: string }> = ({ title, hint }) => (
  <Box sx={{ mt: 3, mb: 0.5, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
    <Typography
      variant="overline"
      sx={{ color: 'text.secondary', letterSpacing: 1.2, fontWeight: 600 }}
    >
      {title}
    </Typography>
    {hint && (
      <Typography
        variant="caption"
        sx={{ display: 'block', color: 'text.disabled', mt: 0.25 }}
      >
        {hint}
      </Typography>
    )}
  </Box>
);

const DevicesManagement: React.FC = () => {
  const { hasRole, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [devices, setDevices] = useState<DeviceResponse[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [merchantFilter, setMerchantFilter] = useState<string>('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedDevice, setSelectedDevice] = useState<DeviceResponse | null>(null);
  const [tabValue, setTabValue] = useState(0);
  

  // Flat shape mirroring the backend model.Device — but trimmed to
  // the fields admins actually edit. Hardware (manufacturer, OS,
  // app_version, screen_resolution, serial_number, mac_address) is
  // captured by gb-media at pair time and shown read-only on
  // DeviceDetail; the drawer doesn't need to expose them. Inventory
  // metadata (address, city, district, province, postal_code,
  // country, zone) sits behind a "Show inventory metadata" toggle so
  // it stays out of the way for the common case where the outlet
  // already carries those fields.
  const [formData, setFormData] = useState({
    device_name: '',
    device_id: '',
    device_type: 'TV' as 'TV' | 'TABLET' | 'KIOSK' | 'PHONE' | 'UNKNOWN',
    status: 'REGISTERED' as 'REGISTERED' | 'ACTIVE',
    model: '',

    venue_partner_id: '',
    outlet_id: '',

    // Location — flat, no nested object. Lat/long carried as strings
    // until submit; auto-captured at pair time when GPS is available.
    latitude: '',
    longitude: '',
    location_name: '',

    // Inventory metadata — collapsed by default.
    address: '',
    city: '',
    district: '',
    province: '',
    postal_code: '',
    country: '',
    zone: '',
  });
  // Collapsed by default — most devices inherit address from the outlet.
  const [showInventoryMeta, setShowInventoryMeta] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceResponse | null>(null);

  // Outlet assignment dialog (V2)
  const [outletDialogOpen, setOutletDialogOpen] = useState(false);
  const [outletDialogDevice, setOutletDialogDevice] = useState<DeviceResponse | null>(null);

  // V2 pair-a-new-device dialog state
  const [pairDialogOpen, setPairDialogOpen] = useState(false);
  const [pairByScanOpen, setPairByScanOpen] = useState(false);
  // Row overflow menu — collapsing the per-row action stack from 7
  // icons to View + ⋮. menuDevice tracks which device's menu is open;
  // anchor positions the popover next to the kebab button that fired.
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuDevice, setMenuDevice] = useState<DeviceResponse | null>(null);
  const openRowMenu = (e: React.MouseEvent<HTMLElement>, d: DeviceResponse) => {
    setMenuAnchorEl(e.currentTarget);
    setMenuDevice(d);
  };
  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuDevice(null);
  };
  // Tracks which device currently has a force-sync request in flight so
  // we can show a spinner on its row.
  const [syncingDeviceIds, setSyncingDeviceIds] = useState<Set<string>>(new Set());

  // V2 layout dialog + catalog cache for the per-row "Layout" column
  const [layoutDialogDevice, setLayoutDialogDevice] = useState<DeviceResponse | null>(null);
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const layoutBySlug = React.useMemo(() => {
    const m: Record<string, Layout> = {};
    layouts.forEach((l) => { m[l.id] = l; });
    return m;
  }, [layouts]);

  // Lazy-load the layout catalog once — used purely for the row display.
  useEffect(() => {
    if (layouts.length === 0) {
      apiService.listLayouts().then(setLayouts).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [outletPickerId, setOutletPickerId] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  // V2 lookups for the device row's Venue · Outlet display + venue filter.
  // Loaded once on mount; admin sees everything, venue partner is naturally
  // scoped because the venue-partners endpoint only returns their own.
  const [venuePartners, setVenuePartners] = useState<VenuePartner[]>([]);
  const [allOutlets, setAllOutlets] = useState<Outlet[]>([]);
  const [venueFilter, setVenueFilter] = useState<string>('');

  // V2 layout filter — admin can scope by current layout (including
  // "Fullscreen" = empty layout_id). Deep-linkable via ?layout_id=
  // from the layouts catalog page.
  const [layoutFilter, setLayoutFilter] = useState<string>('');

  // Bulk select: rows the admin has ticked for a bulk action. Lives
  // page-local so changing page or filters clears it implicitly (the
  // ticks vanish when the row leaves the visible table).
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());

  // Bulk-apply layout dialog state.
  const [bulkLayoutOpen, setBulkLayoutOpen] = useState(false);
  const [bulkLayoutChoice, setBulkLayoutChoice] = useState<string>('');
  const [bulkApplying, setBulkApplying] = useState(false);

  // Server-side filter — `devices` is already what we want to show.
  // Alias kept so the rest of the file's references (header checkbox,
  // empty-state copy, bulk-select math) don't need to change.
  const visibleDevices = devices;
  const [outletsLoading, setOutletsLoading] = useState(false);

  useEffect(() => {
    loadDevices();
  }, [page, rowsPerPage, searchTerm, statusFilter, merchantFilter, venueFilter, deviceTypeFilter, layoutFilter]);

  // Hydrate filters from the URL once on mount so the layouts
  // catalog page can deep-link with ?layout_id=<id> or layout_id=none
  // (devices currently on fullscreen).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lid = params.get('layout_id');
    if (lid !== null) setLayoutFilter(lid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open the edit drawer when arriving from DeviceDetail's "Edit"
  // button, which navigates here with ?edit=<id>. The drawer relies on
  // venuePartners/allOutlets being populated for its picker dropdowns,
  // so we wait until both arrays AND the device list have something
  // to look up against before firing.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (!editId || devices.length === 0) return;
    const target = devices.find((d) => d.id === editId);
    if (!target) return;
    handleEditDevice(target);
    // Strip the param so refreshing the page doesn't keep re-opening
    // the drawer.
    navigate(location.pathname, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, devices]);

  useEffect(() => {
    loadMerchants();
    // V2: load venue partners + all outlets for the row's display lookup
    // and the venue filter dropdown. Failures fall back to empty arrays;
    // the helper renders "Unassigned" if the IDs don't resolve.
    apiService
      .listVenuePartners({ limit: 1000 })
      .then((r) => setVenuePartners(r.data || []))
      .catch(() => setVenuePartners([]));
    apiService
      .listOutlets({ limit: 1000 })
      .then((r) => setAllOutlets(r.data || []))
      .catch(() => setAllOutlets([]));
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: FilterOptions = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (statusFilter) {
        filters.status = statusFilter;
      }
      if (merchantFilter) {
        filters.merchant_id = merchantFilter;
      }
      if (venueFilter) {
        // V2 scope. If the backend ignores it (older builds), client-
        // side filter below catches everything from the page.
        (filters as any).venue_partner_id = venueFilter;
      }
      // Layout filter — backend honours "" / "none" / <uuid> sentinels
      // (see applyLayoutFilter in gb-core). Sending it server-side
      // keeps pagination counts accurate, unlike the prior post-
      // filter on the loaded page.
      if (layoutFilter) {
        (filters as any).layout_id = layoutFilter;
      }

      // Venue partner role: use the V2 venue-scoped endpoint so the
      // list only contains devices on outlets of their own venue.
      // Falls back to the unscoped list if the JWT somehow lacks the
      // claim (shouldn't happen — middleware sets it).
      let response;
      if (hasRole('venue_partner') && user?.venue_partner_id) {
        response = await apiService.listDevicesByVenuePartner(user.venue_partner_id, filters);
      } else {
        response = await apiService.getDevices(filters);
      }
      setDevices(response.data as any);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const loadMerchants = async () => {
    try {
      const response = await apiService.getMerchants({ limit: 1000 });
      setMerchants(response.data);
    } catch (err: any) {
      console.error('Failed to load merchants:', err);
    }
  };



  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleMerchantFilterChange = (event: any) => {
    setMerchantFilter(event.target.value);
    setPage(0);
  };

  const handleDeviceTypeFilterChange = (event: any) => {
    setDeviceTypeFilter(event.target.value);
    setPage(0);
  };


  const emptyFormData = (): typeof formData => ({
    device_name: '',
    device_id: '',
    device_type: 'TV',
    status: 'REGISTERED',
    model: '',
    venue_partner_id: '',
    outlet_id: '',
    latitude: '',
    longitude: '',
    location_name: '',
    address: '',
    city: '',
    district: '',
    province: '',
    postal_code: '',
    country: '',
    zone: '',
  });

  const handleCreateDevice = () => {
    setDialogMode('create');
    setSelectedDevice(null);
    setFormData(emptyFormData());
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  // Maps the raw API row (whatever shape the backend returns — flat
  // model.Device JSON in production, but some legacy responses still
  // have `device_name` vs `name`) into the flat formData. Reads with
  // `(device as any)` because the TS Device type still has the legacy
  // nested shape and would block compilation otherwise.
  const handleEditDevice = (device: DeviceResponse) => {
    setDialogMode('edit');
    setSelectedDevice(device);

    const d = device as any;
    const num = (v: any) =>
      v === undefined || v === null || v === '' ? '' : String(v);

    const upperType = (v: any): typeof formData.device_type => {
      const u = String(v || '').toUpperCase();
      return (
        ['TV', 'TABLET', 'KIOSK', 'PHONE', 'UNKNOWN'].includes(u)
          ? u
          : 'TV'
      ) as typeof formData.device_type;
    };
    const upperStatus = (v: any): typeof formData.status => {
      const u = String(v || '').toUpperCase();
      return (['REGISTERED', 'ACTIVE'].includes(u) ? u : 'REGISTERED') as typeof formData.status;
    };

    setFormData({
      device_name: d.device_name || d.name || '',
      device_id: d.device_id || '',
      device_type: upperType(d.device_type),
      status: upperStatus(d.status),
      model: d.model || '',

      venue_partner_id: d.venue_partner_id || '',
      outlet_id: d.outlet_id || '',

      latitude: num(d.latitude),
      longitude: num(d.longitude),
      location_name: d.location_name || '',

      address: d.address || '',
      city: d.city || '',
      district: d.district || '',
      province: d.province || '',
      postal_code: d.postal_code || '',
      country: d.country || '',
      zone: d.zone || '',
    });

    // Auto-expand the inventory section if any of those fields already
    // carry a value — saves the admin a click when reopening a device
    // they previously filled in.
    setShowInventoryMeta(
      Boolean(
        d.address || d.city || d.district || d.province ||
        d.postal_code || d.country || d.zone,
      ),
    );

    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleViewDevice = (device: DeviceResponse) => {
    const pathPrefix = location.pathname.split('/devices')[0];
    navigate(`${pathPrefix}/devices/${device.id}`);
  };

  const handleDeleteDevice = (device: DeviceResponse) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  // ----- V2 outlet assignment -----

  // Load outlets scoped to the device's owning venue when possible.
  // Falls back to the unscoped list for legacy devices that have no
  // venue_partner_id (e.g. ones created before the partner integration
  // existed).
  const loadOutletsFor = async (device: DeviceResponse) => {
    setOutletsLoading(true);
    try {
      const params: { limit: number; venue_partner_id?: string } = { limit: 500 };
      if (device.venue_partner_id) {
        params.venue_partner_id = device.venue_partner_id;
      }
      const res = await apiService.listOutlets(params);
      setOutlets(res.data);
    } catch {
      // non-fatal: dialog will show empty list and let the user retry
    } finally {
      setOutletsLoading(false);
    }
  };

  const handleOpenAssignOutlet = (device: DeviceResponse) => {
    setOutletDialogDevice(device);
    setOutletPickerId(device.outlet_id || '');
    setOutletDialogOpen(true);
    // Always re-fetch — different devices may belong to different venues.
    setOutlets([]);
    loadOutletsFor(device);
  };

  const handleConfirmAssignOutlet = async () => {
    if (!outletDialogDevice || !outletPickerId) return;
    try {
      await apiService.assignDeviceToOutlet(outletDialogDevice.id, outletPickerId);
      setOutletDialogOpen(false);
      setOutletDialogDevice(null);
      setOutletPickerId('');
      setSuccess('Device assigned to outlet');
      await loadDevices();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to assign device to outlet');
    }
  };

  const handleUnassignOutlet = async (device: DeviceResponse) => {
    try {
      await apiService.unassignDeviceFromOutlet(device.id);
      setSuccess('Device unassigned from outlet');
      await loadDevices();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unassign device');
    }
  };

  /**
   * Full unpair — clears outlet/venue/layout and flips the row to
   * DEACTIVATED. The next time gb-media polls, the playlist endpoint
   * returns 401 and the device falls back to the pair screen. The
   * confirm copy spells this out so the operator knows on-site staff
   * will need to rescan the new QR code.
   */
  const handleDeactivateDevice = async (device: DeviceResponse) => {
    if (
      !window.confirm(
        `Deactivate "${device.name || device.device_id}"?\n\n` +
          `Outlet binding will be cleared and the TV will return to the ` +
          `pair-code screen on its next sync (≤ 2 min). On-site staff will ` +
          `need to rescan the QR code to reactivate it.\n\n` +
          `Playback history is preserved.`,
      )
    ) {
      return;
    }
    try {
      await apiService.deactivateDevice(device.id);
      setSuccess('Device deactivated');
      await loadDevices();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate device');
    }
  };

  /**
   * Force-sync — bumps the device's sync_token server-side; the
   * device's next heartbeat (≤ 5 min) detects the mismatch and
   * re-fetches its playlist immediately. Per-row spinner via
   * `syncingDeviceIds`.
   */
  const handleForceSync = async (device: DeviceResponse) => {
    setSyncingDeviceIds((prev) => new Set(prev).add(device.id));
    try {
      await apiService.forceSyncDevice(device.id);
      setSuccess(`Sync requested for ${(device as any).device_name || device.name}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request sync');
    } finally {
      setSyncingDeviceIds((prev) => {
        const next = new Set(prev);
        next.delete(device.id);
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.device_name.trim()) {
      errors.device_name = 'Device name is required';
    }
    if (!formData.device_id.trim()) {
      errors.device_id = 'Device ID is required';
    }
    if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
      errors.latitude = 'Valid latitude is required';
    }
    if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
      errors.longitude = 'Valid longitude is required';
    }
    // V2: outlet assignment is optional at creation time — admin can
    // pair the device first and bind it later. Venue picker is required
    // only when an outlet is picked (the picker enforces the cascade).

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Build the payload flat — mirrors model.Device. Hardware fields
      // (manufacturer, OS, app_version, serial, MAC, screen) are
      // intentionally omitted — they're written by gb-media at pair
      // time and the admin form doesn't expose them. Sending them as
      // empty strings here would wipe any value the device reported.
      const deviceData: any = {
        device_name: formData.device_name,
        device_id: formData.device_id,
        device_type: formData.device_type,
        status: formData.status,
        model: formData.model,
        venue_partner_id: formData.venue_partner_id || '',
        outlet_id: formData.outlet_id || '',
        address: formData.address,
        city: formData.city,
        district: formData.district,
        province: formData.province,
        postal_code: formData.postal_code,
        country: formData.country,
        location_name: formData.location_name,
        zone: formData.zone,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };

      if (dialogMode === 'create') {
        await apiService.createDevice(deviceData);
      } else if (selectedDevice) {
        await apiService.updateDevice(selectedDevice.id, deviceData);
      }

      setDialogOpen(false);
      await loadDevices();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save device');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deviceToDelete) return;

    try {
      await apiService.deleteDevice(deviceToDelete.id);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
      await loadDevices();
      setSuccess('Operation completed successfully');
    } catch (err: any) {
      setError('Operation failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'success';
      case 'REGISTERED':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getMerchantName = (device: any) => {
    // Use merchant_name from backend if available, otherwise fallback to lookup
    if (device.merchant_name) {
      return device.merchant_name;
    }
    if (device.merchant_id) {
      const merchant = merchants.find(m => m.id === device.merchant_id);
      return merchant?.name || 'Unknown Merchant';
    }
    return 'Unassigned';
  };

  /** V2 display: resolves the device's venue_partner_id + outlet_id
   *  against the loaded catalogs. Returns null when neither is set so
   *  the cell can render "Unassigned" cleanly. */
  const getVenueOutletDisplay = (device: any): { venue?: string; outlet?: string } | null => {
    const venueId = device.venue_partner_id || '';
    const outletId = device.outlet_id || '';
    if (!venueId && !outletId) return null;
    const venue = venueId
      ? venuePartners.find((v) => v.id === venueId)?.display_name
      : undefined;
    const outlet = outletId
      ? allOutlets.find((o) => o.id === outletId)?.display_name
      : undefined;
    if (!venue && !outlet) return null;
    return { venue, outlet };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <Box>
      <Box sx={pageHeaderSx}>
        <Typography variant="h4" component="h1">
          Devices Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Venue partners can pair their own devices by scanning the
              QR shown on the device. Admin gets both flows — the
              classic typed-code dialog and the scan drawer. */}
          {(hasRole('venue_partner') || hasRole('admin')) && (
            <Button
              variant={hasRole('admin') ? 'outlined' : 'contained'}
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setPairByScanOpen(true)}
            >
              Pair by scan
            </Button>
          )}
          {hasRole('admin') && (
            <>
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => setPairDialogOpen(true)}
              >
                Pair device
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateDevice}
              >
                Add Device
              </Button>
            </>
          )}
        </Box>
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
        <Box p={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search devices..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="REGISTERED">Registered</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={deviceTypeFilter}
              label="Type"
              onChange={handleDeviceTypeFilterChange}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="TV">TV</MenuItem>
              <MenuItem value="TABLET">Tablet</MenuItem>
              <MenuItem value="KIOSK">Kiosk</MenuItem>
              <MenuItem value="PHONE">Phone</MenuItem>
              <MenuItem value="UNKNOWN">Unknown</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Venue</InputLabel>
            <Select
              value={venueFilter}
              label="Venue"
              onChange={(e) => {
                setVenueFilter(e.target.value as string);
                setPage(0);
              }}
            >
              <MenuItem value="">All venues</MenuItem>
              {venuePartners.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Layout</InputLabel>
            <Select
              value={layoutFilter}
              label="Layout"
              onChange={(e) => {
                setLayoutFilter(e.target.value as string);
                setPage(0);
              }}
            >
              <MenuItem value="">All layouts</MenuItem>
              <MenuItem value="none">
                <em>Fullscreen (no layout)</em>
              </MenuItem>
              {layouts.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.display_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDevices}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {hasRole('admin') && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={
                        visibleDevices.length > 0 &&
                        selectedDeviceIds.size > 0 &&
                        !visibleDevices.every((d) => selectedDeviceIds.has(d.id))
                      }
                      checked={
                        visibleDevices.length > 0 &&
                        visibleDevices.every((d) => selectedDeviceIds.has(d.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const next = new Set(selectedDeviceIds);
                          visibleDevices.forEach((d) => next.add(d.id));
                          setSelectedDeviceIds(next);
                        } else {
                          const visibleSet = new Set(visibleDevices.map((d) => d.id));
                          const next = new Set<string>();
                          selectedDeviceIds.forEach((id) => {
                            if (!visibleSet.has(id)) next.add(id);
                          });
                          setSelectedDeviceIds(next);
                        }
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>Device</TableCell>
                <TableCell>Venue · Outlet</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Layout</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Seen</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={hasRole('admin') ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : visibleDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={hasRole('admin') ? 9 : 8} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      {devices.length > 0 && layoutFilter
                        ? `No devices match the layout filter (${devices.length} loaded, 0 matching)`
                        : 'No devices found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleDevices.map((device) => (
                  <TableRow
                    key={device.id}
                    hover
                    selected={selectedDeviceIds.has(device.id)}
                  >
                    {hasRole('admin') && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={selectedDeviceIds.has(device.id)}
                          onChange={(e) => {
                            const next = new Set(selectedDeviceIds);
                            if (e.target.checked) next.add(device.id);
                            else next.delete(device.id);
                            setSelectedDeviceIds(next);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {(device as any).device_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {device.device_id}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const vo = getVenueOutletDisplay(device);
                        if (!vo) {
                          return (
                            <Typography variant="caption" color="text.secondary">
                              Unassigned
                            </Typography>
                          );
                        }
                        return (
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {vo.venue || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {vo.outlet || 'No outlet'}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(device.device_type || 'unknown').toUpperCase()}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {device.layout_id ? (
                        <Chip
                          label={
                            layoutBySlug[device.layout_id]?.display_name ||
                            'Unknown'
                          }
                          size="small"
                          sx={{ bgcolor: '#E0F4FF', color: '#0773A3', fontWeight: 600 }}
                        />
                      ) : (
                        <Chip
                          label="Fullscreen"
                          size="small"
                          variant="outlined"
                          sx={{ borderStyle: 'dashed', color: 'text.disabled' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(device.status || 'unknown').toUpperCase()}
                        color={getStatusColor(device.status || 'active')}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {device.location?.address ? (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <LocationIcon fontSize="small" color="action" />
                          <Typography variant="body2" noWrap>
                            {device.location.address}
                          </Typography>
                        </Box>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {device.last_seen ? formatDate(device.last_seen) : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDevice(device)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {hasRole('admin') && (
                        <Tooltip title="More actions">
                          <IconButton
                            size="small"
                            onClick={(e) => openRowMenu(e, device)}
                            aria-label="more actions"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

      {/* Sticky bulk-action bar — appears only when rows are selected.
          Fixed at the bottom of the viewport so the bar stays in reach
          while the admin scrolls a long device list. */}
      {hasRole('admin') && selectedDeviceIds.size > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            px: 2.5,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            borderRadius: 999,
            boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selectedDeviceIds.size} device
            {selectedDeviceIds.size === 1 ? '' : 's'} selected
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setBulkLayoutChoice('');
              setBulkLayoutOpen(true);
            }}
          >
            Apply layout…
          </Button>
          <Button size="small" onClick={() => setSelectedDeviceIds(new Set())}>
            Clear
          </Button>
        </Paper>
      )}

      {/* Bulk-apply layout dialog — small centered dialog (this is a
          yes/no-style confirmation, not a form, so Dialog is correct
          per the gb-admin convention). */}
      <Dialog
        open={bulkLayoutOpen}
        onClose={() => !bulkApplying && setBulkLayoutOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Apply layout to {selectedDeviceIds.size} device
          {selectedDeviceIds.size === 1 ? '' : 's'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Picks the layout these devices will render. Devices fall
            back to fullscreen when no layout is set.
          </Typography>
          <FormControl fullWidth>
            <InputLabel>Layout</InputLabel>
            <Select
              value={bulkLayoutChoice}
              label="Layout"
              onChange={(e) => setBulkLayoutChoice(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Fullscreen (clear layout)</em>
              </MenuItem>
              {layouts.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.display_name}
                  {l.zones?.length
                    ? ` · ${l.zones.length} zone${l.zones.length === 1 ? '' : 's'}`
                    : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBulkLayoutOpen(false)}
            disabled={bulkApplying}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={bulkApplying}
            onClick={async () => {
              setBulkApplying(true);
              try {
                const ids: string[] = [];
                selectedDeviceIds.forEach((id) => ids.push(id));
                // One transactional UPDATE replaces the prior client-side
                // fan-out of N PUTs. Server returns the affected count
                // so we report what actually changed (not what we asked
                // for) — surfaces silent backend skips if any.
                const res = await apiService.setDevicesBulkLayout(
                  ids,
                  bulkLayoutChoice,
                );
                setBulkLayoutOpen(false);
                setSelectedDeviceIds(new Set());
                await loadDevices();
                setSuccess(
                  `Layout applied to ${res.affected} device${res.affected === 1 ? '' : 's'}`,
                );
              } catch (e: any) {
                setError(
                  e?.response?.data?.error ||
                    e?.message ||
                    'Bulk apply failed',
                );
              } finally {
                setBulkApplying(false);
              }
            }}
          >
            {bulkApplying ? <CircularProgress size={20} /> : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Row overflow menu — one instance for the whole table; anchor +
          target device come from openRowMenu(). Replaces a stack of 5-7
          icons that was overflowing the row. */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && !!menuDevice}
        onClose={closeRowMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menuDevice && [
          <MenuItem
            key="sync"
            disabled={syncingDeviceIds.has(menuDevice.id)}
            onClick={() => {
              const d = menuDevice;
              closeRowMenu();
              if (d) handleForceSync(d);
            }}
          >
            <ListItemIcon>
              {syncingDeviceIds.has(menuDevice.id) ? (
                <CircularProgress size={18} />
              ) : (
                <SyncIcon fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary="Pull latest now"
              secondary="Force playlist refresh"
            />
          </MenuItem>,
          <MenuItem
            key="layout"
            onClick={() => {
              const d = menuDevice;
              closeRowMenu();
              if (d) setLayoutDialogDevice(d);
            }}
          >
            <ListItemIcon>
              <LayoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                menuDevice.layout_id
                  ? `Layout: ${layoutBySlug[menuDevice.layout_id]?.display_name || 'unknown'}`
                  : 'Set layout'
              }
              secondary={menuDevice.layout_id ? 'Change template' : 'Default: fullscreen'}
            />
          </MenuItem>,
          <Divider key="d1" />,
          <MenuItem
            key="assign"
            onClick={() => {
              const d = menuDevice;
              closeRowMenu();
              if (d) handleOpenAssignOutlet(d);
            }}
          >
            <ListItemIcon>
              <StoreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={menuDevice.outlet_id ? 'Reassign outlet' : 'Assign outlet'}
            />
          </MenuItem>,
          menuDevice.outlet_id ? (
            <MenuItem
              key="unassign"
              onClick={() => {
                const d = menuDevice;
                closeRowMenu();
                if (d) handleUnassignOutlet(d);
              }}
            >
              <ListItemIcon>
                <LinkOffIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Unassign outlet" />
            </MenuItem>
          ) : null,
          // Full unpair — admin or the device's owning venue partner.
          // Hidden once the device is already DEACTIVATED so we don't
          // suggest the action twice. Lives in the destructive section
          // because on-site staff will need to physically rescan the
          // QR to bring it back. The backend re-checks venue_partner_id
          // ownership before letting the call through.
          (hasRole('admin') || hasRole('venue_partner')) &&
          menuDevice.status !== 'DEACTIVATED' ? (
            <MenuItem
              key="deactivate"
              onClick={() => {
                const d = menuDevice;
                closeRowMenu();
                if (d) handleDeactivateDevice(d);
              }}
              sx={{ color: 'warning.main' }}
            >
              <ListItemIcon>
                <PowerSettingsNewIcon
                  fontSize="small"
                  sx={{ color: 'warning.main' }}
                />
              </ListItemIcon>
              <ListItemText primary="Deactivate (force re-pair)" />
            </MenuItem>
          ) : null,
          <Divider key="d2" />,
          <MenuItem
            key="edit"
            onClick={() => {
              const d = menuDevice;
              closeRowMenu();
              if (d) handleEditDevice(d);
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit device" />
          </MenuItem>,
          <MenuItem
            key="delete"
            onClick={() => {
              const d = menuDevice;
              closeRowMenu();
              if (d) handleDeleteDevice(d);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primary="Delete device" />
          </MenuItem>,
        ]}
      </Menu>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Create / Edit / View device — right-side drawer per the
          consistent-modal preference. The form stays on its own scroll
          while the device list remains visible behind. Width 720px
          comfortably fits the two-column layout the inner form uses. */}
      <Drawer
        anchor="right"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Device' : 
           dialogMode === 'edit' ? 'Edit Device' : 'Device Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode !== 'view' ? (
            <Box sx={{ pt: 1 }}>
              {/* Section: Identity ------------------------------------- */}
              <FormSection title="Identity" />
              <TextField
                fullWidth
                label="Device name"
                value={formData.device_name}
                onChange={(e) =>
                  setFormData({ ...formData, device_name: e.target.value })
                }
                error={!!formErrors.device_name}
                helperText={formErrors.device_name}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Device ID"
                value={formData.device_id}
                onChange={(e) =>
                  setFormData({ ...formData, device_id: e.target.value })
                }
                error={!!formErrors.device_id}
                helperText={
                  formErrors.device_id ||
                  (dialogMode === 'edit'
                    ? 'Set by the device at pair time — edit only if you know what you are doing.'
                    : '')
                }
                margin="normal"
                required
                disabled={dialogMode === 'edit'}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Device type</InputLabel>
                    <Select
                      value={formData.device_type}
                      label="Device type"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          device_type: e.target.value as any,
                        })
                      }
                    >
                      <MenuItem value="TV">TV</MenuItem>
                      <MenuItem value="TABLET">Tablet</MenuItem>
                      <MenuItem value="KIOSK">Kiosk</MenuItem>
                      <MenuItem value="PHONE">Phone</MenuItem>
                      <MenuItem value="UNKNOWN">Unknown</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <FormControl fullWidth margin="normal" required>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      label="Status"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as any,
                        })
                      }
                    >
                      <MenuItem value="REGISTERED">Registered</MenuItem>
                      <MenuItem value="ACTIVE">Active</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Model"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                margin="normal"
                helperText="Auto-filled at pair time (e.g. Mi Box S). Other hardware fields (manufacturer, OS, app version) are captured on pair and shown on the device detail page."
                placeholder="e.g. Mi Box S"
              />

              {/* Section: Assignment ----------------------------------- */}
              <FormSection title="Assignment" />
              <FormControl fullWidth margin="normal">
                <InputLabel>Venue (optional)</InputLabel>
                <Select
                  value={formData.venue_partner_id}
                  label="Venue (optional)"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      venue_partner_id: e.target.value as string,
                      outlet_id: '',
                    })
                  }
                >
                  <MenuItem value="">
                    <em>Unassigned</em>
                  </MenuItem>
                  {venuePartners.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                fullWidth
                margin="normal"
                disabled={!formData.venue_partner_id}
              >
                <InputLabel>
                  {formData.venue_partner_id ? 'Outlet' : 'Pick a venue first'}
                </InputLabel>
                <Select
                  value={formData.outlet_id}
                  label={
                    formData.venue_partner_id ? 'Outlet' : 'Pick a venue first'
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      outlet_id: e.target.value as string,
                    })
                  }
                >
                  <MenuItem value="">
                    <em>None — assign later</em>
                  </MenuItem>
                  {allOutlets
                    .filter(
                      (o) =>
                        o.venue_partner_id === formData.venue_partner_id,
                    )
                    .map((o) => (
                      <MenuItem key={o.id} value={o.id}>
                        {o.display_name}
                        {o.city ? ` · ${o.city}` : ''}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>

              {/* Section: Location ------------------------------------- */}
              <FormSection
                title="Location"
                hint="Coordinates are captured automatically at pair time when the device shares GPS."
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Latitude"
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    error={!!formErrors.latitude}
                    helperText={formErrors.latitude}
                    margin="normal"
                    placeholder="-6.2088"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Longitude"
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    error={!!formErrors.longitude}
                    helperText={formErrors.longitude}
                    margin="normal"
                    placeholder="106.8456"
                  />
                </Grid>
              </Grid>
              <TextField
                fullWidth
                label="Location name"
                value={formData.location_name}
                onChange={(e) =>
                  setFormData({ ...formData, location_name: e.target.value })
                }
                margin="normal"
                placeholder="e.g. Main Dining Area"
                helperText="Short label for the spot inside the venue (e.g. Lobby, Food Court)."
              />

              {/* Section: Inventory metadata (collapsed by default) ---- */}
              <Box sx={{ mt: 3 }}>
                <Button
                  size="small"
                  onClick={() => setShowInventoryMeta((v) => !v)}
                  sx={{ textTransform: 'none', color: 'text.secondary', pl: 0 }}
                >
                  {showInventoryMeta ? '− Hide' : '+ Show'} inventory metadata
                </Button>
              </Box>
              {showInventoryMeta && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ display: 'block', color: 'text.disabled', mb: 1 }}
                  >
                    Optional postal address fields. Most devices inherit
                    these from the outlet — fill only if you need
                    per-device overrides for reporting.
                  </Typography>
                  <TextField
                    fullWidth
                    label="Address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    margin="normal"
                    multiline
                    rows={2}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="City"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="District"
                        value={formData.district}
                        onChange={(e) =>
                          setFormData({ ...formData, district: e.target.value })
                        }
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Province"
                        value={formData.province}
                        onChange={(e) =>
                          setFormData({ ...formData, province: e.target.value })
                        }
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Postal code"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            postal_code: e.target.value,
                          })
                        }
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                        margin="normal"
                        placeholder="Indonesia"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Zone"
                        value={formData.zone}
                        onChange={(e) =>
                          setFormData({ ...formData, zone: e.target.value })
                        }
                        margin="normal"
                        placeholder="e.g. Food Court"
                      />
                    </Grid>
                  </Grid>
                </>
              )}
            </Box>
          ) : (
            <Box sx={{ pt: 1, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Device details have been moved to a dedicated page. Please use the "View Details" button in the device list.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : (dialogMode === 'create' ? 'Create' : 'Update')}
            </Button>
          )}
        </DialogActions>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete device "{deviceToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign to Outlet — right-side drawer for the form-style
          consistency. Width 480px is enough for the outlet picker. */}
      <Drawer
        anchor="right"
        open={outletDialogOpen}
        onClose={() => setOutletDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        <DialogTitle>
          {outletDialogDevice?.outlet_id ? 'Reassign Outlet' : 'Assign Device to Outlet'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Device:{' '}
              <strong>
                {(outletDialogDevice as any)?.device_name || outletDialogDevice?.name}
              </strong>{' '}
              ({outletDialogDevice?.device_id})
            </Typography>
            {outletDialogDevice?.venue_partner_id ? (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Outlets below are filtered to the device's owning venue partner.
              </Typography>
            ) : (
              <Typography variant="caption" color="warning.main" sx={{ mb: 2, display: 'block' }}>
                Legacy device — no owning venue. All outlets shown; pick carefully.
              </Typography>
            )}
            <FormControl fullWidth required disabled={outletsLoading}>
              <InputLabel>Outlet</InputLabel>
              <Select
                value={outletPickerId}
                label="Outlet"
                onChange={(e) => setOutletPickerId(e.target.value as string)}
              >
                {outlets.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.display_name} {o.city ? `— ${o.city}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutletDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAssignOutlet}
            variant="contained"
            disabled={!outletPickerId}
          >
            {outletDialogDevice?.outlet_id ? 'Reassign' : 'Assign'}
          </Button>
        </DialogActions>
      </Drawer>

      {/* V2 Pair-a-new-device dialog — opens from the header "Pair device" button */}
      <PairDeviceDialog
        open={pairDialogOpen}
        onClose={() => setPairDialogOpen(false)}
        onPaired={() => {
          setSuccess('Device paired — screen should switch to playback shortly');
          loadDevices();
        }}
      />

      {/* V2 Pair-by-scan drawer — opens from "Pair by scan". Scopes
          venue_partner_id from the logged-in user; admin can also use
          this entry point but the dropdown would be empty until we let
          them pick a venue (separate task). */}
      <PairDeviceByScan
        open={pairByScanOpen}
        onClose={() => setPairByScanOpen(false)}
        venuePartnerId={user?.venue_partner_id || ''}
        onPaired={() => {
          setSuccess('Device paired — screen should switch to playback shortly');
          loadDevices();
        }}
      />

      {/* V2 Set-device-layout dialog — opens from the per-row layout icon */}
      <DeviceLayoutDialog
        open={!!layoutDialogDevice}
        device={layoutDialogDevice}
        onClose={() => setLayoutDialogDevice(null)}
        onSaved={() => {
          setSuccess('Device layout updated');
          loadDevices();
        }}
      />
    </Box>
  );
};

export default DevicesManagement;
