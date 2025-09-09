import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  InputAdornment,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  LocationOn as LocationIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { DeviceResponse, Merchant, ActiveAdvertisement } from '../types';
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
      id={`device-tabpanel-${index}`}
      aria-labelledby={`device-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  console.log('DeviceDetail component loaded with deviceId:', deviceId); // Debug log
  
  const [device, setDevice] = useState<DeviceResponse | null>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [deviceMerchant, setDeviceMerchant] = useState<Merchant | null>(null);
  const [activeAds, setActiveAds] = useState<ActiveAdvertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adsLoading, setAdsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Ads pagination and filtering
  const [adsPage, setAdsPage] = useState(0);
  const [adsRowsPerPage, setAdsRowsPerPage] = useState(10);
  const [adsSearchTerm, setAdsSearchTerm] = useState('');
  const [adsStatusFilter, setAdsStatusFilter] = useState<string>('');

  const loadDevice = async () => {
    if (!deviceId) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Loading device with ID:', deviceId); // Debug log
      const deviceData = await apiService.getDevice(deviceId);
      console.log('Device data received:', deviceData); // Debug log
      setDevice(deviceData);
    } catch (err: any) {
      console.error('Failed to load device:', err); // Debug log
      setError(err.response?.data?.message || 'Failed to load device');
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

  const loadDeviceMerchant = async () => {
    if (!deviceId) return;
    
    try {
      const merchant = await apiService.getDeviceMerchant(deviceId);
      setDeviceMerchant(merchant);
      console.log('Device merchant loaded:', merchant); // Debug log
    } catch (err: any) {
      console.error('Failed to load device merchant:', err);
      setDeviceMerchant(null);
    }
  };

  const loadActiveAds = async () => {
    if (!deviceId) return;
    
    try {
      setAdsLoading(true);
      const response = await apiService.getDevicesWithActiveAds();
      if (response && Array.isArray(response.devices)) {
        const deviceWithAds = response.devices.find(d => d.id === deviceId);
        setActiveAds(deviceWithAds?.active_ads || []);
      } else {
        setActiveAds([]);
      }
    } catch (err: any) {
      console.error('Failed to load device active ads:', err);
      setActiveAds([]);
    } finally {
      setAdsLoading(false);
    }
  };

  const getMerchantName = (): string => {
    // First check if device has merchant_name from the API
    if (device && (device as any).merchant_name) {
      return (device as any).merchant_name;
    }
    // Fallback to separately loaded merchant
    return deviceMerchant ? deviceMerchant.name : 'Unassigned';
  };

  useEffect(() => {
    if (deviceId) {
      loadDevice();
      loadMerchants();
      loadDeviceMerchant();
      loadActiveAds();
    }
  }, [deviceId]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Helper function to parse device detail JSON
  const getDeviceDetail = (field: string): string => {
    if (!device) return 'N/A';
    
    try {
      const detail = (device as any).detail;
      if (detail && typeof detail === 'string') {
        const parsed = JSON.parse(detail);
        return parsed[field] || (device as any)[field] || 'N/A';
      }
      return (device as any)[field] || 'N/A';
    } catch {
      return (device as any)[field] || 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published': return 'success';
      case 'draft': return 'warning';
      case 'rejected': return 'error';
      case 'inactive': return 'default';
      default: return 'default';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'video': return 'primary';
      case 'image': return 'secondary';
      case 'html': return 'info';
      default: return 'default';
    }
  };

  // Filter active ads
  const filteredAds = activeAds.filter(ad => {
    const matchesSearch = !adsSearchTerm || 
      ad.title?.toLowerCase().includes(adsSearchTerm.toLowerCase()) ||
      ad.partner_name?.toLowerCase().includes(adsSearchTerm.toLowerCase());
    
    const matchesStatus = !adsStatusFilter || ad.state === adsStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Paginate filtered ads
  const paginatedAds = filteredAds.slice(
    adsPage * adsRowsPerPage,
    adsPage * adsRowsPerPage + adsRowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !device) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/devices')}
            sx={{ mr: 2 }}
          >
            Back to Devices
          </Button>
          <Typography variant="h4">Device Not Found</Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <Button
            startIcon={<BackIcon />}
            onClick={() => {
              const pathPrefix = location.pathname.split('/devices')[0];
              navigate(`${pathPrefix}/devices`);
            }}
            sx={{ mr: 2 }}
          >
            Back to Devices
          </Button>
          <Typography variant="h4" component="h1">
            Device Details: {(device as any).device_name || device.name || 'Unknown Device'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            loadDevice();
            loadDeviceMerchant();
            loadActiveAds();
          }}
        >
          Refresh
        </Button>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Device Details" />
          <Tab label="Active Advertisements" />
        </Tabs>
      </Paper>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Name:</strong> {(device as any).device_name || device.name}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Device ID:</strong> {device.device_id}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Merchant:</strong> {getMerchantName()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Type:</strong> {((device as any).device_type || 'unknown').toUpperCase()}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Status:</strong>
                  <Chip 
                    label={((device as any).status || 'unknown').toUpperCase()} 
                    color={(device as any).status === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Created:</strong> {formatDate((device as any).created_at || device.created_at)}
                </Typography>
                <Typography variant="body2">
                  <strong>Last Seen:</strong> {(device as any).last_seen ? formatDate((device as any).last_seen) : 'Never'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Device Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Model:</strong> {getDeviceDetail('model')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Manufacturer:</strong> {getDeviceDetail('manufacturer')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Serial Number:</strong> {getDeviceDetail('sn') !== 'N/A' ? getDeviceDetail('sn') : getDeviceDetail('serial_number')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>OS:</strong> {(device as any).operating_system || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>OS Version:</strong> {getDeviceDetail('os_version')}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>App Version:</strong> {(device as any).app_version || 'N/A'}
                </Typography>
                <Typography variant="body2">
                  <strong>Screen Resolution:</strong> {(device as any).screen_resolution || 'N/A'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {((device as any).address || (device as any).latitude || (device as any).longitude) && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Location Information
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Address:</strong> {(device as any).address || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>City:</strong> {(device as any).city || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>District:</strong> {(device as any).district || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Province:</strong> {(device as any).province || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Location Name:</strong> {(device as any).location_name || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Zone:</strong> {(device as any).zone || 'N/A'}
                  </Typography>
                  {(device as any).latitude && (device as any).longitude && (
                    <Typography variant="body2">
                      <LocationIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      <strong>Coordinates:</strong> {(device as any).latitude}, {(device as any).longitude}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ mb: 2 }}>
          <Box p={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
              <TextField
                placeholder="Search advertisements..."
                value={adsSearchTerm}
                onChange={(e) => {
                  setAdsSearchTerm(e.target.value);
                  setAdsPage(0); // Reset to first page when searching
                }}
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
                  value={adsStatusFilter}
                  label="Status"
                  onChange={(e) => {
                    setAdsStatusFilter(e.target.value);
                    setAdsPage(0); // Reset to first page when filtering
                  }}
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="REJECTED">Rejected</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                </Select>
              </FormControl>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                loadActiveAds();
                setAdsPage(0); // Reset to first page
              }}
            >
              Refresh Ads
            </Button>
          </Box>
        </Paper>

        <Paper>
          {adsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Partner</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Duration</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Start Date</TableCell>
                      <TableCell>End Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedAds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body1" color="text.secondary" py={4}>
                            No active advertisements found for this device
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAds.map((ad, index) => (
                        <TableRow key={ad.id || index}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {ad.title || 'Untitled Ad'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {ad.partner_name || 'Unknown Partner'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={ad.type || 'Unknown'} 
                              size="small"
                              color={getTypeColor(ad.type || '')}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {ad.duration || 0}s
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={ad.state || 'Unknown'} 
                              size="small"
                              color={getStatusColor(ad.state || '')}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {ad.published_time_start ? new Date(ad.published_time_start).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {ad.published_time_end ? new Date(ad.published_time_end).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Advertisement">
                              <IconButton size="small">
                                <ViewIcon />
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
                count={filteredAds.length}
                page={adsPage}
                onPageChange={(_, newPage) => setAdsPage(newPage)}
                rowsPerPage={adsRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setAdsRowsPerPage(parseInt(e.target.value, 10));
                  setAdsPage(0);
                }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default DeviceDetail;
