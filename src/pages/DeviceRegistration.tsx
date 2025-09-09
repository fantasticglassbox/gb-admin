import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material';
import {
  Tv as TvIcon,
  Tablet as TabletIcon,
  PhoneAndroid as PhoneIcon,
  Computer as KioskIcon,
  DeviceUnknown as UnknownIcon,
  LocationOn as LocationIcon,
  Assignment as AssignIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  CheckCircle as ActiveIcon,
  Schedule as RegisteredIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import LocationGenerationDialog from '../components/LocationGenerationDialog';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  operating_system: string;
  device_type: 'TV' | 'TABLET' | 'KIOSK' | 'PHONE' | 'UNKNOWN';
  status: 'REGISTERED' | 'ACTIVE';
  model?: string;
  manufacturer?: string;
  serial_number?: string;
  os_version?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  district?: string;
  province?: string;
  country?: string;
  postal_code?: string;
  location_name?: string;
  zone?: string;
  created_at: string;
}

interface Merchant {
  id: string | number;
  name: string;
  address?: string;
}

const DeviceRegistration: React.FC = () => {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [unassignedDevices, merchantsData] = await Promise.all([
        apiService.getUnassignedDevices(),
        apiService.getMerchants({ limit: 1000 })
      ]);
      
      setDevices(unassignedDevices.data || []);
      setMerchants(merchantsData.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDevice = async () => {
    if (!selectedDevice || !selectedMerchant) return;

    try {
      setAssigning(true);
      await apiService.assignDeviceToMerchant(selectedDevice.id, String(selectedMerchant));
      
      setAssignDialogOpen(false);
      setSelectedDevice(null);
      setSelectedMerchant('');
      await loadData(); // Reload to remove assigned device from list
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign device');
    } finally {
      setAssigning(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'TV':
        return <TvIcon />;
      case 'TABLET':
        return <TabletIcon />;
      case 'PHONE':
        return <PhoneIcon />;
      case 'KIOSK':
        return <KioskIcon />;
      default:
        return <UnknownIcon />;
    }
  };

  const getDeviceTypeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'TV':
        return 'primary';
      case 'TABLET':
        return 'secondary';
      case 'PHONE':
        return 'success';
      case 'KIOSK':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatLocation = (device: Device) => {
    if (device.latitude && device.longitude) {
      return `${device.latitude.toFixed(6)}, ${device.longitude.toFixed(6)}`;
    }
    return 'No location data';
  };

  if (!hasRole('admin')) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {t('unauthorizedAccess')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {t('deviceRegistration')}
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<LocationIcon />}
            onClick={() => setShowLocationDialog(true)}
            disabled={loading}
            color="secondary"
          >
            Generate Location Info
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={loading}
          >
            {t('refresh')}
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Badge badgeContent={devices.length} color="primary">
                  <RegisteredIcon color="primary" />
                </Badge>
                <Box>
                  <Typography variant="h6">{devices.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('unassignedDevices')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <TvIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    {devices.filter(d => d.device_type === 'TV').length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    TV Devices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <LocationIcon color="success" />
                <Box>
                  <Typography variant="h6">
                    {devices.filter(d => d.latitude && d.longitude).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    With Location
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <AssignIcon color="warning" />
                <Box>
                  <Typography variant="h6">{merchants.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('availableMerchants')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : devices.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <RegisteredIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            {t('noUnassignedDevices')}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            All devices have been assigned to merchants or no devices have registered yet.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('device')}</TableCell>
                <TableCell>{t('type')}</TableCell>
                <TableCell>{t('hardware')}</TableCell>
                <TableCell>{t('location')}</TableCell>
                <TableCell>{t('registeredAt')}</TableCell>
                <TableCell align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {device.device_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        ID: {device.device_id}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      icon={getDeviceIcon(device.device_type)}
                      label={device.device_type}
                      color={getDeviceTypeColor(device.device_type) as any}
                      size="small"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {device.manufacturer} {device.model}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {device.operating_system} {device.os_version}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {device.latitude && device.longitude ? (
                        <>
                          <LocationIcon fontSize="small" color="success" />
                          <Box>
                            <Typography variant="body2">
                              {formatLocation(device)}
                            </Typography>
                            {device.location_name && (
                              <Typography variant="caption" color="textSecondary">
                                {device.location_name}
                              </Typography>
                            )}
                          </Box>
                        </>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No location data
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(device.created_at).toLocaleString()}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Tooltip title={t('viewDetails')}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedDevice(device);
                          setDetailDialogOpen(true);
                        }}
                      >
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('assignToMerchant')}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => {
                          setSelectedDevice(device);
                          setAssignDialogOpen(true);
                        }}
                      >
                        <AssignIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => !assigning && setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('assignDeviceToMerchant')}
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                {t('device')}: {selectedDevice.device_name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {selectedDevice.device_type} - {selectedDevice.manufacturer} {selectedDevice.model}
              </Typography>
            </Box>
          )}
          
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('selectMerchant')}</InputLabel>
            <Select
              value={selectedMerchant}
              label={t('selectMerchant')}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              disabled={assigning}
            >
              {merchants.map((merchant) => (
                <MenuItem key={merchant.id} value={String(merchant.id)}>
                  <Box>
                    <Typography variant="body1">{merchant.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {merchant.address || 'No address'}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={assigning}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleAssignDevice}
            variant="contained"
            disabled={!selectedMerchant || assigning}
            startIcon={assigning ? <CircularProgress size={20} /> : <AssignIcon />}
          >
            {assigning ? t('assigning') : t('assign')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Device Details Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {t('deviceDetails')}
        </DialogTitle>
        <DialogContent>
          {selectedDevice && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('basicInformation')}
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2"><strong>Device Name:</strong> {selectedDevice.device_name}</Typography>
                  <Typography variant="body2"><strong>Device ID:</strong> {selectedDevice.device_id}</Typography>
                  <Typography variant="body2"><strong>Type:</strong> {selectedDevice.device_type}</Typography>
                  <Typography variant="body2"><strong>Status:</strong> {selectedDevice.status}</Typography>
                  <Typography variant="body2"><strong>OS:</strong> {selectedDevice.operating_system} {selectedDevice.os_version}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('hardwareInformation')}
                </Typography>
                <Box mb={2}>
                  <Typography variant="body2"><strong>Manufacturer:</strong> {selectedDevice.manufacturer || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Model:</strong> {selectedDevice.model || 'N/A'}</Typography>
                  <Typography variant="body2"><strong>Serial Number:</strong> {selectedDevice.serial_number || 'N/A'}</Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  {t('locationInformation')}
                </Typography>
                {selectedDevice.latitude && selectedDevice.longitude ? (
                  <Box>
                    <Typography variant="body2"><strong>Coordinates:</strong> {formatLocation(selectedDevice)}</Typography>
                    {selectedDevice.address && (
                      <Typography variant="body2"><strong>Address:</strong> {selectedDevice.address}</Typography>
                    )}
                    {selectedDevice.city && (
                      <Typography variant="body2"><strong>City:</strong> {selectedDevice.city}</Typography>
                    )}
                    {selectedDevice.district && (
                      <Typography variant="body2"><strong>District:</strong> {selectedDevice.district}</Typography>
                    )}
                    {selectedDevice.province && (
                      <Typography variant="body2"><strong>Province:</strong> {selectedDevice.province}</Typography>
                    )}
                    {selectedDevice.country && (
                      <Typography variant="body2"><strong>Country:</strong> {selectedDevice.country}</Typography>
                    )}
                    {selectedDevice.postal_code && (
                      <Typography variant="body2"><strong>Postal Code:</strong> {selectedDevice.postal_code}</Typography>
                    )}
                    <Typography variant="body2"><strong>Location Name:</strong> {selectedDevice.location_name || 'N/A'}</Typography>
                    <Typography variant="body2"><strong>Zone:</strong> {selectedDevice.zone || 'N/A'}</Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No location information available
                  </Typography>
                )}
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2">
                  <strong>Registered At:</strong> {new Date(selectedDevice.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Generation Dialog */}
      <LocationGenerationDialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onSuccess={() => {
          setShowLocationDialog(false);
          loadData(); // Refresh the device list
        }}
      />
    </Box>
  );
};

export default DeviceRegistration;
