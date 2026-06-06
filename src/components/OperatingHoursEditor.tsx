import React, { useMemo } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';

// Backend wire format for operating_hours (and campaign playing_hours):
//   "mon=08:00-22:00,tue=08:00-22:00,...,sun=09:00-23:00"
// An empty string means "24/7" (open every day, all hours). A day
// that is absent from the CSV is treated as CLOSED.
//
// This editor turns that compact string into a 7-row grid the admin
// can poke at without learning the format. The serialise/parse
// helpers are exported so other forms (campaign editor, etc.) can
// reuse them without duplicating string ops.

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type DayHours = {
  enabled: boolean;
  /** "HH:MM" in 24h. Empty when disabled. */
  open: string;
  close: string;
};

const defaultHours = (): Record<DayKey, DayHours> => ({
  mon: { enabled: true, open: '08:00', close: '22:00' },
  tue: { enabled: true, open: '08:00', close: '22:00' },
  wed: { enabled: true, open: '08:00', close: '22:00' },
  thu: { enabled: true, open: '08:00', close: '22:00' },
  fri: { enabled: true, open: '08:00', close: '22:00' },
  sat: { enabled: true, open: '08:00', close: '22:00' },
  sun: { enabled: true, open: '08:00', close: '22:00' },
});

/** Parse "mon=08:00-22:00,tue=09:00-21:00" into per-day state.
 *  Empty input = all days enabled with the 08:00-22:00 default
 *  (which serialises back to "" — i.e. 24/7 stays 24/7 until the
 *  admin actually toggles a day). */
export function parseOperatingHours(input: string): Record<DayKey, DayHours> {
  const base = defaultHours();
  if (!input || !input.trim()) return base;

  // Start from all-closed so absent days remain closed.
  const out: Record<DayKey, DayHours> = {
    mon: { enabled: false, open: '08:00', close: '22:00' },
    tue: { enabled: false, open: '08:00', close: '22:00' },
    wed: { enabled: false, open: '08:00', close: '22:00' },
    thu: { enabled: false, open: '08:00', close: '22:00' },
    fri: { enabled: false, open: '08:00', close: '22:00' },
    sat: { enabled: false, open: '08:00', close: '22:00' },
    sun: { enabled: false, open: '08:00', close: '22:00' },
  };

  for (const piece of input.split(',')) {
    const [day, range] = piece.split('=');
    const key = (day || '').trim().toLowerCase() as DayKey;
    if (!(key in out)) continue;
    const [open, close] = (range || '').split('-');
    if (!open || !close) continue;
    out[key] = { enabled: true, open: open.trim(), close: close.trim() };
  }
  return out;
}

/** Serialise back to the CSV wire format. If every day is enabled
 *  with identical hours AND those hours are 00:00-23:59 (or 24:00),
 *  we return "" — the backend treats empty as 24/7. Otherwise we emit
 *  only the enabled days. */
export function serialiseOperatingHours(state: Record<DayKey, DayHours>): string {
  const enabled = DAYS.filter((d) => state[d.key].enabled);
  if (enabled.length === 0) return ''; // all closed — fall back to 24/7 default; admin should not save closed-all-days
  if (enabled.length === 7) {
    const first = state[enabled[0].key];
    const allSame = enabled.every(
      (d) => state[d.key].open === first.open && state[d.key].close === first.close,
    );
    if (allSame && first.open === '00:00' && (first.close === '24:00' || first.close === '23:59')) {
      return '';
    }
  }
  return enabled
    .map((d) => `${d.key}=${state[d.key].open}-${state[d.key].close}`)
    .join(',');
}

interface Props {
  value: string;
  onChange: (next: string) => void;
}

const OperatingHoursEditor: React.FC<Props> = ({ value, onChange }) => {
  const state = useMemo(() => parseOperatingHours(value), [value]);

  const update = (key: DayKey, patch: Partial<DayHours>) => {
    const next = { ...state, [key]: { ...state[key], ...patch } };
    onChange(serialiseOperatingHours(next));
  };

  const copyMonToAll = () => {
    const ref = state.mon;
    const next: Record<DayKey, DayHours> = {} as any;
    for (const d of DAYS) {
      next[d.key] = { ...ref, enabled: true };
    }
    onChange(serialiseOperatingHours(next));
  };

  const setAllWeekdays = () => {
    const next = { ...state };
    for (const k of ['mon', 'tue', 'wed', 'thu', 'fri'] as DayKey[]) {
      next[k] = { ...next[k], enabled: true };
    }
    for (const k of ['sat', 'sun'] as DayKey[]) {
      next[k] = { ...next[k], enabled: false };
    }
    onChange(serialiseOperatingHours(next));
  };

  const set24x7 = () => onChange('');

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Toggle a day off to mark it closed. Empty result = open 24/7.
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Copy Monday's hours to every day">
            <Chip
              icon={<CopyIcon sx={{ fontSize: 14 }} />}
              label="Apply Mon to all"
              size="small"
              variant="outlined"
              onClick={copyMonToAll}
              clickable
            />
          </Tooltip>
          <Chip
            label="Weekdays only"
            size="small"
            variant="outlined"
            onClick={setAllWeekdays}
            clickable
          />
          <Chip
            label="24 / 7"
            size="small"
            variant="outlined"
            onClick={set24x7}
            clickable
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {DAYS.map((d, idx) => {
          const row = state[d.key];
          return (
            <Stack
              key={d.key}
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{
                px: 2,
                py: 1,
                borderTop: idx === 0 ? 0 : 1,
                borderColor: 'divider',
                bgcolor: row.enabled ? 'background.paper' : 'grey.50',
              }}
            >
              <Box sx={{ width: 48 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: row.enabled ? 'text.primary' : 'text.disabled',
                  }}
                >
                  {d.label}
                </Typography>
              </Box>
              <Switch
                size="small"
                checked={row.enabled}
                onChange={(e) => update(d.key, { enabled: e.target.checked })}
              />
              <TextField
                size="small"
                type="time"
                value={row.open}
                disabled={!row.enabled}
                onChange={(e) => update(d.key, { open: e.target.value })}
                sx={{ width: 110 }}
                inputProps={{ step: 300 }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                –
              </Typography>
              <TextField
                size="small"
                type="time"
                value={row.close}
                disabled={!row.enabled}
                onChange={(e) => update(d.key, { close: e.target.value })}
                sx={{ width: 110 }}
                inputProps={{ step: 300 }}
              />
              {!row.enabled && (
                <Typography variant="caption" color="text.disabled">
                  Closed
                </Typography>
              )}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
};

export default OperatingHoursEditor;
