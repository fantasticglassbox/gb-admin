import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
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
  Card,
  CardContent,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
  GetApp as ExportIcon,
} from '@mui/icons-material';
import { DeviceResponse, Merchant, FilterOptions } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DevicesManagement: React.FC = () => {
  const { hasRole } = useAuth();
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
  

  const [formData, setFormData] = useState({
    name: '',
    device_id: '',
    device_secret: '',
    merchant_id: '',
    status: 'active' as 'active' | 'inactive' | 'maintenance' | 'offline',
    device_type: 'tablet' as 'tablet' | 'phone' | 'tv' | 'kiosk',
    location: {
      latitude: '',
      longitude: '',
      address: '',
    },
    device_info: {
      model: '',
      os: '',
      app_version: '',
      screen_resolution: '',
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceResponse | null>(null);

  useEffect(() => {
    loadDevices();
  }, [page, rowsPerPage, searchTerm, statusFilter, merchantFilter, deviceTypeFilter]);

  useEffect(() => {
    loadMerchants();
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

      const response = await apiService.getDevices(filters);
      setDevices(response.data);
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

  const handleExportActivities = async () => {
    try {
      const blob = await apiService.exportDeviceActivities({
        format: 'excel',
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
        end_date: new Date().toISOString().split('T')[0],
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `device-activities-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting device activities:', error);
      setError('Failed to export device activities');
    }
  };

  const handleCreateDevice = () => {
    setDialogMode('create');
    setSelectedDevice(null);
    setFormData({
      name: '',
      device_id: '',
      device_secret: '',
      merchant_id: '',
      status: 'active',
      device_type: 'tablet',
      location: {
        latitude: '',
        longitude: '',
        address: '',
      },
      device_info: {
        model: '',
        os: '',
        app_version: '',
        screen_resolution: '',
      },
    });
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleEditDevice = (device: DeviceResponse) => {
    setDialogMode('edit');
    setSelectedDevice(device);
    
    // Helper function to parse device detail JSON
    const parseDeviceDetail = (detail: string) => {
      try {
        return detail ? JSON.parse(detail) : {};
      } catch {
        return {};
      }
    };

    // Helper function to safely convert to string
    const safeToString = (value: any) => {
      return (value !== undefined && value !== null) ? value.toString() : '';
    };

    const deviceDetail = parseDeviceDetail((device as any).detail || '');

    setFormData({
      name: (device as any).device_name || device.name,
      device_id: device.device_id,
      device_secret: device.device_secret || '',
      merchant_id: (device as any).merchant_id || device.merchant_id,
      status: device.status,
      device_type: device.device_type,
      location: {
        latitude: safeToString((device as any).latitude) || safeToString(device.location?.latitude),
        longitude: safeToString((device as any).longitude) || safeToString(device.location?.longitude),
        address: (device as any).address || device.location?.address || '',
      },
      device_info: {
        model: deviceDetail.model || (device as any).model || device.device_info?.model || '',
        os: (device as any).operating_system || device.device_info?.os || '',
        app_version: (device as any).app_version || device.device_info?.app_version || '',
        screen_resolution: (device as any).screen_resolution || device.device_info?.screen_resolution || '',
      },
    });
    
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleViewDevice = (device: DeviceResponse) => {
    // Get the current path prefix (e.g., '/admin' or '/partner')
    const pathPrefix = location.pathname.split('/devices')[0];
    navigate(`${pathPrefix}/devices/${device.id}`);
  };

  const handleDeleteDevice = (device: DeviceResponse) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Device name is required';
    }

    if (!formData.device_id.trim()) {
      errors.device_id = 'Device ID is required';
    }

    if (!formData.merchant_id) {
      errors.merchant_id = 'Merchant is required';
    }

    if (formData.location.latitude && isNaN(parseFloat(formData.location.latitude))) {
      errors.latitude = 'Valid latitude is required';
    }

    if (formData.location.longitude && isNaN(parseFloat(formData.location.longitude))) {
      errors.longitude = 'Valid longitude is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      const deviceData = {
        ...formData,
        location: {
          ...formData.location,
          latitude: formData.location.latitude ? parseFloat(formData.location.latitude) : undefined,
          longitude: formData.location.longitude ? parseFloat(formData.location.longitude) : undefined,
        },
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Devices Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportActivities}
          >
            Export Activities
          </Button>
          {hasRole('admin') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateDevice}
            >
              Add Device
            </Button>
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
            <InputLabel>Merchant</InputLabel>
            <Select
              value={merchantFilter}
              label="Merchant"
              onChange={handleMerchantFilterChange}
            >
              <MenuItem value="">All Merchants</MenuItem>
              {merchants.map((merchant) => (
                <MenuItem key={merchant.id} value={merchant.id}>
                  {merchant.name}
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
                <TableCell>Device</TableCell>
                <TableCell>Merchant</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Seen</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No devices found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id} hover>
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
                    <TableCell>{getMerchantName(device)}</TableCell>
                    <TableCell>
                      <Chip
                        label={(device.device_type || 'unknown').toUpperCase()}
                        variant="outlined"
                        size="small"
                      />
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
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDevice(device)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {hasRole('admin') && (
                        <>
                          <Tooltip title="Edit Device">
                            <IconButton
                              size="small"
                              onClick={() => handleEditDevice(device)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Device">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteDevice(device)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

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

      {/* Create/Edit/View Device Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Add New Device' : 
           dialogMode === 'edit' ? 'Edit Device' : 'Device Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode !== 'view' ? (
            <Box sx={{ pt: 1 }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Basic Info" />
                <Tab label="Device Details" />
                <Tab label="Location" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <TextField
                  fullWidth
                  label="Device Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  label="Device ID"
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  error={!!formErrors.device_id}
                  helperText={formErrors.device_id}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  label="Device Secret"
                  type="password"
                  value={formData.device_secret}
                  onChange={(e) => setFormData({ ...formData, device_secret: e.target.value })}
                  margin="normal"
                  helperText="Leave blank to keep current secret"
                />

                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Merchant</InputLabel>
                  <Select
                    value={formData.merchant_id}
                    label="Merchant"
                    onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                    error={!!formErrors.merchant_id}
                  >
                    {merchants.map((merchant) => (
                      <MenuItem key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth margin="normal" required>
                      <InputLabel>Device Type</InputLabel>
                      <Select
                        value={formData.device_type}
                        label="Device Type"
                        onChange={(e) => setFormData({ ...formData, device_type: e.target.value as any })}
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
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      >
                        <MenuItem value="REGISTERED">Registered</MenuItem>
                        <MenuItem value="ACTIVE">Active</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TextField
                  fullWidth
                  label="Device Model"
                  value={formData.device_info.model}
                  onChange={(e) => setFormData({
                    ...formData,
                    device_info: { ...formData.device_info, model: e.target.value }
                  })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Operating System"
                  value={formData.device_info.os}
                  onChange={(e) => setFormData({
                    ...formData,
                    device_info: { ...formData.device_info, os: e.target.value }
                  })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="App Version"
                  value={formData.device_info.app_version}
                  onChange={(e) => setFormData({
                    ...formData,
                    device_info: { ...formData.device_info, app_version: e.target.value }
                  })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Screen Resolution"
                  value={formData.device_info.screen_resolution}
                  onChange={(e) => setFormData({
                    ...formData,
                    device_info: { ...formData.device_info, screen_resolution: e.target.value }
                  })}
                  margin="normal"
                  placeholder="1920x1080"
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <TextField
                  fullWidth
                  label="Address"
                  value={formData.location.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    location: { ...formData.location, address: e.target.value }
                  })}
                  margin="normal"
                  multiline
                  rows={2}
                />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Latitude"
                      value={formData.location.latitude}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { ...formData.location, latitude: e.target.value }
                      })}
                      error={!!formErrors.latitude}
                      helperText={formErrors.latitude}
                      margin="normal"
                      placeholder="40.7128"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Longitude"
                      value={formData.location.longitude}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { ...formData.location, longitude: e.target.value }
                      })}
                      error={!!formErrors.longitude}
                      helperText={formErrors.longitude}
                      margin="normal"
                      placeholder="-74.0060"
                    />
                  </Grid>
                </Grid>
              </TabPanel>
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
      </Dialog>

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
    </Box>
  );
};

export default DevicesManagement;
