import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { CenterFocusStrong as FitIcon } from '@mui/icons-material';
import {
  default as MapLibreMap,
  Layer,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  type MapRef,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  CircleLayerSpecification,
  HeatmapLayerSpecification,
  LngLatBoundsLike,
} from 'maplibre-gl';

// Device-fleet heatmap. Drop-in replacement for the prior leaflet-based
// CityDeploymentMap. Uses MapLibre GL JS via react-map-gl with CARTO's
// free Voyager basemap — no API key, no per-load billing, just works.
//
// Rendering strategy:
//
//  1. Low zoom (continent-level)     → heatmap layer only
//  2. Mid zoom (city-level)          → heatmap fades, dots fade in
//  3. High zoom (street-level)       → heatmap gone, dots only,
//                                       clicking shows a popup.
//
// MapLibre's heatmap is a GPU-rendered density estimate; it stays
// smooth at 10k+ points, unlike leaflet.heat's canvas path. We weight
// each device by a configurable signal (raw density / status /
// device-type) so the admin can ask different questions of the same
// fleet without re-fetching.

export interface DeviceLocation {
  device_id: string;
  device_name: string;
  device_type: string;
  status: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  province?: string;
  location_name?: string;
}

type Weighting = 'density' | 'active' | 'recent';

interface Props {
  locations: DeviceLocation[];
  height?: number;
}

// CARTO's free Voyager basemap — neutral cartography, looks clean
// against MUI's linen / paper palette and has good Indonesian place
// labels at low zoom. No key, no usage-based billing.
const BASEMAP_STYLE =
  'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// Centroid of Indonesia. Zoom 4.5 frames Java + Sumatra + Sulawesi
// without much pan — most of the deployed fleet lives here today.
const INDONESIA = { longitude: 118, latitude: -2.5, zoom: 4.5 };

const DeviceHeatmap: React.FC<Props> = ({ locations, height = 650 }) => {
  const [weighting, setWeighting] = useState<Weighting>('density');
  const [popup, setPopup] = useState<DeviceLocation | null>(null);
  const mapRef = useRef<MapRef | null>(null);

  // GeoJSON FeatureCollection — recomputed only when the input or
  // weighting changes. Each Feature carries the device fields the
  // popup needs so click handlers don't have to dereference an id.
  const geojson = useMemo(() => {
    const features = locations
      .filter((d) => Number.isFinite(d.latitude) && Number.isFinite(d.longitude))
      .map((d) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [d.longitude, d.latitude],
        },
        properties: {
          ...d,
          // Per-feature heatmap weight. The heatmap-weight expression
          // below reads this. We pre-compute here to keep the style
          // expression simple.
          weight: scoreFor(d, weighting),
        },
      }));
    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [locations, weighting]);

  // Bounding box of every plotted device, plus a single-point fallback.
  // Drives the auto-fit so the map opens framed on where the fleet
  // actually is — not centred on empty ocean.
  const dataBounds = useMemo<LngLatBoundsLike | null>(() => {
    if (geojson.features.length === 0) return null;
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    for (const f of geojson.features) {
      const [lng, lat] = f.geometry.coordinates;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }, [geojson]);

  // Top cities by device count — drives the city quick-jump chips
  // below the toolbar. Empty city strings bucket into "Unknown" so
  // they're not silently lost; the chip just doesn't show.
  const topCities = useMemo(() => {
    const byCity = new Map<
      string,
      { name: string; count: number; lng: number; lat: number }
    >();
    for (const d of locations) {
      const city = (d.city || '').trim();
      if (!city) continue;
      if (!Number.isFinite(d.latitude) || !Number.isFinite(d.longitude)) continue;
      const cur = byCity.get(city);
      if (cur) {
        // Running mean keeps the centroid stable as more devices arrive.
        cur.lng = (cur.lng * cur.count + d.longitude) / (cur.count + 1);
        cur.lat = (cur.lat * cur.count + d.latitude) / (cur.count + 1);
        cur.count += 1;
      } else {
        byCity.set(city, { name: city, count: 1, lng: d.longitude, lat: d.latitude });
      }
    }
    return Array.from(byCity.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [locations]);

  // Frame the map on the data extent. Single-point case (everything
  // at one outlet) flies in to city zoom instead of bounds-fitting
  // (which would clamp to maxZoom and feel arbitrary).
  const fitToData = useCallback(() => {
    const m = mapRef.current;
    if (!m || !dataBounds) return;
    const [[minLng, minLat], [maxLng, maxLat]] = dataBounds as [
      [number, number],
      [number, number],
    ];
    const spanLng = maxLng - minLng;
    const spanLat = maxLat - minLat;
    if (spanLng < 0.01 && spanLat < 0.01) {
      m.flyTo({ center: [minLng, minLat], zoom: 13, duration: 800 });
      return;
    }
    m.fitBounds(dataBounds, { padding: 60, duration: 800, maxZoom: 12 });
  }, [dataBounds]);

  const flyToCity = useCallback((lng: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 800 });
  }, []);

  // Heatmap paint — colour ramp goes from translucent sky-blue (cold)
  // through Glassbox primary blue (warm) to brand orange (hot). The
  // intensity / radius / opacity ramps with zoom so the heatmap fades
  // into dots without a visual snap.
  const heatmapLayer: HeatmapLayerSpecification = useMemo(
    () => ({
      id: 'device-heatmap',
      type: 'heatmap',
      source: 'devices',
      maxzoom: 11,
      paint: {
        'heatmap-weight': ['get', 'weight'],
        // Spread out at low zoom (so a few devices in a province still
        // glow), tighten at high zoom.
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          1,
          11,
          3,
        ],
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(11,166,223,0)',
          0.2,
          'rgba(11,166,223,0.4)',
          0.4,
          'rgba(7,115,163,0.6)',
          0.6,
          'rgba(255,237,213,0.7)',
          0.8,
          'rgba(249,115,22,0.85)',
          1,
          'rgba(194,65,12,0.95)',
        ],
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          12,
          11,
          36,
        ],
        // Fade out the heatmap as we zoom in so the individual dots
        // below dominate the read.
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          0.85,
          11,
          0,
        ],
      },
    }),
    [],
  );

  // Per-device dots — invisible at continent zoom, fade in around
  // city zoom, fully visible at street level. Coloured by status so
  // the admin can spot offline pockets at a glance.
  const dotsLayer: CircleLayerSpecification = useMemo(
    () => ({
      id: 'device-dots',
      type: 'circle',
      source: 'devices',
      minzoom: 7,
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          3,
          14,
          7,
        ],
        'circle-color': [
          'match',
          ['get', 'status'],
          'active',
          '#16A34A', // success
          'inactive',
          '#9CA3AF',
          'maintenance',
          '#F59E0B',
          'offline',
          '#DC2626',
          '#0BA6DF', // default — primary
        ],
        'circle-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          7,
          0,
          9,
          0.85,
        ],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1,
      },
    }),
    [],
  );

  const totalWithCoords = geojson.features.length;
  const totalSkipped = locations.length - totalWithCoords;

  return (
    <Paper elevation={2} sx={{ overflow: 'hidden', position: 'relative' }}>
      {/* Toolbar — at-a-glance stats + weighting toggle. Floats above
          the map so the canvas takes the full height. */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mr: 1 }}>
          Fleet heatmap
        </Typography>
        <Chip
          size="small"
          label={`${totalWithCoords.toLocaleString()} with GPS`}
          color="primary"
          variant="outlined"
        />
        {totalSkipped > 0 && (
          <Chip
            size="small"
            label={`${totalSkipped.toLocaleString()} missing GPS`}
            variant="outlined"
            sx={{ color: 'text.secondary' }}
          />
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Frame the map on the fleet">
          <span>
            <Button
              size="small"
              startIcon={<FitIcon fontSize="small" />}
              onClick={fitToData}
              disabled={!dataBounds}
            >
              Fit to data
            </Button>
          </span>
        </Tooltip>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Weight by</InputLabel>
          <Select
            value={weighting}
            label="Weight by"
            onChange={(e) => setWeighting(e.target.value as Weighting)}
          >
            <MenuItem value="density">Raw density</MenuItem>
            <MenuItem value="active">Active devices</MenuItem>
            <MenuItem value="recent">Recently seen</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* City quick-jump strip. The top-N cities by device count
          appear as clickable chips — way more useful than scrolling
          the whole archipelago to find where the fleet is. */}
      {topCities.length > 0 && (
        <Box
          sx={{
            px: 2,
            py: 1.25,
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', letterSpacing: 1.2, mr: 0.5 }}
          >
            Jump to
          </Typography>
          {topCities.map((c) => (
            <Chip
              key={c.name}
              size="small"
              label={`${c.name} · ${c.count}`}
              onClick={() => flyToCity(c.lng, c.lat)}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      )}

      {totalWithCoords === 0 ? (
        <Box
          sx={{
            height,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.50',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No devices with GPS coordinates yet.
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
            Devices share location at pair time when GPS is granted.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ height }}>
          <MapLibreMap
            ref={mapRef}
            initialViewState={INDONESIA}
            mapStyle={BASEMAP_STYLE}
            interactiveLayerIds={[dotsLayer.id]}
            // Auto-frame on the actual fleet when the map first
            // settles. Without this, opening the page on a fleet
            // entirely in Jakarta would still show the full
            // archipelago with a single hot dot lost in it.
            onLoad={fitToData}
            onClick={(e) => {
              const f = e.features?.[0];
              if (!f) {
                setPopup(null);
                return;
              }
              setPopup(f.properties as unknown as DeviceLocation);
            }}
            cursor={popup ? 'pointer' : undefined}
          >
            <Source id="devices" type="geojson" data={geojson}>
              <Layer {...heatmapLayer} />
              <Layer {...dotsLayer} />
            </Source>

            <NavigationControl position="top-right" />
            <ScaleControl position="bottom-left" />

            {popup && (
              <Popup
                longitude={popup.longitude}
                latitude={popup.latitude}
                anchor="top"
                onClose={() => setPopup(null)}
                closeOnClick={false}
                maxWidth="280px"
              >
                <Stack spacing={0.5} sx={{ p: 0.5, minWidth: 220 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {popup.device_name || popup.device_id}
                  </Typography>
                  {popup.location_name && (
                    <Typography variant="caption">
                      {popup.location_name}
                    </Typography>
                  )}
                  {(popup.city || popup.province) && (
                    <Typography variant="caption" color="text.secondary">
                      {[popup.city, popup.province].filter(Boolean).join(' · ')}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={0.5} sx={{ pt: 0.5 }}>
                    {popup.device_type && (
                      <Chip
                        size="small"
                        label={popup.device_type.toUpperCase()}
                        variant="outlined"
                      />
                    )}
                    {popup.status && (
                      <Chip
                        size="small"
                        label={popup.status.toUpperCase()}
                        color={
                          popup.status === 'active'
                            ? 'success'
                            : popup.status === 'offline'
                              ? 'error'
                              : 'default'
                        }
                      />
                    )}
                  </Stack>
                </Stack>
              </Popup>
            )}
          </MapLibreMap>
        </Box>
      )}
    </Paper>
  );
};

// scoreFor — per-device weight feeding heatmap-density. The weighting
// dropdown drives this; ordinarily you want raw density (1 per
// device) to see "where the fleet is." Switching to 'active' shows
// only operational coverage; 'recent' biases toward devices that
// beat home recently.
function scoreFor(d: DeviceLocation, mode: Weighting): number {
  switch (mode) {
    case 'density':
      return 1;
    case 'active':
      return d.status === 'active' ? 1 : 0.1;
    case 'recent':
      // The current location stats endpoint doesn't include last_seen.
      // Until it does, recency mirrors active+inactive split.
      return d.status === 'active' ? 1 : d.status === 'inactive' ? 0.6 : 0.2;
  }
}

export default DeviceHeatmap;
