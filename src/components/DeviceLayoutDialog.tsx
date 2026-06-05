import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Radio,
  Stack,
  Typography,
} from '@mui/material';
import { apiService } from '../services/api';
import { DeviceResponse, Layout, LayoutZone } from '../types';

interface DeviceLayoutDialogProps {
  open: boolean;
  device: DeviceResponse | null;
  onClose: () => void;
  onSaved?: (layoutId: string) => void;
}

/**
 * Admin "Set layout" dialog. Shows every ACTIVE layout as a card with
 * a small zone preview and a Radio for selection. Selecting a card +
 * Save calls PUT /v2/devices/:id/layout. Includes a "Fullscreen
 * (default)" pseudo-option that clears the override.
 */
const DeviceLayoutDialog: React.FC<DeviceLayoutDialogProps> = ({
  open,
  device,
  onClose,
  onSaved,
}) => {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    apiService
      .listLayouts()
      .then((list) => {
        setLayouts(list);
        // Pre-select the device's current layout, or empty for fullscreen.
        setSelected(device?.layout_id || '');
      })
      .catch(() => setLayouts([]))
      .finally(() => setLoading(false));
  }, [open, device]);

  const submit = async () => {
    if (!device) return;
    setSaving(true);
    setError(null);
    try {
      await apiService.setDeviceLayout(device.id, selected);
      onSaved?.(selected);
      onClose();
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.message || 'Failed to set layout',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Set device layout</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {device
            ? `Choose how the playback surface is split for ${(device as any).device_name || device.name}. The change reaches the device on its next heartbeat.`
            : ''}
        </Typography>

        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={1.5}>
            <LayoutOptionCard
              slug="fullscreen-default"
              displayName="Fullscreen (clear override)"
              description="Single main zone covering the whole display. Same as the legacy behavior — best for a single TV showing one video at a time."
              zones={[{ slug: 'main', x_pct: 0, y_pct: 0, w_pct: 100, h_pct: 100, accepts: ['video', 'image'] }]}
              selected={selected === ''}
              onSelect={() => setSelected('')}
            />
            {layouts.map((l) => (
              <LayoutOptionCard
                key={l.id}
                slug={l.slug}
                displayName={l.display_name}
                description={l.description || ''}
                zones={normaliseZones(l.zones)}
                selected={selected === l.id}
                onSelect={() => setSelected(l.id)}
              />
            ))}
          </Stack>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Save layout
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ---- Helpers ----

// The backend stores Layout.zones as a JSON-encoded string in the
// MySQL column and gin emits it verbatim, so the field arrives here
// as a string instead of an array. Parse defensively so the preview
// renders regardless of which side fixes the contract.
const normaliseZones = (raw: unknown): LayoutZone[] => {
  if (Array.isArray(raw)) return raw as LayoutZone[];
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as LayoutZone[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ---- Layout option card with mini preview ----

interface LayoutOptionCardProps {
  slug: string;
  displayName: string;
  description: string;
  zones: LayoutZone[];
  selected: boolean;
  onSelect: () => void;
}

const LayoutOptionCard: React.FC<LayoutOptionCardProps> = ({
  slug,
  displayName,
  description,
  zones,
  selected,
  onSelect,
}) => {
  return (
    <Box
      onClick={onSelect}
      sx={{
        display: 'flex',
        gap: 2,
        alignItems: 'center',
        p: 2,
        border: '1.5px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        backgroundColor: selected ? 'primary.50' : 'background.paper',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 160ms',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <Radio checked={selected} onChange={onSelect} size="small" />
      <LayoutMiniPreview zones={zones} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 0.5 }}>
          <Typography variant="body1" fontWeight={700}>
            {displayName}
          </Typography>
          <Chip
            label={slug}
            size="small"
            sx={{ fontFamily: 'monospace', fontSize: 11, height: 18 }}
          />
        </Box>
        {description && (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

/**
 * Mini device-frame preview (88×50). Renders each zone as a soft
 * coloured rectangle so the admin can see the shape at a glance.
 */
const LayoutMiniPreview: React.FC<{ zones: LayoutZone[] }> = ({ zones }) => {
  const frameW = 88;
  const frameH = 50;
  // Soft palette — cycles for multi-zone variety.
  const tints = [
    'rgba(11, 166, 223, 0.35)',
    'rgba(249, 115, 22, 0.35)',
    'rgba(22, 163, 74, 0.30)',
    'rgba(220, 38, 38, 0.30)',
    'rgba(59, 130, 246, 0.35)',
  ];
  return (
    <Box
      sx={{
        width: frameW + 4,
        height: frameH + 4,
        p: '2px',
        bgcolor: '#0a0a0a',
        borderRadius: '6px',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'relative', width: frameW, height: frameH }}>
        {zones.map((z, i) => (
          <Box
            key={z.slug}
            sx={{
              position: 'absolute',
              left: `${(z.x_pct * frameW) / 100}px`,
              top: `${(z.y_pct * frameH) / 100}px`,
              width: `${(z.w_pct * frameW) / 100}px`,
              height: `${(z.h_pct * frameH) / 100}px`,
              border: '0.5px solid rgba(255,255,255,0.15)',
              bgcolor: tints[i % tints.length],
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default DeviceLayoutDialog;
