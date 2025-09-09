import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Card,
  CardContent,
  Grid,
  CircularProgress,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/api';

interface Device {
  device_id: string;
  device_name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  district?: string;
  province?: string;
  country?: string;
}

interface LocationGenerationResult {
  success: boolean;
  message: string;
  processed: number;
  updated: number;
  failed: number;
  failed_items?: Array<{
    device_id: string;
    error: string;
  }>;
}

interface LocationGenerationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LocationGenerationDialog: React.FC<LocationGenerationDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [devicesNeedingInfo, setDevicesNeedingInfo] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<LocationGenerationResult | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      loadDevicesNeedingInfo();
      setResult(null);
      setProgress(0);
    }
  }, [open]);

  const loadDevicesNeedingInfo = async () => {
    setLoadingDevices(true);
    try {
      const response = await apiService.getDevicesNeedingLocationInfo();
      setDevicesNeedingInfo(response.devices || []);
    } catch (error) {
      console.error('Failed to load devices needing location info:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    setProgress(0);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const response = await apiService.generateLocationInfo({ all: true });
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(response);
      
      if (response.success && onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.error || 'Failed to generate location information',
        processed: 0,
        updated: 0,
        failed: devicesNeedingInfo.length,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    if (!generating) {
      setResult(null);
      setProgress(0);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={generating}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LocationIcon color="primary" />
        Generate Location Information
      </DialogTitle>

      <DialogContent>
        {loadingDevices ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading devices that need location information...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Summary Card */}
            <Card elevation={2} sx={{ mb: 3 }}>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {devicesNeedingInfo.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Devices Need Location Info
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" gutterBottom>
                      <strong>What this will do:</strong>
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Use Google Maps API to reverse geocode existing latitude/longitude coordinates
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Fill in missing address, city, district, province, and country information
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      • Only update empty fields, preserving existing location data
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Progress Section */}
            {generating && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Generating location information...
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={progress} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  {progress}% Complete
                </Typography>
              </Box>
            )}

            {/* Results Section */}
            {result && (
              <Box sx={{ mb: 3 }}>
                <Alert 
                  severity={result.success ? 'success' : 'error'}
                  sx={{ mb: 2 }}
                  icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {result.message}
                  </Typography>
                </Alert>

                {result.processed > 0 && (
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="primary">
                            {result.processed}
                          </Typography>
                          <Typography variant="caption">Processed</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="success.main">
                            {result.updated}
                          </Typography>
                          <Typography variant="caption">Updated</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={4}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="error.main">
                            {result.failed}
                          </Typography>
                          <Typography variant="caption">Failed</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}

                {result.failed_items && result.failed_items.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom color="error">
                      Failed Items:
                    </Typography>
                    <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {result.failed_items.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <ErrorIcon color="error" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.device_id}
                            secondary={item.error}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </Box>
            )}

            {/* Devices List */}
            {!result && devicesNeedingInfo.length > 0 && (
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="warning" fontSize="small" />
                  Devices with Missing Location Information
                </Typography>
                
                <List 
                  dense 
                  sx={{ 
                    maxHeight: 300, 
                    overflow: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper'
                  }}
                >
                  {devicesNeedingInfo.slice(0, 20).map((device, index) => (
                    <React.Fragment key={device.device_id}>
                      <ListItem>
                        <ListItemIcon>
                          <LocationIcon color="primary" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={device.device_name}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                              <Chip 
                                size="small" 
                                label={`${device.latitude?.toFixed(6)}, ${device.longitude?.toFixed(6)}`}
                                variant="outlined"
                              />
                              {!device.city && <Chip size="small" label="No City" color="warning" />}
                              {!device.province && <Chip size="small" label="No Province" color="warning" />}
                              {!device.address && <Chip size="small" label="No Address" color="warning" />}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < Math.min(devicesNeedingInfo.length, 20) - 1 && <Divider variant="inset" />}
                    </React.Fragment>
                  ))}
                  {devicesNeedingInfo.length > 20 && (
                    <ListItem>
                      <ListItemText
                        secondary={
                          <Typography variant="caption" color="textSecondary" fontStyle="italic">
                            ... and {devicesNeedingInfo.length - 20} more devices
                          </Typography>
                        }
                      />
                    </ListItem>
                  )}
                </List>
              </Box>
            )}

            {devicesNeedingInfo.length === 0 && !loadingDevices && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  All devices with coordinates already have complete location information.
                </Typography>
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={generating}
        >
          {result ? 'Close' : 'Cancel'}
        </Button>
        
        {!result && devicesNeedingInfo.length > 0 && (
          <Button
            onClick={handleGenerateAll}
            variant="contained"
            disabled={generating || loadingDevices}
            startIcon={generating ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            {generating ? 'Generating...' : `Generate for ${devicesNeedingInfo.length} Devices`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LocationGenerationDialog;
