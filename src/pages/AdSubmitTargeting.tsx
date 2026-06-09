/**
 * CampaignSubmitTargeting — publisher submit page for a single campaign.
 *
 * Mirrors wireframes/publisher-submit.html: a two-column layout with the
 * targeting builder on the left (per-venue picker, group checkboxes) and
 * a live coverage preview on the right rail. Each checkbox toggle re-
 * fetches /v2/targeting/preview so the operator sees real-time outlet
 * counts, top cities, and compliance exceptions before committing.
 *
 * Routing: /publisher/campaigns/:campaignId/submit
 *          /admin/campaigns/:campaignId/submit
 *
 * The page reads a Campaign (with its assets[]) instead of an
 * Advertisement, so the creative card at the top shows the full asset
 * map (one row per zone). Submit posts to /v2/campaign-approvals/submit
 * with the unique venue set derived from the picked groups; the
 * backend produces one CampaignApproval per (campaign × venue). Per-
 * outlet exceptions land with Epic-D phase 4.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  Campaign,
  CampaignAsset,
  OutletGroup,
  TargetingPreview,
  VenuePartner,
} from '../types';

// ---- venue card props ----

interface VenueCardProps {
  venue: VenuePartner;
  groups: OutletGroup[];
  selectedGroupIds: Set<string>;
  onToggle: (groupId: string) => void;
  onRemove: () => void;
}

const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  groups,
  selectedGroupIds,
  onToggle,
  onRemove,
}) => {
  // Sort ANY first, then SYSTEM_AUTO, then VENUE_CURATED — matches the
  // wireframe's reading order so the platform default is always the
  // first row.
  const ordered = useMemo(() => {
    const rank = (k: string) =>
      k === 'ANY' ? 0 : k === 'SYSTEM_AUTO' ? 1 : 2;
    return [...groups].sort(
      (a, b) =>
        rank(a.kind) - rank(b.kind) ||
        a.display_name.localeCompare(b.display_name),
    );
  }, [groups]);

  const totalOutlets = useMemo(() => {
    const any = ordered.find((g) => g.kind === 'ANY');
    return any?.member_count ?? 0;
  }, [ordered]);

  return (
    <Paper
      variant="outlined"
      sx={{ mb: 1.5, overflow: 'hidden', borderRadius: 2 }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          background: '#F5F1EA',
          borderBottom: '1px solid #E8E2D7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            component="span"
            sx={{ fontWeight: 700, color: '#1A1816', mr: 1 }}
          >
            {venue.display_name}
          </Typography>
          <Typography
            component="span"
            sx={{ fontSize: 12, color: '#6B645C' }}
          >
            · {totalOutlets} outlets total
          </Typography>
        </Box>
        <IconButton size="small" onClick={onRemove} aria-label="Remove venue">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          p: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1,
        }}
      >
        {ordered.map((g) => {
          const selected = selectedGroupIds.has(g.id);
          const badgeColor =
            g.kind === 'SYSTEM_AUTO'
              ? { bg: '#E0F4FF', fg: '#0773a3', label: 'SYSTEM' }
              : g.kind === 'ANY'
              ? { bg: '#FFEDD5', fg: '#c2410c', label: 'ANY' }
              : { bg: '#FFEDD5', fg: '#c2410c', label: 'VENUE' };
          return (
            <Box
              key={g.id}
              role="checkbox"
              tabIndex={0}
              aria-checked={selected}
              onClick={() => onToggle(g.id)}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  onToggle(g.id);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.25,
                borderRadius: 1.25,
                cursor: 'pointer',
                border: selected ? '1px solid #0BA6DF' : '1px solid transparent',
                background: selected ? '#E0F4FF' : 'transparent',
                transition: 'background 120ms',
                '&:hover': { background: selected ? '#E0F4FF' : '#F5F1EA' },
              }}
            >
              <Box
                sx={{
                  width: 18,
                  height: 18,
                  borderRadius: '5px',
                  border: '1.5px solid',
                  borderColor: selected ? '#0BA6DF' : '#9B948C',
                  background: selected ? '#0BA6DF' : 'white',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {selected ? '✓' : ''}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    component="span"
                    sx={{ fontSize: 13, fontWeight: 600, color: '#1A1816' }}
                  >
                    {g.display_name}
                  </Typography>
                  <Chip
                    label={badgeColor.label}
                    size="small"
                    sx={{
                      height: 16,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      bgcolor: badgeColor.bg,
                      color: badgeColor.fg,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                </Box>
                <Typography
                  sx={{ fontSize: 11, color: '#6B645C', mt: 0.25 }}
                >
                  {g.member_count} outlets
                  {g.description ? ` · ${g.description}` : ''}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

// ---- main page ----

const CampaignSubmitTargeting: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = `/${user?.role || 'admin'}`;

  // Source data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allVenues, setAllVenues] = useState<VenuePartner[]>([]);
  const [groupsByVenue, setGroupsByVenue] = useState<Record<string, OutletGroup[]>>({});

  // UI state
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(
    new Set(),
  );
  const [addVenueId, setAddVenueId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Live preview
  const [preview, setPreview] = useState<TargetingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Debounce timer for preview refetch
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- initial load ----

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!campaignId) return;
      try {
        const [cmp, venuesPage] = await Promise.all([
          apiService.getCampaign(campaignId),
          apiService.listVenuePartners({ limit: 200 }),
        ]);
        if (cancelled) return;
        setCampaign(cmp);
        setAllVenues(venuesPage.data || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load campaign');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  // ---- per-venue group lazy fetch ----

  const ensureVenueLoaded = useCallback(
    async (venueId: string) => {
      if (groupsByVenue[venueId]) return;
      try {
        const groups = await apiService.listOutletGroupsForVenue(venueId);
        setGroupsByVenue((prev) => ({ ...prev, [venueId]: groups }));
      } catch (e: any) {
        setError(e?.message || 'Failed to load outlet groups');
      }
    },
    [groupsByVenue],
  );

  // ---- targeting preview ----
  //
  // Debounced 300ms so a quick run of clicks doesn't fire one request per
  // toggle. Cancels any in-flight timer when the selection changes.

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const ids = Array.from(selectedGroupIds);
    if (ids.length === 0) {
      setPreview(null);
      return;
    }
    previewTimer.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        // Preview's compliance check still keys on advertisement_id
        // today; pass an empty id until the targeting preview endpoint
        // is taught to accept a campaign_id (Epic-D phase 4 cleanup).
        const p = await apiService.targetingPreview({
          outlet_group_ids: ids,
        });
        setPreview(p);
      } catch (e: any) {
        setError(e?.message || 'Preview failed');
      } finally {
        setPreviewLoading(false);
      }
    }, 300);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [selectedGroupIds]);

  // ---- handlers ----

  const handleAddVenue = () => {
    if (!addVenueId) return;
    if (selectedVenueIds.includes(addVenueId)) {
      setAddVenueId('');
      return;
    }
    ensureVenueLoaded(addVenueId);
    setSelectedVenueIds((prev) => [...prev, addVenueId]);
    setAddVenueId('');
  };

  const handleRemoveVenue = (venueId: string) => {
    setSelectedVenueIds((prev) => prev.filter((v) => v !== venueId));
    // Drop any of that venue's groups from the selection.
    const venueGroups = groupsByVenue[venueId] || [];
    const venueGroupIds = new Set(venueGroups.map((g) => g.id));
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      venueGroupIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!campaignId) return;
    if (selectedGroupIds.size === 0) {
      setError('Pick at least one outlet group before submitting.');
      return;
    }
    // Derive the venue set from the selected groups — phase 3 fan-out
    // is still venue-level. The per-group + exception-row fan-out lands
    // when Epic-D phase 4 extends the submit contract.
    const venueIds = new Set<string>();
    selectedGroupIds.forEach((gid) => {
      for (const [vId, groups] of Object.entries(groupsByVenue)) {
        if (groups.some((g) => g.id === gid)) {
          venueIds.add(vId);
          break;
        }
      }
    });

    setSubmitting(true);
    setError(null);
    try {
      const res = await apiService.submitCampaign({
        campaign_id: campaignId,
        venue_partner_ids: Array.from(venueIds),
        notes,
      });
      const created = res.created?.length || 0;
      const skipped = res.skipped?.length || 0;
      setSuccess(
        `Submitted: ${created} approval${created === 1 ? '' : 's'} created` +
          (skipped > 0 ? `, ${skipped} skipped (already in flight)` : ''),
      );
      // Admin lands on the approvals queue; publisher (who no longer
      // has an approvals page) goes back to their Campaigns list where
      // submission status is summarised per row.
      setTimeout(() => {
        const target =
          user?.role === 'publisher' ? 'campaigns' : 'approvals';
        navigate(`${basePath}/${target}`);
      }, 1500);
    } catch (e: any) {
      setError(e?.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- derived data ----

  const venueById = useMemo(
    () => Object.fromEntries(allVenues.map((v) => [v.id, v])),
    [allVenues],
  );

  const addableVenues = useMemo(
    () => allVenues.filter((v) => !selectedVenueIds.includes(v.id)),
    [allVenues, selectedVenueIds],
  );

  const groupsSelectedCount = selectedGroupIds.size;

  // ---- render ----

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Campaign not found.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1280, mx: 'auto' }}>
      <Button
        onClick={() => navigate(-1)}
        sx={{ color: '#0773a3', mb: 1, textTransform: 'none' }}
      >
        ← Back
      </Button>

      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#F97316',
          mb: 0.5,
        }}
      >
        Publisher · Submit ad
      </Typography>
      <Typography
        variant="h4"
        sx={{ fontWeight: 800, color: '#1A1816', letterSpacing: '-0.02em' }}
      >
        Submit {campaign.title}
      </Typography>
      <Typography sx={{ color: '#6B645C', mt: 1, mb: 3, maxWidth: 720 }}>
        Pick the venues and the outlet groups within them. One approval per
        (campaign × venue) gets created — every asset of this campaign plays
        on the venue's devices during the campaign's published window. The
        right rail shows total outlets and top cities live as you select.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 380px' },
          gap: 4,
        }}
      >
        {/* ---- main column ---- */}
        <Box>
          {/* Campaign asset map */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6B645C',
                mb: 2,
              }}
            >
              Campaign assets
            </Typography>
            <Typography sx={{ fontWeight: 700, color: '#1A1816' }}>
              {campaign.title}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#9B948C', mb: 2 }}>
              {campaign.published_time_start?.slice(0, 10)} →{' '}
              {campaign.published_time_end?.slice(0, 10)} · state{' '}
              {campaign.state}
            </Typography>
            <Stack spacing={1.5}>
              {(campaign.assets || []).map((a: CampaignAsset) => (
                <Stack
                  key={a.id}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px solid #E8E2D7',
                    bgcolor: '#FAF7F2',
                  }}
                >
                  {a.content_type === 'IMAGE' ? (
                    <Box
                      component="img"
                      src={a.content_url}
                      alt={a.zone_slug}
                      sx={{
                        width: 72,
                        height: 48,
                        objectFit: 'cover',
                        borderRadius: 1,
                        border: '1px solid #E8E2D7',
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 72,
                        height: 48,
                        borderRadius: 1,
                        border: '1px solid #E8E2D7',
                        background: '#1A1816',
                        color: 'white',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      VIDEO
                    </Box>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                      zone <code>{a.zone_slug}</code>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {a.content_type} · {a.duration_seconds}s
                    </Typography>
                  </Box>
                </Stack>
              ))}
              {(campaign.assets || []).length === 0 && (
                <Alert severity="warning">
                  This campaign has no assets. Go back and add at least one
                  before submitting.
                </Alert>
              )}
            </Stack>
          </Paper>

          {/* Targeting card */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              sx={{ mb: 2 }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#6B645C',
                }}
              >
                Targeting
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#9B948C' }}>
                {selectedVenueIds.length} venue
                {selectedVenueIds.length === 1 ? '' : 's'} · {groupsSelectedCount}{' '}
                group{groupsSelectedCount === 1 ? '' : 's'} selected
              </Typography>
            </Stack>

            {selectedVenueIds.map((vId) => {
              const venue = venueById[vId];
              if (!venue) return null;
              const groups = groupsByVenue[vId] || [];
              return (
                <VenueCard
                  key={vId}
                  venue={venue}
                  groups={groups}
                  selectedGroupIds={selectedGroupIds}
                  onToggle={handleToggleGroup}
                  onRemove={() => handleRemoveVenue(vId)}
                />
              );
            })}

            {/* Add-venue row */}
            {addableVenues.length > 0 ? (
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Add venue</InputLabel>
                  <Select
                    value={addVenueId}
                    label="Add venue"
                    onChange={(e) => setAddVenueId(e.target.value as string)}
                  >
                    {addableVenues.map((v) => (
                      <MenuItem key={v.id} value={v.id}>
                        {v.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  disabled={!addVenueId}
                  onClick={handleAddVenue}
                >
                  Add
                </Button>
              </Stack>
            ) : (
              <Typography sx={{ fontSize: 12, color: '#9B948C', mt: 1 }}>
                All venues added.
              </Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#6B645C',
                mb: 2,
              }}
            >
              Notes for venue (optional)
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              placeholder="Anything the approving venue should know — campaign context, contact info, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {/* Two variants of the warning depending on the campaign's
              current state. Either way, submitting venues that are
              already targeted is a server-side no-op — only new
              venues get fanned-out approval rows. */}
          {campaign.state === 'DRAFT' ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>Submitting publishes the campaign.</strong>{' '}
              Approval requests fan out to the venues you pick below
              and the campaign goes live. You can come back later to
              add more venues; existing approvals stay untouched.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              This campaign is <strong>{campaign.state}</strong>. Pick
              any venues you haven't targeted yet — they'll receive a
              fresh approval request. Venues already on this campaign
              are skipped automatically.
            </Alert>
          )}

          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              disabled={submitting || groupsSelectedCount === 0}
              onClick={handleSubmit}
            >
              {submitting
                ? 'Submitting…'
                : campaign.state === 'DRAFT'
                  ? 'Submit & publish'
                  : 'Submit to venues'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </Stack>
        </Box>

        {/* ---- right rail ---- */}
        <Box
          sx={{
            position: { md: 'sticky' },
            top: 24,
            height: 'max-content',
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
              boxShadow: '0 1px 2px rgba(120,90,60,0.06)',
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#F97316',
                mb: 1.5,
              }}
            >
              Coverage
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <Typography
                sx={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: '#1A1816',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {preview ? preview.total_outlets : 0}
              </Typography>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#6B645C',
                  pb: 0.75,
                }}
              >
                outlets
              </Typography>
              {previewLoading && (
                <CircularProgress size={14} sx={{ mb: 1, ml: 1 }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 13, color: '#6B645C', mt: 0.5 }}>
              {preview
                ? `across ${preview.total_cities} cit${
                    preview.total_cities === 1 ? 'y' : 'ies'
                  } · ${preview.total_venues} venue${
                    preview.total_venues === 1 ? '' : 's'
                  }`
                : 'Pick a group to see coverage'}
            </Typography>

            {preview && preview.by_venue.length > 0 && (
              <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #E8E2D7' }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9B948C',
                    mb: 1,
                  }}
                >
                  Outlets by venue
                </Typography>
                {preview.by_venue.map((row) => (
                  <Box
                    key={row.venue_partner_id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid #E8E2D7',
                      '&:last-child': { borderBottom: 'none' },
                      fontSize: 13,
                    }}
                  >
                    <Typography sx={{ color: '#6B645C', fontSize: 13 }}>
                      {venueById[row.venue_partner_id]?.display_name ||
                        row.venue_partner_id}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 13,
                      }}
                    >
                      {row.outlets}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {preview && preview.top_cities.length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E8E2D7' }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9B948C',
                    mb: 1,
                  }}
                >
                  Top cities
                </Typography>
                {preview.top_cities.map((row) => (
                  <Box
                    key={row.city}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid #E8E2D7',
                      '&:last-child': { borderBottom: 'none' },
                      fontSize: 13,
                    }}
                  >
                    <Typography sx={{ color: '#6B645C', fontSize: 13 }}>
                      {row.city}
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 13,
                      }}
                    >
                      {row.outlets}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {preview && preview.exception_count > 0 && (
              <Alert
                severity="warning"
                icon={<WarningAmberIcon />}
                sx={{ mt: 2 }}
              >
                <strong>Heads-up:</strong> {preview.exception_count} outlet
                {preview.exception_count === 1 ? '' : 's'} in your selection
                block one of this ad's categories. They'll fan out as
                per-outlet decisions instead of bulk group approval.
              </Alert>
            )}

            {preview && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E8E2D7' }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9B948C',
                    mb: 1,
                  }}
                >
                  Approval fan-out
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1,
                    borderBottom: '1px solid #E8E2D7',
                    fontSize: 13,
                  }}
                >
                  <Typography sx={{ color: '#6B645C', fontSize: 13 }}>
                    Groups → approvals (today)
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 13,
                    }}
                  >
                    {selectedVenueIds.length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    py: 1,
                    fontSize: 13,
                  }}
                >
                  <Typography sx={{ color: '#6B645C', fontSize: 13 }}>
                    Per-outlet exceptions
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: 13,
                    }}
                  >
                    {preview.exception_count}
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: '#9B948C',
                    mt: 0.5,
                    fontStyle: 'italic',
                  }}
                >
                  Per-group fan-out + exception rows land in Phase 4.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
      <Divider sx={{ mt: 4, opacity: 0 }} />
    </Box>
  );
};

export default CampaignSubmitTargeting;
