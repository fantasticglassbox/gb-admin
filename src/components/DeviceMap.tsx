import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  Grid,
  useTheme
} from '@mui/material';
import {
  Tv as TvIcon,
  Tablet as TabletIcon,
  Phone as PhoneIcon,
  Computer as KioskIcon,
  DeviceUnknown as UnknownIcon,
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

interface DeviceMapProps {
  locations: DeviceLocation[];
  stats?: LocationStats;
  height?: number;
}

const DeviceMap: React.FC<DeviceMapProps> = ({ locations, stats, height = 500 }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-6.2088, 106.8456]); // Jakarta center

  useEffect(() => {
    // Calculate map center based on device locations
    if (locations.length > 0) {
      const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
      const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [locations]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return theme.palette.success.main;
      case 'REGISTERED':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getDeviceTypeColor = (deviceType: string) => {
    switch (deviceType) {
      case 'TV':
        return '#1976d2'; // Blue
      case 'TABLET':
        return '#388e3c'; // Green
      case 'PHONE':
        return '#f57c00'; // Orange
      case 'KIOSK':
        return '#7b1fa2'; // Purple
      default:
        return '#616161'; // Grey
    }
  };

  // Create custom marker icons for different device types
  const createCustomIcon = (deviceType: string, status: string) => {
    const color = status === 'ACTIVE' ? getDeviceTypeColor(deviceType) : '#9e9e9e';
    const html = `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
      ">
        ${deviceType.charAt(0)}
      </div>
    `;
    
    return L.divIcon({
      html,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Map */}
        <Grid item xs={12} lg={8}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('deviceLocations')} ({locations.length} {t('devices')})
              </Typography>
              <Box sx={{ height, borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer
                  center={mapCenter}
                  zoom={6}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {locations.map((location) => (
                    <Marker
                      key={location.device_id}
                      position={[location.latitude, location.longitude] as L.LatLngExpression}
                    >
                      <Popup>
                        <Box sx={{ minWidth: 250 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {getDeviceIcon(location.device_type)} {location.device_name}
                          </Typography>
                          
                          <Box sx={{ mb: 1 }}>
                            <Chip
                              size="small"
                              label={location.status}
                              color={location.status === 'ACTIVE' ? 'success' : 'warning'}
                              sx={{ mr: 1 }}
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
                              <strong>{t('merchant')}:</strong> {location.merchant_name}
                            </Typography>
                          )}

                          {location.address && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>{t('address')}:</strong> {location.address}
                            </Typography>
                          )}

                          {location.city && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>{t('city')}:</strong> {location.city}
                              {location.district && `, ${location.district}`}
                            </Typography>
                          )}

                          {location.province && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>{t('province')}:</strong> {location.province}
                            </Typography>
                          )}

                          {location.location_name && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>{t('locationName')}:</strong> {location.location_name}
                            </Typography>
                          )}

                          {location.zone && (
                            <Typography variant="body2">
                              <strong>{t('zone')}:</strong> {location.zone}
                            </Typography>
                          )}

                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
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

        {/* Statistics Panel */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Device Type Distribution */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('deviceTypes')}
                </Typography>
                {stats && Object.entries(stats.by_device_type).map(([type, count]) => (
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

            {/* Location Distribution */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('topProvinces')}
                </Typography>
                {stats && Object.entries(stats.by_province)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([province, count]) => (
                    <Box key={province} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                        {province || 'Unknown'}
                      </Typography>
                      <Chip size="small" label={count} color="primary" />
                    </Box>
                  ))}
              </CardContent>
            </Card>

            {/* Top Cities */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t('topCities')}
                </Typography>
                {stats && Object.entries(stats.by_city)
                  .sort(([,a], [,b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([city, count]) => (
                    <Box key={city} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                        {city || 'Unknown'}
                      </Typography>
                      <Chip size="small" label={count} color="secondary" />
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

export default DeviceMap;
