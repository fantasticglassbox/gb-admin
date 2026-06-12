/**
 * CampaignEditor — full-page create + edit experience.
 *
 * Three columns of work:
 *   1. Details (title, advertiser, period, categories, description)
 *   2. Expected layout — picker over the 6 platform layouts. Drives
 *      which zones the asset editor surfaces AND the live preview's
 *      rectangles. Empty layout = "fullscreen / I'll decide later"
 *      with one default `main` slot.
 *   3. Per-zone asset uploader, scoped to the chosen layout's zones.
 *
 * Right rail: **live preview** — renders each zone as a positioned
 * rectangle in the layout's geometry, with the assigned asset shown
 * (image thumbnail / video poster / empty slot hint). This is the
 * "how my campaign will run" view the publisher asked for.
 *
 * Used for both /campaigns/new and /campaigns/:campaignId/edit. New
 * mode hides the asset section + preview until the campaign is saved
 * once (assets require an id to POST against).
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
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageIcon from '@mui/icons-material/Image';
import LaunchIcon from '@mui/icons-material/Launch';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import VideocamIcon from '@mui/icons-material/Videocam';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import {
  Advertiser,
  Campaign,
  CampaignAsset,
  CampaignAssetType,
  CreateCampaignAssetRequest,
  Layout,
  LayoutZone,
} from '../types';

const FULLSCREEN_FALLBACK: LayoutZone = {
  slug: 'main',
  x_pct: 0,
  y_pct: 0,
  w_pct: 100,
  h_pct: 100,
  accepts: ['video', 'image'],
};

const CampaignEditor: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = `/${user?.role || 'admin'}`;
  const isCreate = !campaignId;

  // Core data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [layouts, setLayouts] = useState<Layout[]>([]);

  // Client-side staging for assets uploaded BEFORE the campaign exists.
  // In create mode, the asset editor is functional from the first
  // render — files go to S3 immediately, but the asset-row POST is
  // deferred until createCampaign returns an id (then we replay them
  // and route to /edit). Cleared after a successful create.
  const [pendingAssets, setPendingAssets] = useState<CampaignAsset[]>([]);
  const [uploadingZone, setUploadingZone] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [advertiserId, setAdvertiserId] = useState('');
  const [categories, setCategories] = useState('OTHER');
  const [targetLayoutId, setTargetLayoutId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [playingHours, setPlayingHours] = useState('');

  // UI flags
  const [loading, setLoading] = useState(!isCreate);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live-preview controls. Default to paused so the editor doesn't
  // start hammering S3 the moment it mounts.
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewResetTick, setPreviewResetTick] = useState(0);

  // ---- bootstrap ----

  useEffect(() => {
    apiService
      .listAdvertisersV2({ limit: 200 })
      .then((r: any) => setAdvertisers(r.data || []))
      .catch(() => setAdvertisers([]));
    apiService
      .listLayouts()
      .then(setLayouts)
      .catch(() => setLayouts([]));
  }, []);

  useEffect(() => {
    if (isCreate) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await apiService.getCampaign(campaignId!);
        if (cancelled) return;
        setCampaign(c);
        setTitle(c.title);
        setDescription(c.description || '');
        setAdvertiserId(c.advertiser_id || '');
        setCategories(c.categories || 'OTHER');
        setTargetLayoutId(c.target_layout_id || '');
        setPlayingHours(c.playing_hours || '');
        setStartDate((c.published_time_start || '').slice(0, 10));
        setEndDate((c.published_time_end || '').slice(0, 10));
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load campaign');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, isCreate]);

  // ---- derived ----

  const activeLayout = useMemo<Layout | null>(() => {
    if (!targetLayoutId) return null;
    return layouts.find((l) => l.id === targetLayoutId) || null;
  }, [layouts, targetLayoutId]);

  /** Zones to surface in the asset editor + preview. */
  const editableZones = useMemo<LayoutZone[]>(
    () => activeLayout?.zones || [FULLSCREEN_FALLBACK],
    [activeLayout],
  );

  // ---- handlers ----

  const handleSave = async (): Promise<Campaign | null> => {
    if (!title || !startDate || !endDate) {
      setError('Title, start date and end date are required.');
      return null;
    }
    if (isCreate && !advertiserId) {
      setError('Pick an advertiser.');
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        const created = await apiService.createCampaign({
          advertiser_id: advertiserId,
          title,
          description,
          categories,
          target_layout_id: targetLayoutId || undefined,
          playing_hours: playingHours,
          published_time_start: `${startDate}T00:00:00Z`,
          published_time_end: `${endDate}T23:59:59Z`,
        });
        // Commit any client-side-staged assets that were uploaded
        // before the campaign existed. Sequential rather than parallel
        // so sort_order stays deterministic if two slots target the
        // same zone.
        let committed = 0;
        for (const a of pendingAssets) {
          try {
            await apiService.addCampaignAsset(created.id, {
              zone_slug: a.zone_slug,
              content_url: a.content_url,
              content_type: a.content_type,
              duration_seconds: a.duration_seconds,
              sort_order: a.sort_order,
              sha256: a.sha256,
              size_bytes: a.size_bytes,
            });
            committed++;
          } catch (e: any) {
            // Don't bail — best-effort, report the count in the toast
            // so the user knows to retry from the asset grid.
            setError(
              `Some assets failed to attach (${
                pendingAssets.length - committed
              } left). ${e?.response?.data?.error || ''}`.trim(),
            );
          }
        }
        // Refresh the canonical campaign before navigating so the
        // /edit page picks up the committed assets.
        const fresh = await apiService.getCampaign(created.id);
        setCampaign(fresh);
        setPendingAssets([]);
        setSuccess(
          committed > 0
            ? `Campaign created with ${committed} asset${committed === 1 ? '' : 's'}.`
            : 'Campaign created — now add an asset for each zone.',
        );
        navigate(`${basePath}/campaigns/${created.id}/edit`, { replace: true });
        return fresh;
      } else {
        const updated = await apiService.updateCampaign(campaign!.id, {
          title,
          description,
          categories,
          target_layout_id: targetLayoutId || '',
          playing_hours: playingHours,
          published_time_start: `${startDate}T00:00:00Z`,
          published_time_end: `${endDate}T23:59:59Z`,
        });
        setCampaign(updated);
        setSuccess('Campaign updated.');
        return updated;
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Save failed');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!campaign) return;
    setPublishing(true);
    try {
      const updated = await apiService.publishCampaign(campaign.id);
      setCampaign(updated);
      setSuccess('Campaign published. You can submit it to venues next.');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  // ---- asset handlers (shared across create + edit modes) ----

  const displayedAssets: CampaignAsset[] = useMemo(
    () => (campaign ? campaign.assets || [] : pendingAssets),
    [campaign, pendingAssets],
  );

  /** Mints a CampaignAsset-shaped placeholder while we wait for the
   *  real backend row. Same fields the renderer reads; the id prefix
   *  marks it as pending so handlers can branch. */
  const makePendingAsset = (
    payload: CreateCampaignAssetRequest,
  ): CampaignAsset => ({
    id: `pending-${Math.random().toString(36).slice(2)}`,
    campaign_id: '',
    zone_slug: payload.zone_slug,
    content_url: payload.content_url,
    content_type: payload.content_type,
    duration_seconds: payload.duration_seconds ?? 8,
    sort_order: payload.sort_order ?? 0,
    sha256: payload.sha256,
    size_bytes: payload.size_bytes,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const isPending = (a: CampaignAsset) => a.id.startsWith('pending-');

  /** Reads a video file's runtime locally so we don't ship a wrong
   *  duration_seconds to the backend. The browser's <video> element
   *  loads just the metadata (no full download) and exposes `duration`
   *  in seconds. Falls back to a safe default if the codec is exotic
   *  or the file is malformed — better than blocking the upload. */
  const probeVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      const url = URL.createObjectURL(file);
      const done = (sec: number) => {
        URL.revokeObjectURL(url);
        resolve(sec);
      };
      v.onloadedmetadata = () => {
        const d = v.duration;
        done(Number.isFinite(d) && d > 0 ? Math.round(d) : 10);
      };
      v.onerror = () => done(10);
      v.src = url;
    });

  /** Upload to S3 and either POST an asset row (edit mode) or stage
   *  client-side (create mode). The page-level state owns this so the
   *  asset section is functional from the very first render of a new
   *  campaign — no "save first" hand-waving. */
  const handleUpload = useCallback(
    async (file: File, zoneSlug: string) => {
      setUploadingZone(zoneSlug);
      try {
        const up: any = await apiService.uploadFile(file);
        const contentType: CampaignAssetType =
          file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';
        // Auto-probe video duration from file metadata so the safety
        // watchdog in gb-media (= duration + 30s) doesn't truncate a
        // long video. Images keep the 8s default — publishers edit it
        // inline if they want a different dwell.
        const detected =
          contentType === 'VIDEO' ? await probeVideoDuration(file) : 8;
        const sortBase = displayedAssets.filter(
          (a) => a.zone_slug === zoneSlug,
        ).length;
        const payload: CreateCampaignAssetRequest = {
          zone_slug: zoneSlug,
          content_url: up.url,
          content_type: contentType,
          duration_seconds: detected,
          sort_order: sortBase,
          sha256: up.sha256 || '',
          size_bytes: up.size_bytes || 0,
        };
        if (campaign) {
          await apiService.addCampaignAsset(campaign.id, payload);
          const fresh = await apiService.getCampaign(campaign.id);
          setCampaign(fresh);
        } else {
          setPendingAssets((prev) => [...prev, makePendingAsset(payload)]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Upload failed');
      } finally {
        setUploadingZone(null);
      }
    },
    [campaign, displayedAssets],
  );

  const handleRemoveAsset = useCallback(
    async (asset: CampaignAsset) => {
      if (!window.confirm(`Remove this asset from zone "${asset.zone_slug}"?`))
        return;
      try {
        if (isPending(asset)) {
          setPendingAssets((prev) => prev.filter((a) => a.id !== asset.id));
          return;
        }
        if (campaign) {
          await apiService.deleteCampaignAsset(campaign.id, asset.id);
          const fresh = await apiService.getCampaign(campaign.id);
          setCampaign(fresh);
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Delete failed');
      }
    },
    [campaign],
  );

  /** Persist a duration_seconds edit. Staged (pre-create) assets get
   *  patched in-place; saved assets PUT to the asset endpoint and
   *  the campaign is re-fetched so the version + updated_at bumps
   *  surface immediately. */
  const handleUpdateDuration = useCallback(
    async (asset: CampaignAsset, seconds: number) => {
      try {
        if (isPending(asset)) {
          setPendingAssets((prev) =>
            prev.map((a) =>
              a.id === asset.id ? { ...a, duration_seconds: seconds } : a,
            ),
          );
          return;
        }
        if (!campaign) return;
        await apiService.updateCampaignAsset(campaign.id, asset.id, {
          zone_slug: asset.zone_slug,
          content_url: asset.content_url,
          content_type: asset.content_type,
          duration_seconds: seconds,
          sort_order: asset.sort_order,
          sha256: asset.sha256,
          size_bytes: asset.size_bytes,
        });
        const fresh = await apiService.getCampaign(campaign.id);
        setCampaign(fresh);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Update failed');
      }
    },
    [campaign],
  );

  const refreshAssets = useCallback(async () => {
    if (!campaign) return;
    try {
      const fresh = await apiService.getCampaign(campaign.id);
      setCampaign(fresh);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Refresh failed');
    }
  }, [campaign]);

  // ---- render ----

  if (loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Button
        onClick={() => navigate(`${basePath}/campaigns`)}
        sx={{ color: '#0773a3', mb: 1, textTransform: 'none' }}
      >
        ← Campaigns
      </Button>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-end' }} sx={{ mb: 3 }}>
        <Box>
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
            {isCreate ? 'New campaign' : 'Edit campaign'}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1816' }}>
            {title || (isCreate ? 'Untitled campaign' : '')}
          </Typography>
          {campaign && (
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Chip
                label={campaign.state}
                size="small"
                color={
                  campaign.state === 'PUBLISHED'
                    ? 'success'
                    : campaign.state === 'REJECTED'
                    ? 'error'
                    : 'default'
                }
              />
              {activeLayout && (
                <Chip
                  label={`Layout · ${activeLayout.display_name}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <Chip
                label={`${campaign.assets?.length || 0} asset${
                  (campaign.assets?.length || 0) === 1 ? '' : 's'
                }`}
                size="small"
                variant="outlined"
              />
            </Stack>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: { xs: 2, md: 0 } }}>
          {campaign?.state === 'DRAFT' && (campaign.assets?.length || 0) > 0 && (
            <Button
              variant="outlined"
              startIcon={<LaunchIcon />}
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? 'Publishing…' : 'Publish'}
            </Button>
          )}
          {campaign?.state === 'PUBLISHED' && (campaign.assets?.length || 0) > 0 && (
            <Button
              variant="outlined"
              startIcon={<SendIcon />}
              onClick={() =>
                navigate(`${basePath}/campaigns/${campaign.id}/submit`)
              }
            >
              Submit to venues
            </Button>
          )}
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isCreate ? 'Create campaign' : 'Save changes'}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 420px' },
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        {/* ---- left column: details + layout + assets ---- */}
        <Box>
          {/* Details */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <SectionTitle>Details</SectionTitle>
            <Stack spacing={2}>
              <TextField
                label="Title"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {isCreate ? (
                <FormControl fullWidth>
                  <InputLabel>Advertiser</InputLabel>
                  <Select
                    value={advertiserId}
                    label="Advertiser"
                    onChange={(e) => setAdvertiserId(e.target.value as string)}
                  >
                    {advertisers.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="Advertiser"
                  fullWidth
                  value={
                    advertisers.find((a) => a.id === advertiserId)?.display_name ||
                    advertiserId
                  }
                  disabled
                  helperText="Advertiser cannot be changed after creation"
                />
              )}
              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <TextField
                label="Categories (CSV)"
                fullWidth
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                helperText="e.g. FNB, BEAUTY"
              />
              <Stack direction="row" spacing={2}>
                <TextField
                  label="Start"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <TextField
                  label="End"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Stack>
            </Stack>
          </Paper>

          {/* Playing hours */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <SectionTitle>Playing hours</SectionTitle>
            <Typography sx={{ fontSize: 13, color: '#6B645C', mb: 2 }}>
              When during the day this campaign is eligible to play. The
              outer date range above is the campaign's whole booking
              window; this is the per-day slot inside it. Devices apply
              their own local clock when evaluating.
            </Typography>
            <PlayingHoursEditor
              value={playingHours}
              onChange={setPlayingHours}
            />
          </Paper>

          {/* Expected layout */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <SectionTitle>Expected layout</SectionTitle>
            <Typography sx={{ fontSize: 13, color: '#6B645C', mb: 2 }}>
              Pick the layout your campaign is designed for. The editor below
              will surface one slot per zone and the preview shows how it'll
              play. You can change this at any time before publishing.
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
                gap: 1.5,
              }}
            >
              <LayoutOption
                label="Fullscreen (default)"
                slug="—"
                zones={[FULLSCREEN_FALLBACK]}
                selected={!targetLayoutId}
                onSelect={() => setTargetLayoutId('')}
              />
              {layouts.map((l) => (
                <LayoutOption
                  key={l.id}
                  label={l.display_name}
                  slug={l.slug}
                  zones={l.zones}
                  selected={targetLayoutId === l.id}
                  onSelect={() => setTargetLayoutId(l.id)}
                />
              ))}
            </Box>
          </Paper>

          {/* Assets — fully functional from first render in create mode.
              Uploads stream to S3 immediately and stage client-side; on
              first Save the staged rows attach to the new campaign. */}
          <Paper variant="outlined" sx={{ p: 3, mb: 2, borderRadius: 3 }}>
            <SectionTitle>
              Assets by zone — {activeLayout?.display_name || 'fullscreen'}
            </SectionTitle>
            <Typography sx={{ fontSize: 13, color: '#6B645C', mb: 2 }}>
              One creative per zone. Files upload to S3 right away;
              SHA-256 + size are stamped for cache validation on the
              player. {isCreate &&
                'Uploads here will be attached to the campaign when you click Create.'}
            </Typography>
            <AssetGrid
              zones={editableZones}
              assets={displayedAssets}
              uploadingZone={uploadingZone}
              onUpload={handleUpload}
              onRemove={handleRemoveAsset}
              onDurationChange={handleUpdateDuration}
            />
          </Paper>
        </Box>

        {/* ---- right rail: live preview ---- */}
        <Box sx={{ position: { md: 'sticky' }, top: 24 }}>
          <Paper
            variant="outlined"
            sx={{ p: 3, borderRadius: 3, boxShadow: '0 1px 2px rgba(120,90,60,0.06)' }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#F97316',
                }}
              >
                Live preview
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Tooltip title={previewPlaying ? 'Pause' : 'Play'}>
                  <IconButton
                    size="small"
                    onClick={() => setPreviewPlaying((p) => !p)}
                    disabled={(campaign?.assets?.length || 0) === 0}
                  >
                    {previewPlaying ? (
                      <PauseIcon fontSize="small" />
                    ) : (
                      <PlayArrowIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Restart from beginning">
                  <IconButton
                    size="small"
                    onClick={() => setPreviewResetTick((t) => t + 1)}
                    disabled={(campaign?.assets?.length || 0) === 0}
                  >
                    <ReplayIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
            <Typography sx={{ fontSize: 13, color: '#6B645C', mb: 2 }}>
              {activeLayout
                ? `${activeLayout.display_name} · ${activeLayout.zones.length} zone${
                    activeLayout.zones.length === 1 ? '' : 's'
                  }`
                : 'Fullscreen (single main zone)'}
            </Typography>
            <PreviewStage
              zones={editableZones}
              assets={campaign?.assets || []}
              playing={previewPlaying}
              resetTick={previewResetTick}
            />
            <Typography
              sx={{
                fontSize: 11,
                color: '#9B948C',
                mt: 1.5,
                textAlign: 'center',
              }}
            >
              16:9 aspect · videos muted in preview · zones rotate per
              asset duration
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

// ---- bits ----

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
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
    {children}
  </Typography>
);

interface LayoutOptionProps {
  label: string;
  slug: string;
  zones: LayoutZone[];
  selected: boolean;
  onSelect: () => void;
}

const LayoutOption: React.FC<LayoutOptionProps> = ({
  label,
  slug,
  zones,
  selected,
  onSelect,
}) => (
  <Box
    role="radio"
    aria-checked={selected}
    tabIndex={0}
    onClick={onSelect}
    onKeyDown={(e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onSelect();
      }
    }}
    sx={{
      cursor: 'pointer',
      borderRadius: 2,
      border: selected ? '2px solid #0BA6DF' : '1px solid #E8E2D7',
      p: 1.25,
      background: selected ? '#E0F4FF' : 'white',
      transition: 'all 120ms',
      '&:hover': { borderColor: '#0BA6DF' },
    }}
  >
    <Box sx={{ aspectRatio: '16 / 9', position: 'relative', mb: 1, background: '#FAF7F2', borderRadius: 1, overflow: 'hidden' }}>
      {zones.map((z, i) => (
        <Box
          key={`${z.slug}-${i}`}
          sx={{
            position: 'absolute',
            left: `${z.x_pct}%`,
            top: `${z.y_pct}%`,
            width: `${z.w_pct}%`,
            height: `${z.h_pct}%`,
            background: COLOR_FOR_ZONE(z.slug, 0.25),
            border: '1px solid rgba(11,166,223,0.5)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#0773a3',
            fontFamily: 'monospace',
          }}
        >
          {z.slug}
        </Box>
      ))}
    </Box>
    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1A1816' }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 11, color: '#9B948C', fontFamily: 'monospace' }}>
      {slug}
    </Typography>
  </Box>
);

/** Tiny editable seconds field. Local-state edit, commit-on-blur so the
 *  publisher can type "12" without the editor PATCHing on every digit.
 *  Guards against 0 / negative / NaN — those would either lock the
 *  player on a frame or trigger the safety watchdog. */
const DurationField: React.FC<{
  asset: CampaignAsset;
  onChange: (seconds: number) => void | Promise<void>;
}> = ({ asset, onChange }) => {
  const [draft, setDraft] = useState(String(asset.duration_seconds || ''));
  useEffect(() => {
    setDraft(String(asset.duration_seconds || ''));
  }, [asset.duration_seconds]);
  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(String(asset.duration_seconds || ''));
      return;
    }
    if (parsed === asset.duration_seconds) return;
    void onChange(parsed);
  };
  return (
    <TextField
      size="small"
      type="number"
      label="sec"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      inputProps={{ min: 1, max: 600, step: 1, style: { textAlign: 'right' } }}
      sx={{ width: 86 }}
    />
  );
};

interface AssetGridProps {
  zones: LayoutZone[];
  assets: CampaignAsset[];
  uploadingZone: string | null;
  onUpload: (file: File, zoneSlug: string) => Promise<void>;
  onRemove: (asset: CampaignAsset) => Promise<void>;
  // Persist a new duration_seconds for an existing asset. Editor wires
  // this to apiService.updateCampaignAsset; staged (pre-save) assets
  // get patched in-place on the page-level state. Lets publishers
  // override the auto-probed video runtime or set a non-default image
  // dwell without re-uploading.
  onDurationChange: (asset: CampaignAsset, seconds: number) => Promise<void>;
}

const AssetGrid: React.FC<AssetGridProps> = ({
  zones,
  assets,
  uploadingZone,
  onUpload,
  onRemove,
  onDurationChange,
}) => {
  const grouped = useMemo(() => {
    const m: Record<string, CampaignAsset[]> = {};
    assets.forEach((a) => {
      (m[a.zone_slug] = m[a.zone_slug] || []).push(a);
    });
    return m;
  }, [assets]);

  return (
    <Stack spacing={1.5}>
      {zones.map((z) => {
        const items = grouped[z.slug] || [];
        return (
          <Paper
            key={z.slug}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: items.length ? 'background.paper' : '#FAF7F2',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {z.slug}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {z.w_pct.toFixed(0)}% × {z.h_pct.toFixed(0)}% of viewport
                  {z.accepts?.length ? ` · accepts ${z.accepts.join(' / ')}` : ''}
                </Typography>
              </Box>
              <Button
                component="label"
                size="small"
                variant="outlined"
                startIcon={
                  uploadingZone === z.slug ? (
                    <CircularProgress size={14} />
                  ) : (
                    <AddIcon />
                  )
                }
                disabled={uploadingZone !== null}
              >
                {uploadingZone === z.slug ? 'Uploading…' : 'Add asset'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f, z.slug);
                    e.target.value = '';
                  }}
                />
              </Button>
            </Stack>
            {items.map((a) => (
              <Stack
                key={a.id}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: 1,
                  borderRadius: 1,
                  border: '1px solid #E8E2D7',
                  bgcolor: 'background.paper',
                  mt: 1,
                }}
              >
                {a.content_type === 'VIDEO' ? (
                  <VideocamIcon color="primary" />
                ) : (
                  <ImageIcon color="secondary" />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', fontSize: 12 }}
                    noWrap
                  >
                    {a.content_url}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {a.content_type} · v{a.version || 1}
                  </Typography>
                </Box>
                <DurationField
                  asset={a}
                  onChange={(sec) => onDurationChange(a, sec)}
                />
                <Tooltip title="Remove">
                  <IconButton size="small" onClick={() => onRemove(a)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Paper>
        );
      })}
    </Stack>
  );
};

interface PreviewStageProps {
  zones: LayoutZone[];
  assets: CampaignAsset[];
  /** When true, each zone rotates through its assets per duration_seconds
   *  and videos auto-play. When false, the first asset of each zone is
   *  shown statically. */
  playing: boolean;
  /** Bumped to reset every zone's rotation back to index 0. */
  resetTick: number;
}

const PreviewStage: React.FC<PreviewStageProps> = ({
  zones,
  assets,
  playing,
  resetTick,
}) => {
  const byZone = useMemo(() => {
    const m: Record<string, CampaignAsset[]> = {};
    assets.forEach((a) => {
      (m[a.zone_slug] = m[a.zone_slug] || []).push(a);
    });
    return m;
  }, [assets]);

  return (
    <Box
      sx={{
        aspectRatio: '16 / 9',
        background: '#1A1816',
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05)',
      }}
    >
      {zones.map((z, i) => {
        const items = byZone[z.slug] || [];
        const filled = items.length > 0;
        return (
          <Box
            key={`${z.slug}-${i}`}
            sx={{
              position: 'absolute',
              left: `${z.x_pct}%`,
              top: `${z.y_pct}%`,
              width: `${z.w_pct}%`,
              height: `${z.h_pct}%`,
              // Hard outline on every zone so the layout's geometry is
              // legible even when zones are empty (previously they
              // looked like content bleed).
              outline: '1px solid rgba(255,255,255,0.15)',
              outlineOffset: '-1px',
              // Use the deterministic per-slug colour as the empty-zone
              // background so an unfilled zone reads as "intentionally
              // pending" instead of "broken".
              background: filled
                ? '#000'
                : COLOR_FOR_ZONE(z.slug, 0.55),
              overflow: 'hidden',
            }}
          >
            {filled ? (
              <ZonePlayer
                zoneSlug={z.slug}
                items={items}
                playing={playing}
                resetTick={resetTick}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                    }}
                  >
                    {z.slug}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 10, opacity: 0.85, mt: 0.5 }}
                  >
                    no asset yet
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Slug badge — always visible so the user can tell which
                zone is which while video is playing, and it survives
                the cover-cropped image without obscuring much. */}
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                left: 4,
                bgcolor: 'rgba(0,0,0,0.55)',
                color: 'white',
                fontSize: 9,
                fontWeight: 700,
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                fontFamily: 'monospace',
                letterSpacing: '0.06em',
                pointerEvents: 'none',
              }}
            >
              {z.slug}
            </Box>

            {items.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 700,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: 0.5,
                  pointerEvents: 'none',
                }}
              >
                +{items.length - 1} more
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

interface ZonePlayerProps {
  zoneSlug: string;
  items: CampaignAsset[];
  playing: boolean;
  resetTick: number;
}

/**
 * Per-zone rotation in the preview stage. Mirrors the gb-media
 * ZoneRenderer's responsibilities at a much smaller scale:
 *   - Cycle through `items` in order using each asset's
 *     `duration_seconds` for images and the `onEnded` event for videos.
 *   - When `playing` is false, freeze on the current index but keep
 *     the rendered content (so toggling to play doesn't blink).
 *   - A bump on `resetTick` returns every zone to index 0 — the
 *     restart-from-beginning button on the preview controls.
 */
const ZonePlayer: React.FC<ZonePlayerProps> = ({
  zoneSlug,
  items,
  playing,
  resetTick,
}) => {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // External reset.
  useEffect(() => {
    setIndex(0);
  }, [resetTick]);

  // Restart from 0 whenever the items list changes (zone slug edits,
  // delete, new upload).
  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  const advance = useCallback(() => {
    setIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
  }, [items.length]);

  // Image timer. Videos advance on their own `onEnded` event so we
  // skip the timer for them; videos keep a safety fallback the same
  // way ZoneRenderer does on the player.
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!playing || items.length === 0) return;
    const current = items[index % items.length];
    if (!current) return;
    const seconds =
      current.duration_seconds > 0
        ? current.duration_seconds
        : current.content_type === 'IMAGE'
        ? 8
        : 30;
    const safetyExtra = current.content_type === 'VIDEO' ? 5 : 0;
    timerRef.current = setTimeout(
      advance,
      (seconds + safetyExtra) * 1000,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, items, index, advance]);

  if (items.length === 0) return null;
  const current = items[index % items.length];

  if (current.content_type === 'IMAGE') {
    return (
      <Box
        component="img"
        src={current.content_url}
        alt={zoneSlug}
        sx={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    );
  }

  return (
    <Box
      component="video"
      key={current.id /* force reload when index changes */}
      src={current.content_url}
      autoPlay={playing}
      muted
      playsInline
      onEnded={advance}
      sx={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        bgcolor: 'black',
      }}
    />
  );
};

// ---- playing-hours editor ----

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

interface DayWindow {
  on: boolean;
  start: string;
  end: string;
}

const parsePlayingHours = (csv: string): Record<string, DayWindow> => {
  const out: Record<string, DayWindow> = {};
  DAYS.forEach((d) => (out[d.key] = { on: false, start: '08:00', end: '22:00' }));
  if (!csv) return out;
  csv.split(',').forEach((part) => {
    const eq = part.indexOf('=');
    if (eq <= 0) return;
    const day = part.slice(0, eq).trim().toLowerCase();
    const window = part.slice(eq + 1).trim();
    const dash = window.indexOf('-');
    if (dash <= 0) return;
    const start = window.slice(0, dash).trim();
    const end = window.slice(dash + 1).trim();
    if (out[day]) {
      out[day] = { on: true, start, end };
    }
  });
  return out;
};

const serialisePlayingHours = (
  perDay: Record<string, DayWindow>,
): string =>
  DAYS.filter((d) => perDay[d.key]?.on)
    .map((d) => `${d.key}=${perDay[d.key].start}-${perDay[d.key].end}`)
    .join(',');

interface PlayingHoursEditorProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Playing-hours editor.
 *
 * Two states:
 *   - "All day, every day" (empty CSV — default for new campaigns).
 *     One switch enables the per-day grid; flipping it back wipes the
 *     CSV.
 *   - Per-day grid with on/off switch + start/end time pickers. When
 *     a day is off, the row is greyed and that day is dark.
 *
 * Persisted CSV format matches the backend exactly so no
 * client-side translation logic drifts.
 */
const PlayingHoursEditor: React.FC<PlayingHoursEditorProps> = ({
  value,
  onChange,
}) => {
  const allDay = !value;
  const perDay = useMemo(() => parsePlayingHours(value), [value]);

  const setAllDay = (on: boolean) => {
    if (on) {
      onChange('');
    } else {
      // Bootstrap a sensible default — every day 08:00-22:00.
      const seed: Record<string, DayWindow> = {};
      DAYS.forEach(
        (d) => (seed[d.key] = { on: true, start: '08:00', end: '22:00' }),
      );
      onChange(serialisePlayingHours(seed));
    }
  };

  const updateDay = (day: string, patch: Partial<DayWindow>) => {
    const next = { ...perDay, [day]: { ...perDay[day], ...patch } };
    onChange(serialisePlayingHours(next));
  };

  return (
    <Box>
      <FormControlLabel
        control={
          <Switch
            checked={allDay}
            onChange={(_, on) => setAllDay(on)}
          />
        }
        label={
          <Typography sx={{ fontWeight: 600 }}>
            All day, every day (24/7)
          </Typography>
        }
        sx={{ mb: 1 }}
      />
      {!allDay && (
        <Stack
          spacing={0.75}
          sx={{
            p: 1.5,
            border: '1px solid #E8E2D7',
            borderRadius: 2,
            bgcolor: '#FAF7F2',
          }}
        >
          {DAYS.map((d) => {
            const w = perDay[d.key];
            return (
              <Stack
                key={d.key}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  py: 0.75,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: w.on ? 'background.paper' : 'transparent',
                  opacity: w.on ? 1 : 0.55,
                }}
              >
                <Switch
                  size="small"
                  checked={w.on}
                  onChange={(_, on) => updateDay(d.key, { on })}
                />
                <Typography
                  sx={{ width: 96, fontWeight: 600, fontSize: 13 }}
                >
                  {d.label}
                </Typography>
                <TextField
                  type="time"
                  size="small"
                  value={w.start}
                  disabled={!w.on}
                  onChange={(e) => updateDay(d.key, { start: e.target.value })}
                  inputProps={{ step: 300 }}
                  sx={{ width: 120 }}
                />
                <Typography
                  sx={{ color: '#9B948C', fontFamily: 'monospace' }}
                >
                  →
                </Typography>
                <TextField
                  type="time"
                  size="small"
                  value={w.end}
                  disabled={!w.on}
                  onChange={(e) => updateDay(d.key, { end: e.target.value })}
                  inputProps={{ step: 300 }}
                  sx={{ width: 120 }}
                />
              </Stack>
            );
          })}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, ml: 1 }}
          >
            Single window per day. For split slots (e.g. lunch + dinner),
            run two campaigns with the same creative.
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

// Deterministic colour per zone slug — keeps preview rectangles
// readable when multiple zones share the stage.
const COLOR_FOR_ZONE = (slug: string, alpha = 1): string => {
  const palette = [
    `rgba(11,166,223,${alpha})`,   // sky
    `rgba(249,115,22,${alpha})`,   // accent
    `rgba(22,163,74,${alpha})`,    // green
    `rgba(168,85,247,${alpha})`,   // purple
    `rgba(234,179,8,${alpha})`,    // amber
  ];
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export default CampaignEditor;
