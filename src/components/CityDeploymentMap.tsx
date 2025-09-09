import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from 'react-leaflet';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Grid,
  useTheme,
  Avatar,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  LinearProgress,
  Stack,
  Badge,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  LocationCity as CityIcon,
  Devices as DevicesIcon,
  CheckCircle as ActiveIcon,
  PendingActions as PendingIcon,
  Tv as TvIcon,
  Tablet as TabletIcon,
  Phone as PhoneIcon,
  Computer as KioskIcon,
  DeviceUnknown as UnknownIcon,
  TrendingUp as TrendingIcon,
  Visibility as ViewIcon,
  ZoomIn as ZoomIcon,
  LayersOutlined as LayersIconOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface DeviceLocation {
  device_id: string;
  device_name: string;
  device_type: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  district: string;
  province: string;
  country: string;
  location_name: string;
  zone: string;
  merchant_name?: string;
}

interface CityDeployment {
  city: string;
  province: string;
  country: string;
  totalDevices: number;
  activeDevices: number;
  registeredDevices: number;
  center: [number, number];
  devices: DeviceLocation[];
  deviceTypes: Record<string, number>;
  coverage: number; // Percentage of active devices
  merchants: string[];
  zones: string[];
}

interface LocationStats {
  total_devices: number;
  active_devices: number;
  registered_only: number;
  by_province: Record<string, number>;
  by_city: Record<string, number>;
  by_device_type: Record<string, number>;
  device_locations: DeviceLocation[];
}

interface CityDeploymentMapProps {
  locations: DeviceLocation[];
  stats?: LocationStats;
  height?: number;
}

const CityDeploymentMap: React.FC<CityDeploymentMapProps> = ({ 
  locations, 
  stats, 
  height = 600 
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2088, 106.8456]);
  const [showHeatCircles, setShowHeatCircles] = useState(true);
  const [selectedCity, setSelectedCity] = useState<CityDeployment | null>(null);
  const [mapZoom, setMapZoom] = useState(6);

  // Process city deployments
  const cityDeployments = useMemo(() => {
    const cities: Record<string, CityDeployment> = {};
    
    locations.forEach((location) => {
      const cityKey = `${location.city}-${location.province}`;
      
      if (!cities[cityKey]) {
        cities[cityKey] = {
          city: location.city,
          province: location.province,
          country: location.country,
          totalDevices: 0,
          activeDevices: 0,
          registeredDevices: 0,
          center: [location.latitude, location.longitude],
          devices: [],
          deviceTypes: {},
          coverage: 0,
          merchants: [],
          zones: [],
        };
      }
      
      const cityData = cities[cityKey];
      cityData.devices.push(location);
      cityData.totalDevices++;
      
      if (location.status === 'ACTIVE') {
        cityData.activeDevices++;
      } else {
        cityData.registeredDevices++;
      }
      
      // Update device types
      cityData.deviceTypes[location.device_type] = (cityData.deviceTypes[location.device_type] || 0) + 1;
      
      // Update merchants and zones
      if (location.merchant_name && !cityData.merchants.includes(location.merchant_name)) {
        cityData.merchants.push(location.merchant_name);
      }
      
      const zone = location.zone || location.district || 'Unknown Zone';
      if (!cityData.zones.includes(zone)) {
        cityData.zones.push(zone);
      }
      
      // Update center (average of all devices in city)
      const avgLat = cityData.devices.reduce((sum, dev) => sum + dev.latitude, 0) / cityData.devices.length;
      const avgLng = cityData.devices.reduce((sum, dev) => sum + dev.longitude, 0) / cityData.devices.length;
      cityData.center = [avgLat, avgLng];
      
      // Calculate coverage
      cityData.coverage = (cityData.activeDevices / cityData.totalDevices) * 100;
    });
    
    return Object.values(cities).filter(city => city.totalDevices > 0);
  }, [locations]);

  useEffect(() => {
    if (cityDeployments.length > 0) {
      // Set center to the city with most devices
      const topCity = cityDeployments.reduce((prev, current) => 
        prev.totalDevices > current.totalDevices ? prev : current
      );
      setMapCenter(topCity.center);
    }
  }, [cityDeployments]);

  const getCityIcon = (cityData: CityDeployment) => {
    const size = cityData.totalDevices < 5 ? 'small' : cityData.totalDevices < 15 ? 'medium' : 'large';
    const sizeMap = { small: 40, medium: 60, large: 80 };
    const color = cityData.coverage > 80 ? '#4caf50' : cityData.coverage > 50 ? '#ff9800' : '#f44336';
    
    return L.divIcon({
      html: `
        <div style="
          background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
          width: ${sizeMap[size]}px;
          height: ${sizeMap[size]}px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          position: relative;
        ">
          <div style="font-size: ${size === 'small' ? '10px' : size === 'medium' ? '12px' : '14px'}; line-height: 1;">
            ${cityData.totalDevices}
          </div>
          <div style="font-size: ${size === 'small' ? '8px' : size === 'medium' ? '9px' : '10px'}; line-height: 1; opacity: 0.9;">
            ${cityData.city.length > 8 ? cityData.city.substring(0, 6) + '..' : cityData.city}
          </div>
        </div>
      `,
      className: 'city-deployment-icon',
      iconSize: [sizeMap[size], sizeMap[size]],
      iconAnchor: [sizeMap[size] / 2, sizeMap[size] / 2],
      popupAnchor: [0, -sizeMap[size] / 2],
    });
  };

  const getDeviceTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'TV': return <TvIcon fontSize="small" sx={{ color: '#1976d2' }} />;
      case 'TABLET': return <TabletIcon fontSize="small" sx={{ color: '#388e3c' }} />;
      case 'PHONE': return <PhoneIcon fontSize="small" sx={{ color: '#f57c00' }} />;
      case 'KIOSK': return <KioskIcon fontSize="small" sx={{ color: '#7b1fa2' }} />;
      default: return <UnknownIcon fontSize="small" sx={{ color: '#616161' }} />;
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return theme.palette.success.main;
    if (coverage >= 50) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const handleCityClick = (cityData: CityDeployment) => {
    setSelectedCity(cityData);
  };

  // Sort cities by total devices for the sidebar
  const sortedCities = useMemo(() => {
    return [...cityDeployments].sort((a, b) => b.totalDevices - a.totalDevices);
  }, [cityDeployments]);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Enhanced Map */}
        <Grid item xs={12} lg={8}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  🏙️ City Deployment Overview
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showHeatCircles}
                        onChange={(e) => setShowHeatCircles(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="caption">Coverage Areas</Typography>}
                  />
                  <Chip
                    icon={<CityIcon />}
                    label={`${cityDeployments.length} Cities`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              </Box>
              
              <Box sx={{ height, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                  zoomControl={true}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  
                  {/* Coverage Circles */}
                  {showHeatCircles && cityDeployments.map((cityData) => (
                    <Circle
                      key={`coverage-${cityData.city}-${cityData.province}`}
                      center={cityData.center}
                      radius={Math.max(5000, cityData.totalDevices * 2000)} // Dynamic radius
                      fillColor={getCoverageColor(cityData.coverage)}
                      fillOpacity={0.1}
                      color={getCoverageColor(cityData.coverage)}
                      weight={2}
                      opacity={0.4}
                    />
                  ))}
                  
                  {/* City Markers */}
                  {cityDeployments.map((cityData) => (
                    <Marker
                      key={`city-${cityData.city}-${cityData.province}`}
                      position={cityData.center}
                      icon={getCityIcon(cityData)}
                      eventHandlers={{
                        click: () => handleCityClick(cityData),
                      }}
                    >
                      <Popup maxWidth={400}>
                        <Box sx={{ minWidth: 350, p: 1 }}>
                          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CityIcon color="primary" />
                            {cityData.city}, {cityData.province}
                          </Typography>
                          
                          <Grid container spacing={2} sx={{ mb: 2 }}>
                            <Grid item xs={4}>
                              <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', backgroundColor: theme.palette.primary.light, color: 'white' }}>
                                <Typography variant="h5" fontWeight="bold">{cityData.totalDevices}</Typography>
                                <Typography variant="caption">Total Devices</Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={4}>
                              <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', backgroundColor: theme.palette.success.light, color: 'white' }}>
                                <Typography variant="h5" fontWeight="bold">{cityData.activeDevices}</Typography>
                                <Typography variant="caption">Active</Typography>
                              </Paper>
                            </Grid>
                            <Grid item xs={4}>
                              <Paper elevation={1} sx={{ p: 1.5, textAlign: 'center', backgroundColor: theme.palette.warning.light, color: 'white' }}>
                                <Typography variant="h5" fontWeight="bold">{cityData.registeredDevices}</Typography>
                                <Typography variant="caption">Pending</Typography>
                              </Paper>
                            </Grid>
                          </Grid>

                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Coverage Rate</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={cityData.coverage} 
                                sx={{ 
                                  flexGrow: 1, 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: theme.palette.grey[200],
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: getCoverageColor(cityData.coverage),
                                  }
                                }} 
                              />
                              <Typography variant="body2" fontWeight="bold" color={getCoverageColor(cityData.coverage)}>
                                {cityData.coverage.toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>

                          <Typography variant="subtitle2" gutterBottom>Device Types</Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                            {Object.entries(cityData.deviceTypes).map(([type, count]) => (
                              <Chip
                                key={type}
                                icon={getDeviceTypeIcon(type)}
                                label={`${type}: ${count}`}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>

                          <Typography variant="subtitle2" gutterBottom>Deployment Info</Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>📍 Zones:</strong> {cityData.zones.length} ({cityData.zones.slice(0, 2).join(', ')}{cityData.zones.length > 2 ? '...' : ''})
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>🏢 Merchants:</strong> {cityData.merchants.length}
                          </Typography>
                          <Typography variant="body2">
                            <strong>🌍 Location:</strong> {cityData.country}
                          </Typography>
                        </Box>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* City Analytics Panel */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Deployment Summary */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingIcon color="primary" />
                  Deployment Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {cityDeployments.length}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Active Cities
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {cityDeployments.reduce((sum, city) => sum + city.totalDevices, 0)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Total Devices
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Overall Coverage:</strong>
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={
                      (cityDeployments.reduce((sum, city) => sum + city.activeDevices, 0) / 
                       cityDeployments.reduce((sum, city) => sum + city.totalDevices, 0)) * 100
                    }
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: theme.palette.grey[200],
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.success.main,
                      }
                    }} 
                  />
                  <Typography variant="caption" color="textSecondary">
                    {((cityDeployments.reduce((sum, city) => sum + city.activeDevices, 0) / 
                       cityDeployments.reduce((sum, city) => sum + city.totalDevices, 0)) * 100).toFixed(1)}% devices active
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Top Cities */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CityIcon color="primary" />
                  Top Cities by Deployment
                </Typography>
                <List dense sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {sortedCities.slice(0, 8).map((city, index) => (
                    <React.Fragment key={`${city.city}-${city.province}`}>
                      <ListItem
                        sx={{ 
                          px: 0,
                          cursor: 'pointer',
                          borderRadius: 1,
                          '&:hover': { backgroundColor: 'action.hover' }
                        }}
                        onClick={() => handleCityClick(city)}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              backgroundColor: getCoverageColor(city.coverage),
                              fontSize: '0.8rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {index + 1}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight="medium">
                              {city.city}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                size="small"
                                label={`${city.totalDevices} devices`}
                                sx={{ 
                                  height: 18,
                                  fontSize: '0.7rem',
                                  backgroundColor: theme.palette.primary.light,
                                  color: 'white'
                                }}
                              />
                              <Chip
                                size="small"
                                label={`${city.coverage.toFixed(0)}%`}
                                sx={{ 
                                  height: 18,
                                  fontSize: '0.7rem',
                                  backgroundColor: getCoverageColor(city.coverage),
                                  color: 'white'
                                }}
                              />
                            </Box>
                          }
                        />
                        <IconButton size="small" color="primary">
                          <ZoomIcon fontSize="small" />
                        </IconButton>
                      </ListItem>
                      {index < sortedCities.slice(0, 8).length - 1 && <Divider variant="inset" />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* Coverage Legend */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LayersIconOutlined color="primary" />
                  Coverage Legend
                </Typography>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: theme.palette.success.main }} />
                    <Typography variant="body2">High Coverage (80%+)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: theme.palette.warning.main }} />
                    <Typography variant="body2">Medium Coverage (50-79%)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: theme.palette.error.main }} />
                    <Typography variant="body2">Low Coverage (&lt;50%)</Typography>
                  </Box>
                </Stack>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>Marker Size</Typography>
                <Stack spacing={0.5}>
                  <Typography variant="caption">🔴 Small: 1-4 devices</Typography>
                  <Typography variant="caption">🟠 Medium: 5-14 devices</Typography>
                  <Typography variant="caption">🟢 Large: 15+ devices</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CityDeploymentMap;
