import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Store as StoreIcon,
  DeviceHub as DeviceIcon,
} from '@mui/icons-material';
import { Merchant, Device, FilterOptions } from '../types';
import { apiService } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MerchantsManagement: React.FC = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [merchantDevices, setMerchantDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Device assignment dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [assigningDevice, setAssigningDevice] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [merchantToDelete, setMerchantToDelete] = useState<Merchant | null>(null);

  useEffect(() => {
    loadMerchants();
  }, [page, rowsPerPage, searchTerm, statusFilter]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const devicesResponse = await apiService.getDevices({ limit: 1000 });
      setDevices(devicesResponse.data);
    } catch (err: any) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadMerchants = async () => {
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

      const response = await apiService.getMerchants(filters);
      setMerchants(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const loadMerchantDevices = async (merchantId: string) => {
    try {
      const response = await apiService.getDevices({ merchant_id: merchantId });
      setMerchantDevices(response.data);
    } catch (err: any) {
      console.error('Failed to load merchant devices:', err);
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


  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateMerchant = () => {
    setDialogMode('create');
    setSelectedMerchant(null);
    setFormData({
      name: '',
      description: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
    });
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleEditMerchant = (merchant: Merchant) => {
    setDialogMode('edit');
    setSelectedMerchant(merchant);
    setFormData({
      name: merchant.name,
      description: merchant.description || '',
      email: merchant.email || '',
      phone: merchant.phone || '',
      address: merchant.address || '',
      status: merchant.status || 'active',
    });
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleViewMerchant = (merchant: Merchant) => {
    setDialogMode('view');
    setSelectedMerchant(merchant);
    setTabValue(0);
    setDialogOpen(true);
    loadMerchantDevices(String(merchant.id));
  };

  const handleAssignDevice = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setSelectedDevice('');
    setAssignDialogOpen(true);
  };

  const handleDeleteMerchant = (merchant: Merchant) => {
    setMerchantToDelete(merchant);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Merchant name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Valid email is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      if (dialogMode === 'create') {
        await apiService.createMerchant(formData);
      } else if (selectedMerchant) {
        await apiService.updateMerchant(String(selectedMerchant.id), formData);
      }

      setDialogOpen(false);
      await loadMerchants();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save merchant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeviceAssignment = async () => {
    if (!selectedMerchant || !selectedDevice) return;

    try {
      setAssigningDevice(true);
      await apiService.assignDeviceToMerchant(selectedDevice, String(selectedMerchant.id));
      setAssignDialogOpen(false);
      await loadMerchants();
      if (dialogMode === 'view') {
        await loadMerchantDevices(String(selectedMerchant.id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign device');
    } finally {
      setAssigningDevice(false);
    }
  };

  const confirmDelete = async () => {
    if (!merchantToDelete) return;

    try {
      await apiService.deleteMerchant(String(merchantToDelete.id));
      setDeleteDialogOpen(false);
      setMerchantToDelete(null);
      await loadMerchants();
      setSuccess('Operation completed successfully');
    } catch (err: any) {
      // Show error but don't block the UI - use a snackbar or temporary alert
      console.error('Delete error:', err);
      setError('Operation failed');
      // Don't close the dialog on error, let user try again
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
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

  const getAvailableDevices = () => {
    return devices.filter(device => !device.merchant_id || device.merchant_id === '');
  };

  // Don't block the entire page on error - show error inline instead

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={() => setError(null)}>
              Dismiss
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }} 
          onClose={() => setSuccess(null)}
          action={
            <Button color="inherit" size="small" onClick={() => setSuccess(null)}>
              Dismiss
            </Button>
          }
        >
          {success}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Merchants Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateMerchant}
        >
          Add Merchant
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search merchants..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadMerchants}
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
                <TableCell>Merchant</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
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
              ) : merchants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No merchants found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                merchants.map((merchant) => (
                  <TableRow key={merchant.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <StoreIcon color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {merchant.name}
                          </Typography>
                          {merchant.description && (
                            <Typography variant="caption" color="textSecondary">
                              {merchant.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>N/A</TableCell>
                    <TableCell>
                      {merchant.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box>
                        {merchant.email && (
                          <Typography variant="body2">
                            {merchant.email}
                          </Typography>
                        )}
                        {merchant.phone && (
                          <Typography variant="caption" color="textSecondary">
                            {merchant.phone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(merchant.status || 'unknown').toUpperCase()}
                        color={getStatusColor(merchant.status || 'active')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(merchant.created_at || new Date().toISOString())}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewMerchant(merchant)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditMerchant(merchant)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Assign Device">
                        <IconButton
                          size="small"
                          onClick={() => handleAssignDevice(merchant)}
                        >
                          <DeviceIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteMerchant(merchant)}
                          color="error"
                        >
                          <DeleteIcon />
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
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Merchant' :
           dialogMode === 'edit' ? 'Edit Merchant' : 'Merchant Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedMerchant ? (
            <Box sx={{ mt: 2 }}>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="Details" />
                <Tab label="Devices" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Basic Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Name:</strong> {selectedMerchant.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong> {selectedMerchant.email || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Phone:</strong> {selectedMerchant.phone || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Status:</strong> {(selectedMerchant.status || 'unknown').toUpperCase()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Created:</strong> {formatDate(selectedMerchant.created_at || new Date().toISOString())}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Additional Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Description:</strong> {selectedMerchant.description || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Address:</strong> {selectedMerchant.address || 'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Typography variant="h6" gutterBottom>
                  Assigned Devices ({merchantDevices.length})
                </Typography>
                {merchantDevices.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No devices assigned to this merchant.
                  </Typography>
                ) : (
                  <Box>
                    {merchantDevices.map((device) => (
                      <Card key={device.id} sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="body1" fontWeight="medium">
                            {device.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            ID: {device.device_id}
                          </Typography>
                          <Typography variant="body2">
                            Status: <Chip label={device.status} size="small" />
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </TabPanel>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Merchant Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                error={!!formErrors.name}
                helperText={formErrors.name}
                margin="normal"
                required
              />

              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={!!formErrors.email}
                helperText={formErrors.email}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                margin="normal"
                multiline
                rows={3}
                helperText="Brief description of the merchant"
              />

              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                margin="normal"
                multiline
                rows={2}
                helperText="Physical address of the merchant"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          {dialogMode !== 'view' && (
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Device Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)}>
        <DialogTitle>Assign Device to Merchant</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Available Device</InputLabel>
            <Select
              value={selectedDevice}
              label="Available Device"
              onChange={(e) => setSelectedDevice(e.target.value)}
            >
              {getAvailableDevices().map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.name} ({device.device_id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeviceAssignment}
            variant="contained"
            disabled={!selectedDevice || assigningDevice}
          >
            {assigningDevice ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Merchant</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{merchantToDelete?.name}"? This action cannot be undone.
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

export default MerchantsManagement;