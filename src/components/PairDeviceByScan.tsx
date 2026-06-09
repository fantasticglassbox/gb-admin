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
import { useAuth } from '../contexts/AuthContext';
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
  const { user } = useAuth();
  // Fall back to the auth session if the parent didn't pass the prop —
  // belt and suspenders for venue partner users where the parent might
  // not have it wired through. Admins must explicitly pass it.
  const effectiveVenueId = venuePartnerId || user?.venue_partner_id || '';

  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [code, setCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [outletId, setOutletId] = useState('');
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);
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
    if (!open) return;
    if (!effectiveVenueId) {
      setError(
        'Your account is not linked to a venue. Ask an admin to attach ' +
          'your user to a venue partner before pairing devices.',
      );
      return;
    }
    let cancelled = false;
    setOutletsLoading(true);
    apiService
      .listOutletsForVenuePartner(effectiveVenueId, { limit: 200 })
      .then((r) => {
        if (cancelled) return;
        const list = r.data || [];
        setOutlets(list);
        if (list.length === 1) setOutletId(list[0].id);
      })
      .catch((e) => {
        if (cancelled) return;
        // Surface enough detail to diagnose — the venue partner can
        // forward this to support and we'll know if it's a 4xx vs 5xx.
        const detail =
          e?.response?.data?.error ||
          e?.message ||
          'unknown error';
        const status = e?.response?.status;
        setError(
          `Couldn't load your outlets (${
            status ? `HTTP ${status}: ` : ''
          }${detail}). Try reloading the page.`,
        );
      })
      .finally(() => {
        if (!cancelled) setOutletsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, effectiveVenueId]);

  // ---- camera lifecycle ----

  useEffect(() => {
    if (!open || mode !== 'scan') return;

    // Pre-flight check: getUserMedia only works on secure origins
    // (https:// or localhost). If we're served over plain http on a
    // non-localhost host, the camera will silently fail — surface the
    // exact reason so the user can move to https or use Type code.
    if (!isSecureContextOk()) {
      setError(
        'Camera access requires HTTPS. This page is loaded over an ' +
          "insecure connection (http://) so the browser won't let us " +
          'open the camera. Either deploy the admin UI to an HTTPS host ' +
          '(Vercel, your domain) or use the "Type code" mode below.',
      );
      return;
    }

    let cancelled = false;
    const start = async () => {
      try {
        // The Drawer needs one frame to actually mount its contents in
        // the DOM. Without this, getElementById can return null when
        // start() runs synchronously on open.
        await new Promise((r) => setTimeout(r, 50));
        if (cancelled) return;
        const el = document.getElementById(QR_REGION_ID);
        if (!el) {
          setError('Scanner could not bind to its container — try toggling the drawer.');
          return;
        }
        const scanner = new Html5Qrcode(QR_REGION_ID);
        scannerRef.current = scanner;
        // Prefer the rear-facing camera on mobile; fall back silently
        // if the platform refuses (desktop, single front cam, etc).
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
        setError(friendlyCameraError(e));
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
        venue_partner_id: effectiveVenueId,
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
            px: { xs: 2, sm: 3 },
            py: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
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
            <Typography
              variant="h6"
              noWrap
              sx={{ fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              Scan the QR on the screen
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            // Clip any horizontal overflow from the html5-qrcode
            // injected video (which renders at the camera's native
            // resolution and can push past the container width).
            overflowX: 'hidden',
            px: { xs: 2, sm: 3 },
            py: 2,
          }}
        >
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
                  // Capped square so the camera preview doesn't take
                  // ~70% of a phone viewport. The qrbox finder
                  // overlay is 240px; a 280px container hugs it
                  // closely while keeping the outlet picker + Pair
                  // button visible below the fold.
                  //
                  // The `!important` overrides on inner elements
                  // defeat html5-qrcode's inline-style sizing —
                  // without them the injected <video> element
                  // renders at the camera's native resolution
                  // (~640×480) and the right edge spills off-screen
                  // on a phone.
                  width: '100%',
                  maxWidth: 280,
                  aspectRatio: '1 / 1',
                  mx: 'auto',
                  bgcolor: '#000',
                  borderRadius: 2,
                  overflow: 'hidden',
                  mb: 1,
                  position: 'relative',
                  '& video': {
                    width: '100% !important',
                    height: '100% !important',
                    objectFit: 'cover',
                  },
                  '& > div': {
                    width: '100% !important',
                    height: '100% !important',
                  },
                  '& canvas': {
                    width: '100% !important',
                    height: 'auto !important',
                  },
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
            <FormControl fullWidth disabled={outletsLoading || outlets.length === 0}>
              <InputLabel>
                {outletsLoading
                  ? 'Loading outlets…'
                  : outlets.length === 0
                  ? 'No outlets available'
                  : `Outlet (${outlets.length} available)`}
              </InputLabel>
              <Select
                value={outletId}
                label={
                  outletsLoading
                    ? 'Loading outlets…'
                    : outlets.length === 0
                    ? 'No outlets available'
                    : `Outlet (${outlets.length} available)`
                }
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
            {!outletsLoading && outlets.length === 0 && effectiveVenueId && !error && (
              <Alert severity="warning">
                Your venue has no outlets yet. Create one in <strong>Outlets</strong>
                {' '}first — a device has to live somewhere before it can play.
              </Alert>
            )}
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
            px: { xs: 2, sm: 3 },
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

/** Browsers refuse getUserMedia on plain http unless the host is
 *  `localhost` / `127.0.0.1`. Detect both possible flags — modern
 *  browsers expose `window.isSecureContext`, older ones (and some
 *  in-app webviews) don't. */
const isSecureContextOk = (): boolean => {
  if (typeof window === 'undefined') return true;
  if ((window as any).isSecureContext === true) return true;
  const proto = window.location.protocol;
  if (proto === 'https:') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
};

/** Translate the raw camera error into something a venue partner can
 *  act on. Covers the common mobile failure modes: denied permission,
 *  no camera, camera busy, getUserMedia unsupported. */
const friendlyCameraError = (e: any): string => {
  const name = (e?.name || '').toString();
  const msg = (e?.message || '').toString();
  if (name === 'NotAllowedError' || /permission/i.test(msg)) {
    return (
      'Camera permission was denied. Open your browser settings for this ' +
      'page, allow camera access, then reopen the drawer. On iOS you may ' +
      'need to fully close + reopen Safari.'
    );
  }
  if (name === 'NotFoundError' || /no.*camera/i.test(msg)) {
    return 'No camera was found on this device. Switch to "Type code".';
  }
  if (name === 'NotReadableError' || /in use/i.test(msg) || /busy/i.test(msg)) {
    return 'Camera is in use by another app. Close it and try again.';
  }
  if (name === 'OverconstrainedError') {
    return (
      'Rear camera is not available on this device. Reload the page and ' +
      'try again; we will fall back to the default camera.'
    );
  }
  if (/getusermedia/i.test(msg)) {
    return (
      'This browser does not expose camera access. Try Chrome, Safari, or ' +
      'switch to "Type code" below.'
    );
  }
  return msg || 'Could not start the camera. Switch to "Type code" instead.';
};

export default PairDeviceByScan;
