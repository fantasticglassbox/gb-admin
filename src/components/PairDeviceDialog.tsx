import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { apiService } from '../services/api';
import { VenuePartner, Outlet } from '../types';

interface PairDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onPaired?: (deviceId: string) => void;
}

/**
 * Admin-side pair-device dialog. Counterpart to the 6-digit code shown
 * on the gb-media setup wizard. Admin picks the venue, optionally picks
 * an outlet within that venue, names the device, types the code; on
 * submit the device is created tagged with those values and the
 * gb-media side completes the pair handshake within ~3 seconds.
 */
const PairDeviceDialog: React.FC<PairDeviceDialogProps> = ({
  open,
  onClose,
  onPaired,
}) => {
  const [code, setCode] = useState('');
  const [venues, setVenues] = useState<VenuePartner[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [venueId, setVenueId] = useState('');
  const [outletId, setOutletId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ deviceId: string } | null>(null);

  // Load venue list once when dialog opens
  useEffect(() => {
    if (!open) return;
    setCode('');
    setVenueId('');
    setOutletId('');
    setDeviceName('');
    setError(null);
    setSuccess(null);
    setLoadingVenues(true);
    apiService
      .listVenuePartners({ limit: 200 })
      .then((res) => setVenues(res.data))
      .catch(() => setVenues([]))
      .finally(() => setLoadingVenues(false));
  }, [open]);

  // Refresh outlet list whenever the venue changes
  useEffect(() => {
    if (!venueId) {
      setOutlets([]);
      setOutletId('');
      return;
    }
    setLoadingOutlets(true);
    setOutletId('');
    apiService
      .listOutletsForVenuePartner(venueId, { limit: 200 })
      .then((res) => setOutlets(res.data))
      .catch(() => setOutlets([]))
      .finally(() => setLoadingOutlets(false));
  }, [venueId]);

  const canSubmit =
    code.replace(/\s/g, '').length === 6 &&
    venueId.length > 0 &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiService.pairDevice(code, {
        venue_partner_id: venueId,
        outlet_id: outletId || undefined,
        device_name: deviceName || undefined,
      });
      setSuccess({ deviceId: res.device_id });
      onPaired?.(res.device_id);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || 'Pair failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Pair a new device</DialogTitle>
      <DialogContent>
        {success ? (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Device paired. The screen should switch to playback within a few
              seconds.
            </Alert>
            <Typography variant="caption" color="text.secondary">
              New device id
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: 13,
                wordBreak: 'break-all',
                mt: 0.5,
              }}
            >
              {success.deviceId}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Look at the gb-media screen — the wizard's last step shows a
              6-character code (e.g. <code>G4N 7XP</code>). Type it below,
              pick the venue + outlet to bind to, and the device flips to
              playback automatically.
            </Typography>

            <TextField
              label="Pair code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              fullWidth
              autoFocus
              placeholder="G4N 7XP"
              helperText="6 characters, no zeros or ones, no I/L/O"
              inputProps={{
                style: {
                  fontFamily: 'monospace',
                  fontSize: 22,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                },
                maxLength: 8, // 6 chars + optional space + buffer
              }}
            />

            <FormControl fullWidth disabled={loadingVenues || submitting}>
              <InputLabel>Venue partner</InputLabel>
              <Select
                value={venueId}
                label="Venue partner"
                onChange={(e) => setVenueId(e.target.value)}
              >
                {loadingVenues ? (
                  <MenuItem value="">
                    <em>Loading…</em>
                  </MenuItem>
                ) : venues.length === 0 ? (
                  <MenuItem value="" disabled>
                    <em>No venue partners</em>
                  </MenuItem>
                ) : (
                  venues.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.display_name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl
              fullWidth
              disabled={!venueId || loadingOutlets || submitting}
            >
              <InputLabel>Outlet (optional)</InputLabel>
              <Select
                value={outletId}
                label="Outlet (optional)"
                onChange={(e) => setOutletId(e.target.value)}
              >
                <MenuItem value="">
                  <em>— assign later —</em>
                </MenuItem>
                {loadingOutlets ? (
                  <MenuItem value="" disabled>
                    <em>Loading…</em>
                  </MenuItem>
                ) : (
                  outlets.map((o) => (
                    <MenuItem key={o.id} value={o.id}>
                      {o.display_name}
                      {o.city ? ` — ${o.city}` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <TextField
              label="Device name (optional)"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Senopati 21 TV"
              fullWidth
              helperText="Defaults to the label the device sent at registration."
            />

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {success ? (
          <Button onClick={close} variant="contained">
            Done
          </Button>
        ) : (
          <>
            <Button onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              variant="contained"
              disabled={!canSubmit}
              startIcon={
                submitting ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              Pair device
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PairDeviceDialog;
