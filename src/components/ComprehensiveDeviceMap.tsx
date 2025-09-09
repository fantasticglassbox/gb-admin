import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, FeatureGroup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Grid,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Divider,
  Button,
  ButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Tv as TvIcon,
  Tablet as TabletIcon,
  Phone as PhoneIcon,
  Computer as KioskIcon,
  DeviceUnknown as UnknownIcon,
  LocationOn as LocationIcon,
  Layers as LayersIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
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

interface LocationStats {
  total_devices: number;
  active_devices: number;
  registered_only: number;
  by_province: Record<string, number>;
  by_city: Record<string, number>;
  by_device_type: Record<string, number>;
  device_locations: DeviceLocation[];
}

interface ZoneData {
  name: string;
  devices: DeviceLocation[];
  center: [number, number];
  bounds: [[number, number], [number, number]];
  color: string;
}

interface ComprehensiveDeviceMapProps {
  locations: DeviceLocation[];
  stats?: LocationStats;
  height?: number;
}

const ComprehensiveDeviceMap: React.FC<ComprehensiveDeviceMapProps> = ({ 
  locations, 
  stats, 
  height = 600 
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2088, 106.8456]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [showClustering, setShowClustering] = useState(true);
  const [showZoneCircles, setShowZoneCircles] = useState(true);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [mapView, setMapView] = useState<'standard' | 'satellite' | 'terrain'>('standard');

  useEffect(() => {
    if (locations.length > 0) {
      const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
      const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [locations]);

  // Process zones data
  const zonesData = useMemo(() => {
    const zones: Record<string, ZoneData> = {};
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    
    locations.forEach((location) => {
      const zoneName = location.zone || location.district || location.city || 'Unknown Zone';
      
      if (!zones[zoneName]) {
        zones[zoneName] = {
          name: zoneName,
          devices: [],
          center: [location.latitude, location.longitude],
          bounds: [[location.latitude, location.longitude], [location.latitude, location.longitude]],
          color: colors[Object.keys(zones).length % colors.length],
        };
      }
      
      zones[zoneName].devices.push(location);
      
      // Update bounds
      const [minLat, minLng] = zones[zoneName].bounds[0];
      const [maxLat, maxLng] = zones[zoneName].bounds[1];
      zones[zoneName].bounds = [
        [Math.min(minLat, location.latitude), Math.min(minLng, location.longitude)],
        [Math.max(maxLat, location.latitude), Math.max(maxLng, location.longitude)]
      ];
      
      // Update center
      const avgLat = zones[zoneName].devices.reduce((sum, dev) => sum + dev.latitude, 0) / zones[zoneName].devices.length;
      const avgLng = zones[zoneName].devices.reduce((sum, dev) => sum + dev.longitude, 0) / zones[zoneName].devices.length;
      zones[zoneName].center = [avgLat, avgLng];
    });
    
    return Object.values(zones);
  }, [locations]);

  // Filter locations based on selected filters
  const filteredLocations = useMemo(() => {
    return locations.filter(location => {
      const deviceTypeMatch = selectedDeviceType === 'all' || location.device_type === selectedDeviceType;
      const statusMatch = selectedStatus === 'all' || location.status === selectedStatus;
      const zoneMatch = selectedZone === 'all' || 
        (location.zone || location.district || location.city || 'Unknown Zone') === selectedZone;
      
      return deviceTypeMatch && statusMatch && zoneMatch;
    });
  }, [locations, selectedDeviceType, selectedStatus, selectedZone]);

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'TV':
        return <TvIcon fontSize="small" />;
      case 'TABLET':
        return <TabletIcon fontSize="small" />;
      case 'PHONE':
        return <PhoneIcon fontSize="small" />;
      case 'KIOSK':
        return <KioskIcon fontSize="small" />;
      default:
        return <UnknownIcon fontSize="small" />;
    }
  };

  const getDeviceTypeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'TV':
        return '#1976d2';
      case 'TABLET':
        return '#388e3c';
      case 'PHONE':
        return '#f57c00';
      case 'KIOSK':
        return '#7b1fa2';
      default:
        return '#616161';
    }
  };

  const createCustomIcon = (deviceType: string, status: string) => {
    const color = status === 'ACTIVE' ? getDeviceTypeColor(deviceType) : '#9e9e9e';
    const html = `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
      ">
        ${deviceType.charAt(0)}
      </div>
    `;
    
    return L.divIcon({
      html,
      className: 'custom-div-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  };

  const createClusterIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    const size = count < 10 ? 'small' : count < 100 ? 'medium' : 'large';
    const sizeMap = { small: 40, medium: 50, large: 60 };
    
    return L.divIcon({
      html: `<div style="
        background: linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%);
        width: ${sizeMap[size]}px;
        height: ${sizeMap[size]}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px'};
        font-weight: bold;
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: [sizeMap[size], sizeMap[size]],
      iconAnchor: [sizeMap[size] / 2, sizeMap[size] / 2],
    });
  };

  const getTileLayerUrl = () => {
    switch (mapView) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'terrain':
        return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileLayerAttribution = () => {
    switch (mapView) {
      case 'satellite':
        return '&copy; <a href="https://www.esri.com/">Esri</a>';
      case 'terrain':
        return '&copy; <a href="https://opentopomap.org/">OpenTopoMap</a>';
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  const resetFilters = () => {
    setSelectedDeviceType('all');
    setSelectedStatus('all');
    setSelectedZone('all');
  };

  return (
    <Box>
      {/* Map Controls */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Device Type</InputLabel>
                <Select
                  value={selectedDeviceType}
                  label="Device Type"
                  onChange={(e) => setSelectedDeviceType(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="TV">📺 TV</MenuItem>
                  <MenuItem value="TABLET">📱 Tablet</MenuItem>
                  <MenuItem value="PHONE">📞 Phone</MenuItem>
                  <MenuItem value="KIOSK">🖥️ Kiosk</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('status')}</InputLabel>
                <Select
                  value={selectedStatus}
                  label={t('status')}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="ACTIVE">✅ Active</MenuItem>
                  <MenuItem value="REGISTERED">⏳ Registered</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>{t('zone')}</InputLabel>
                <Select
                  value={selectedZone}
                  label={t('zone')}
                  onChange={(e) => setSelectedZone(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  {zonesData.map((zone) => (
                    <MenuItem key={zone.name} value={zone.name}>
                      📍 {zone.name} ({zone.devices.length})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <ButtonGroup size="small" fullWidth>
                <Button
                  variant={mapView === 'standard' ? 'contained' : 'outlined'}
                  onClick={() => setMapView('standard')}
                  size="small"
                >
                  Map
                </Button>
                <Button
                  variant={mapView === 'satellite' ? 'contained' : 'outlined'}
                  onClick={() => setMapView('satellite')}
                  size="small"
                >
                  Satellite
                </Button>
                <Button
                  variant={mapView === 'terrain' ? 'contained' : 'outlined'}
                  onClick={() => setMapView('terrain')}
                  size="small"
                >
                  Terrain
                </Button>
              </ButtonGroup>
            </Grid>

            <Grid item xs={12} md={2}>
              <Box display="flex" flexDirection="column" gap={0.5}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showClustering}
                      onChange={(e) => setShowClustering(e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption">Clustering</Typography>}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showZoneCircles}
                      onChange={(e) => setShowZoneCircles(e.target.checked)}
                    />
                  }
                  label={<Typography variant="caption">Zone Areas</Typography>}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                size="small"
                onClick={resetFilters}
                fullWidth
                startIcon={<FilterIcon />}
              >
                Reset Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Enhanced Map */}
        <Grid item xs={12} lg={9}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  🗺️ {t('comprehensiveDeviceMap')} 
                  <Chip 
                    size="small" 
                    label={`${filteredLocations.length}/${locations.length} ${t('devices')}`}
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                <Box display="flex" gap={1}>
                  {zonesData.length > 0 && (
                    <Chip
                      size="small"
                      label={`${zonesData.length} ${t('zones')}`}
                      color="secondary"
                    />
                  )}
                </Box>
              </Box>
              
              <Box sx={{ height, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                  zoomControl={true}
                >
                  <TileLayer
                    url={getTileLayerUrl()}
                    attribution={getTileLayerAttribution()}
                  />
                  
                  {/* Zone Circles */}
                  {showZoneCircles && zonesData.map((zone) => (
                    <Circle
                      key={`zone-${zone.name}`}
                      center={zone.center}
                      radius={Math.max(2000, zone.devices.length * 500)} // Dynamic radius based on device count
                      fillColor={zone.color}
                      fillOpacity={0.1}
                      color={zone.color}
                      weight={2}
                      opacity={0.6}
                    >
                      <Popup>
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>
                            📍 {zone.name}
                          </Typography>
                          <Typography variant="body2">
                            <strong>{t('devices')}:</strong> {zone.devices.length}
                          </Typography>
                          <Typography variant="body2">
                            <strong>{t('active')}:</strong> {zone.devices.filter(d => d.status === 'ACTIVE').length}
                          </Typography>
                          <Typography variant="body2">
                            <strong>{t('types')}:</strong> {Array.from(new Set(zone.devices.map(d => d.device_type))).join(', ')}
                          </Typography>
                        </Box>
                      </Popup>
                    </Circle>
                  ))}
                  
                  {/* Device Markers */}
                  {showClustering ? (
                    <MarkerClusterGroup
                      iconCreateFunction={createClusterIcon}
                      showCoverageOnHover={true}
                      zoomToBoundsOnClick={true}
                      spiderfyOnMaxZoom={true}
                      removeOutsideVisibleBounds={true}
                      animate={true}
                    >
                      {filteredLocations.map((location) => (
                        <Marker
                          key={location.device_id}
                          position={[location.latitude, location.longitude] as L.LatLngExpression}
                          icon={createCustomIcon(location.device_type, location.status)}
                        >
                          <Popup>
                            <Box sx={{ minWidth: 280 }}>
                              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {getDeviceIcon(location.device_type)} {location.device_name}
                              </Typography>
                              
                              <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  size="small"
                                  label={location.status}
                                  color={location.status === 'ACTIVE' ? 'success' : 'warning'}
                                />
                                <Chip
                                  size="small"
                                  label={location.device_type}
                                  sx={{ 
                                    backgroundColor: getDeviceTypeColor(location.device_type),
                                    color: 'white'
                                  }}
                                />
                              </Box>

                              {location.merchant_name && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>🏢 {t('merchant')}:</strong> {location.merchant_name}
                                </Typography>
                              )}

                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>📍 {t('zone')}:</strong> {location.zone || location.district || location.city || 'N/A'}
                              </Typography>

                              {location.address && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>🏠 {t('address')}:</strong> {location.address}
                                </Typography>
                              )}

                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>🏙️ {t('location')}:</strong> {location.city}
                                {location.district && `, ${location.district}`}
                                {location.province && `, ${location.province}`}
                              </Typography>

                              {location.location_name && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>🏷️ {t('locationName')}:</strong> {location.location_name}
                                </Typography>
                              )}

                              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                                📐 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                              </Typography>
                            </Box>
                          </Popup>
                        </Marker>
                      ))}
                    </MarkerClusterGroup>
                  ) : (
                    filteredLocations.map((location) => (
                      <Marker
                        key={location.device_id}
                        position={[location.latitude, location.longitude] as L.LatLngExpression}
                        icon={createCustomIcon(location.device_type, location.status)}
                      >
                        <Popup>
                          <Box sx={{ minWidth: 280 }}>
                            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getDeviceIcon(location.device_type)} {location.device_name}
                            </Typography>
                            
                            <Box sx={{ mb: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                size="small"
                                label={location.status}
                                color={location.status === 'ACTIVE' ? 'success' : 'warning'}
                              />
                              <Chip
                                size="small"
                                label={location.device_type}
                                sx={{ 
                                  backgroundColor: getDeviceTypeColor(location.device_type),
                                  color: 'white'
                                }}
                              />
                            </Box>

                            {location.merchant_name && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>🏢 {t('merchant')}:</strong> {location.merchant_name}
                              </Typography>
                            )}

                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>📍 {t('zone')}:</strong> {location.zone || location.district || location.city || 'N/A'}
                            </Typography>

                            {location.address && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>🏠 {t('address')}:</strong> {location.address}
                              </Typography>
                            )}

                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>🏙️ {t('location')}:</strong> {location.city}
                              {location.district && `, ${location.district}`}
                              {location.province && `, ${location.province}`}
                            </Typography>

                            {location.location_name && (
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>🏷️ {t('locationName')}:</strong> {location.location_name}
                              </Typography>
                            )}

                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                              📐 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                            </Typography>
                          </Box>
                        </Popup>
                      </Marker>
                    ))
                  )}
                </MapContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Zone Analytics Panel */}
        <Grid item xs={12} lg={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Zone Distribution */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="primary" />
                  {t('zoneDistribution')}
                </Typography>
                <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                  {zonesData
                    .sort((a, b) => b.devices.length - a.devices.length)
                    .map((zone, index) => (
                      <Box key={zone.name} sx={{ display: 'flex', alignItems: 'center', mb: 1, p: 1, borderRadius: 1, '&:hover': { backgroundColor: 'action.hover' } }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: zone.color,
                            mr: 1,
                            flexShrink: 0
                          }}
                        />
                        <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }} noWrap>
                          {zone.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={zone.devices.length}
                          sx={{ 
                            minWidth: 40,
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: zone.color,
                            color: 'white'
                          }}
                        />
                      </Box>
                    ))}
                </Box>
              </CardContent>
            </Card>

            {/* Filter Summary */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon color="primary" />
                  {t('filterSummary')}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>{t('showing')}:</strong> {filteredLocations.length} / {locations.length} {t('devices')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('activeInView')}:</strong> {filteredLocations.filter(l => l.status === 'ACTIVE').length}
                  </Typography>
                  <Typography variant="body2">
                    <strong>{t('zonesInView')}:</strong> {Array.from(new Set(filteredLocations.map(l => l.zone || l.district || l.city || 'Unknown'))).length}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Device Type Distribution in Current View */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('currentViewTypes')}
                </Typography>
                {Object.entries(
                  filteredLocations.reduce((acc, location) => {
                    acc[location.device_type] = (acc[location.device_type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <Box key={type} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getDeviceIcon(type)}
                    <Typography variant="body2" sx={{ ml: 1, flex: 1 }}>
                      {type}
                    </Typography>
                    <Chip
                      size="small"
                      label={count}
                      sx={{ 
                        backgroundColor: getDeviceTypeColor(type),
                        color: 'white',
                        minWidth: 40
                      }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ComprehensiveDeviceMap;
