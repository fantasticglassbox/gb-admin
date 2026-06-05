/**
 * PairDeviceByScan — right-side drawer that lets a venue partner (or
 * admin) bind a device by scanning its on-screen QR code.
 *
 * The device's pairing page renders a QR encoding `glassbox://pair?
 * code=XXXXXX`. We open the rear camera (mobile) or the default one
 * (desktop), run html5-qrcode on the live feed, extract the code,
 * confirm the outlet target, then POST /v2/devices/pair/:code.
 *
 * UX falls back to manual entry: anyone whose browser blocks camera
 * access can still type the code printed on the device. This keeps
 * the panel usable from venue laptops without webcams.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import { Html5Qrcode } from 'html5-qrcode';
import apiService from '../services/api';
import { Outlet } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Locked-down venue id (venue_partner role) or undefined (admin role,
   *  who could pair into any venue but for this entry point we expect
   *  it to be set by the parent). */
  venuePartnerId: string;
  /** Fired with the freshly-claimed device summary so the caller can
   *  refresh its devices list / show a snackbar. */
  onPaired: (info: {
    device_id: string;
    venue_partner_id: string;
    outlet_id?: string;
  }) => void;
}

const QR_REGION_ID = 'pair-device-qr-region';

const PairDeviceByScan: React.FC<Props> = ({
  open,
  onClose,
  venuePartnerId,
  onPaired,
}) => {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);

  // Reset form whenever the drawer re-opens. Closing mid-scan stops
  // the camera in the cleanup of the scan effect.
  useEffect(() => {
    if (!open) return;
    setCode('');
    setDeviceName('');
    setError(null);
    setInfo(null);
    setMode('scan');
  }, [open]);

  // Load outlets for the chosen venue (every open — cached at the API
  // layer would be nice but this is fine for ~10s of outlets).
  useEffect(() => {
    if (!open || !venuePartnerId) return;
    let cancelled = false;
    apiService
      .listOutletsForVenuePartner(venuePartnerId, { limit: 200 })
      .then((r) => {
        if (cancelled) return;
        setOutlets(r.data || []);
        if (r.data?.length === 1) setOutletId(r.data[0].id);
      })
      .catch((e) =>
        setError(e?.response?.data?.error || 'Failed to load outlets'),
      );
    return () => {
      cancelled = true;
    };
  }, [open, venuePartnerId]);

  // ---- camera lifecycle ----

  useEffect(() => {
    if (!open || mode !== 'scan') return;

    let cancelled = false;
    const start = async () => {
      try {
        const el = document.getElementById(QR_REGION_ID);
        if (!el) return;
        const scanner = new Html5Qrcode(QR_REGION_ID);
        scannerRef.current = scanner;
        // Prefer the rear-facing camera on mobile; fall back silently
        // if the platform refuses.
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled || scanningRef.current) return;
            scanningRef.current = true;
            const parsed = parsePairCode(decoded);
            if (parsed) {
              setCode(parsed);
              setInfo(`Scanned code ${formatCode(parsed)} — pick an outlet, then Pair.`);
              // We don't auto-stop the camera so the user can correct
              // and re-scan. The submit handler stops it.
              scanningRef.current = false;
            } else {
              setError(
                `QR didn't look like a Glassbox pair code (got "${decoded.slice(0, 40)}")`,
              );
              scanningRef.current = false;
            }
          },
          () => {
            // Per-frame "no QR found" callbacks — silenced.
          },
        );
      } catch (e: any) {
        setError(
          e?.message ||
            'Could not start camera. Switch to Type code instead.',
        );
      }
    };
    start();
    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .catch(() => {})
          .finally(() => {
            scanner.clear();
            scannerRef.current = null;
          });
      }
    };
  }, [open, mode]);

  // ---- submit ----

  const canSubmit = useMemo(
    () => !!code && !!outletId && !submitting,
    [code, outletId, submitting],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      const res = await apiService.pairDevice(code, {
        venue_partner_id: venuePartnerId,
        outlet_id: outletId || undefined,
        device_name: deviceName || undefined,
      });
      onPaired(res);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Pair failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- render ----

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
            borderBottom: '1px solid #E8E2D7',
            px: 3,
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#F97316',
              }}
            >
              Pair device
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Scan the QR on the screen
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button
              variant={mode === 'scan' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<QrCodeScannerIcon />}
              onClick={() => setMode('scan')}
            >
              Scan QR
            </Button>
            <Button
              variant={mode === 'manual' ? 'contained' : 'outlined'}
              size="small"
              startIcon={<KeyboardIcon />}
              onClick={() => setMode('manual')}
            >
              Type code
            </Button>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {info && (
            <Alert severity="success" onClose={() => setInfo(null)} sx={{ mb: 2 }}>
              {info}
            </Alert>
          )}

          {mode === 'scan' ? (
            <Box>
              <Box
                id={QR_REGION_ID}
                sx={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  bgcolor: '#000',
                  borderRadius: 2,
                  overflow: 'hidden',
                  mb: 1,
                  '& video': { objectFit: 'cover' },
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Point the camera at the QR on the device's pairing
                screen. The code auto-fills below as soon as it's
                recognised.
              </Typography>
            </Box>
          ) : (
            <TextField
              label="Pair code"
              fullWidth
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              helperText="6 characters, e.g. 847-2K9 (hyphen optional)"
              inputProps={{ maxLength: 8, style: { letterSpacing: '0.2em' } }}
            />
          )}

          {code && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                border: '1px solid #E8E2D7',
                borderRadius: 2,
                bgcolor: '#FAF7F2',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Code
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: 24,
                  letterSpacing: '0.2em',
                }}
              >
                {formatCode(code)}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Outlet</InputLabel>
              <Select
                value={outletId}
                label="Outlet"
                onChange={(e) => setOutletId(e.target.value as string)}
              >
                {outlets.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.display_name}
                    {o.city ? ` · ${o.city}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Device name (optional)"
              fullWidth
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              helperText="e.g. 'Lobby TV', 'Front counter screen'"
            />
          </Stack>
        </Box>

        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid #E8E2D7',
            px: 3,
            py: 2,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1.5,
          }}
        >
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={14} /> : null}
          >
            {submitting ? 'Pairing…' : 'Pair device'}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

/** Extract the 6-char pair code from whatever the QR decoded to.
 *  Accepts:
 *    - "glassbox://pair?code=8472K9"
 *    - "glassbox://pair?code=847-2K9"
 *    - bare codes like "847-2K9" or "8472K9" (manual scan apps)
 *  Returns the unhyphenated, uppercased code, or null. */
const parsePairCode = (raw: string): string | null => {
  if (!raw) return null;
  // Try the URL shape first.
  const urlMatch = raw.match(/code=([A-Z0-9-]+)/i);
  const candidate = (urlMatch ? urlMatch[1] : raw).replace(/[-\s]/g, '').toUpperCase();
  return /^[A-Z0-9]{6}$/.test(candidate) ? candidate : null;
};

/** Insert the display hyphen between char 3 and 4 ("8472K9" → "847-2K9"). */
const formatCode = (code: string): string => {
  const clean = code.replace(/[-\s]/g, '').toUpperCase();
  if (clean.length !== 6) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3)}`;
};

export default PairDeviceByScan;
