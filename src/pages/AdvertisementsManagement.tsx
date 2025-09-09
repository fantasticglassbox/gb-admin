import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TablePagination,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  Avatar,
  IconButton,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Campaign as AdIcon,
  PauseCircle as PauseIcon,
  CheckCircle as CompleteIcon,
  Visibility as ViewIcon,
  Publish as PublishIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  ViewList as ListViewIcon,
  ViewModule as GridViewIcon,
  PlayArrow as PlayArrowIcon,
  Fullscreen as FullscreenIcon,
  PlayCircle as PlayIcon,
  CheckCircle,
  Cancel,
  Pause,
} from '@mui/icons-material';
import { Advertisement, CreateAdvertisementRequest, Partner, Merchant, FilterOptions, AssignAds } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AdvertisementsManagement: React.FC = () => {
  const { hasRole, user } = useAuth();
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // View states
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'view' | 'publish'>('list');
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);
  const [publishingAds, setPublishingAds] = useState<Set<string>>(new Set());
  const [unpublishingAds, setUnpublishingAds] = useState<Set<string>>(new Set());
  const [selectedMerchantsForPublish, setSelectedMerchantsForPublish] = useState<string[]>([]);
  const [merchantSearchTerm, setMerchantSearchTerm] = useState('');
  const [listViewMode, setListViewMode] = useState<'grid' | 'list'>('grid');
  
  // Form states (only when creating/editing)
  const [formData, setFormData] = useState<CreateAdvertisementRequest>({
    title: '',
    description: '',
    content: '',
    type: '',
    categories: [] as string[],
    duration: undefined,
    published_time_start: '',
    published_time_end: '',
    // Legacy fields
    name: '',
    image_url: '',
    video_url: '',
    merchant_ids: [],
    start_date: '',
    end_date: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, searchTerm, statusFilter]);

  useEffect(() => {
    loadMerchants();
    loadPartners();
    loadCategories();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: FilterOptions = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }

      if (statusFilter) {
        filters.status = statusFilter;
      }

      let allAds: any[] = [];
      let filteredAds: any[] = [];
      let totalCount = 0;

      if (hasRole('merchant')) {
        // Merchants: Use dedicated merchant ads endpoint
        try {
          allAds = await apiService.getMerchantAdvertisements();
        } catch (err) {
          console.warn('Failed to load merchant advertisements:', err);
          allAds = [];
        }
      } else {
        // Admin & Partner: Use general advertisements list endpoint
        // Backend automatically filters by tid (partner_id for partners, all ads for admin)
        const response = await apiService.getAdvertisements(filters);
        allAds = response.data;
      }
      
      // Apply client-side filtering since backend doesn't support it yet
      filteredAds = allAds.filter(ad => {
        // Search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchesTitle = ad.title?.toLowerCase().includes(searchLower);
          const matchesDescription = ad.description?.toLowerCase().includes(searchLower);
          const matchesCategories = ad.categories?.toLowerCase().includes(searchLower);
          
          if (!matchesTitle && !matchesDescription && !matchesCategories) {
            return false;
          }
        }
        
        // Status filter
        if (statusFilter) {
          if (ad.state !== statusFilter) {
            return false;
          }
        }
        
        return true;
      });
      
      // Apply pagination client-side
      totalCount = filteredAds.length;
      const startIndex = page * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      filteredAds = filteredAds.slice(startIndex, endIndex);
      
      setAdvertisements(filteredAds);
      setTotalCount(totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  };


  const loadCategories = async () => {
    try {
      const response = await apiService.getAdvertisementCategories();
      
      if (Array.isArray(response)) {
        setCategories(response);
      } else if (response && typeof response === 'object' && Array.isArray((response as any).data)) {
        setCategories((response as any).data);
      } else {
        // Fallback to default categories
        setCategories(['FOOD', 'RETAIL', 'BEAUTY', 'ENTERTAINMENT', 'SERVICE', 'TECHNOLOGY', 'HEALTH', 'EDUCATION']);
      }
    } catch (err: any) {
      console.error('Failed to load categories:', err);
      // Fallback to default categories if API is not available
      setCategories(['FOOD', 'RETAIL', 'BEAUTY', 'ENTERTAINMENT', 'SERVICE', 'TECHNOLOGY', 'HEALTH', 'EDUCATION']);
    }
  };

  const loadMerchants = async () => {
    try {
      const response = await apiService.getMerchants();
      setMerchants(response.data);
    } catch (err: any) {
      console.error('Failed to load merchants:', err);
    }
  };

  const loadPartners = async () => {
    try {
      const response = await apiService.getPartners();
      setPartners(response.data);
    } catch (err: any) {
      console.error('Failed to load partners:', err);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleCreateAd = () => {
    setViewMode('create');
    setSelectedAd(null);
    setError(null);
    setSuccess(null);
    setFormData({
      title: '',
      description: '',
      content: '',
      type: '',
      categories: [],
      duration: undefined,
      published_time_start: '',
      published_time_end: '',
      // Legacy fields
      name: '',
      image_url: '',
      video_url: '',
      merchant_ids: [],
      start_date: '',
      end_date: '',
    });
    setFormErrors({});
  };

  const handleEditAd = (ad: Advertisement) => {
    setViewMode('edit');
    setSelectedAd(ad);
    setError(null);
    setSuccess(null);
    
    // Auto-detect content type if not specified and normalize to uppercase
    let detectedType = ad.type ? ad.type.toUpperCase() : '';
    if (!detectedType && ad.content) {
      if (ad.content.toLowerCase().includes('.mp4') || ad.content.toLowerCase().includes('.mov') || ad.content.toLowerCase().includes('.avi')) {
        detectedType = 'VIDEO';
      } else if (ad.content.toLowerCase().includes('.jpg') || ad.content.toLowerCase().includes('.png') || ad.content.toLowerCase().includes('.gif')) {
        detectedType = 'IMAGE';
      }
    }
    // Fallback to legacy fields
    if (!detectedType) {
      if (ad.video_url) detectedType = 'VIDEO';
      else if (ad.image_url) detectedType = 'IMAGE';
    }

    // Convert datetime to date format for form inputs
    const formatDateForInput = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return dateStr.split('T')[0] || dateStr;
      }
    };

    setFormData({
      title: ad.title || ad.name || '',
      description: ad.description || '',
      content: ad.content || ad.image_url || ad.video_url || '',
      type: detectedType,
      categories: ad.categories ? (typeof ad.categories === 'string' ? ad.categories.split(',').map(c => c.trim()) : ad.categories) : [],
      duration: ad.duration,
      published_time_start: formatDateForInput(ad.published_time_start || ad.start_date || ''),
      published_time_end: formatDateForInput(ad.published_time_end || ad.end_date || ''),
      // Legacy fields
      name: ad.name || '',
      image_url: ad.image_url || '',
      video_url: ad.video_url || '',
      merchant_ids: ad.merchant_ids || [],
      start_date: formatDateForInput(ad.start_date || ad.published_time_start || ''),
      end_date: formatDateForInput(ad.end_date || ad.published_time_end || ''),
    });
    setFormErrors({});
  };

  const handleViewAd = (ad: Advertisement) => {
    setViewMode('view');
    setSelectedAd(ad);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      // Auto-detect content type based on file
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      let detectedDuration: number | undefined;
      
      // Auto-detect video duration
      if (isVideo) {
        try {
          detectedDuration = await getVideoDuration(file);
        } catch (durationError) {
          console.warn('Failed to detect video duration:', durationError);
          // Continue with upload even if duration detection fails
        }
      }

      const response = await apiService.uploadFile(file);
      
      setFormData({ 
        ...formData, 
        content: response.url,
        type: isVideo ? 'VIDEO' : isImage ? 'IMAGE' : formData.type,
        duration: detectedDuration || formData.duration
      });
      
      // Show success feedback
      if (isVideo && detectedDuration) {
        console.log(`Video duration auto-detected: ${detectedDuration} seconds`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        resolve(duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };


  const handleCompleteAd = async (ad: Advertisement) => {
    try {
      await apiService.completeAdvertisement(ad.id);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete advertisement');
    }
  };





  const handleConfirmPublish = async () => {
    if (!selectedAd || selectedMerchantsForPublish.length === 0) {
      setError('Please select at least one merchant to publish to');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setPublishingAds(prev => new Set(prev).add(selectedAd.id));
      
      await apiService.publishAdvertisement(selectedAd.id, selectedMerchantsForPublish);
      setViewMode('list');
      setSelectedAd(null);
      setSelectedMerchantsForPublish([]);
      await loadData();
      setSuccess(`Advertisement "${selectedAd.title || selectedAd.name || 'Untitled'}" has been published successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to publish advertisement');
    } finally {
      setPublishingAds(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedAd.id);
        return newSet;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.title || !formData.title.trim()) {
      errors.title = 'Advertisement title is required';
    }


    if (!formData.published_time_start) {
      errors.published_time_start = 'Publication start date is required';
    }

    if (!formData.published_time_end) {
      errors.published_time_end = 'Publication end date is required';
    }

    // Validate that end date is after start date
    if (formData.published_time_start && formData.published_time_end) {
      const startDate = new Date(formData.published_time_start);
      const endDate = new Date(formData.published_time_end);
      if (endDate <= startDate) {
        errors.published_time_end = 'End date must be after start date';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      // Convert date to datetime format for API
      const formatDateTimeForAPI = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          // If it's already in datetime format, return as is
          if (dateStr.includes('T')) return dateStr;
          // Convert date to datetime with start of day
          const date = new Date(dateStr + 'T00:00:00.000Z');
          return date.toISOString();
        } catch {
          return '';
        }
      };
      
      // Convert categories array to comma-separated string for API
      const submitData = {
        ...formData,
        categories: Array.isArray(formData.categories) 
          ? formData.categories.join(',') 
          : formData.categories,
        published_time_start: formatDateTimeForAPI(formData.published_time_start || ''),
        published_time_end: formatDateTimeForAPI(formData.published_time_end || ''),
        // Also convert legacy fields if they exist
        start_date: formatDateTimeForAPI(formData.start_date || ''),
        end_date: formatDateTimeForAPI(formData.end_date || ''),
      };
      
      if (viewMode === 'create') {
        await apiService.createAdvertisement(submitData);
      } else if (selectedAd) {
        await apiService.updateAdvertisement(selectedAd.id, submitData);
      }

      handleBackToList();
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save advertisement');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'success';
      case 'draft':
        return 'default';
      case 'rejected':
        return 'error';
      case 'inactive':
        return 'warning';
      // Legacy status support
      case 'active':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    return partner?.name || 'Unknown Partner';
  };

  const getMerchantNames = (merchantIds: string[]) => {
    if (!merchantIds || merchantIds.length === 0) return 'All Merchants';
    
    const names = merchantIds.map(id => {
      const merchant = merchants.find(m => m.id === id);
      return merchant?.name || 'Unknown';
    });
    
    return names.join(', ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getContentType = (ad: Advertisement): 'image' | 'video' | 'none' => {
    // Check new API format first (uppercase)
    if (ad.type === 'VIDEO') return 'video';
    if (ad.type === 'IMAGE') return 'image';
    // Check lowercase for backward compatibility
    if (ad.type === 'video') return 'video';
    if (ad.type === 'image') return 'image';
    // Fallback to legacy fields
    if (ad.video_url) return 'video';
    if (ad.image_url) return 'image';
    return 'none';
  };

  const getContentThumbnail = (ad: Advertisement) => {
    const contentType = getContentType(ad);
    
    // For images, use the content URL directly
    if (contentType === 'image') {
      return ad.content || ad.image_url || null;
    }
    
    // For videos, only use image_url as thumbnail (not the video content itself)
    if (contentType === 'video') {
      return ad.image_url || null; // Only return image_url for video thumbnails
    }
    
    return null;
  };

  const getContentIcon = (ad: Advertisement) => {
    const contentType = getContentType(ad);
    switch (contentType) {
      case 'video':
        return <VideoIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'image':
        return <ImageIcon sx={{ fontSize: 40, color: 'primary.main' }} />;
      default:
        return <AdIcon sx={{ fontSize: 40, color: 'text.secondary' }} />;
    }
  };

  // Action handlers for advertisement state management
  const handlePublishAd = (ad: Advertisement) => {
    // Navigate to publish view with merchant selection
    setViewMode('publish');
    setSelectedAd(ad);
    setSelectedMerchantsForPublish([]);
    setError(null);
    setSuccess(null);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAd(null);
    setError(null);
    setSuccess(null);
  };

  const handleUnpublishAd = async (ad: Advertisement) => {
    try {
      setError(null);
      setSuccess(null);
      await apiService.unpublishAdvertisement(ad.id);
      await loadData();
      setSuccess(`Advertisement "${ad.title || ad.name || 'Untitled'}" has been unpublished successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to unpublish advertisement');
    }
  };

  const handleRejectAd = async (ad: Advertisement) => {
    try {
      setError(null);
      setSuccess(null);
      await apiService.rejectAdvertisement(ad.id);
      await loadData();
      setSuccess(`Advertisement "${ad.title || ad.name || 'Untitled'}" has been rejected successfully!`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to reject advertisement');
    }
  };

  // Get action buttons based on current advertisement state
  const getActionButtons = (ad: Advertisement) => {
    const currentState = (ad.state || ad.status || '').toUpperCase();
    const buttons = [];

    switch (currentState) {
      case 'DRAFT':
        buttons.push(
          <Button
            key="publish"
            variant="contained"
            color="success"
            size="small"
            onClick={() => handlePublishAd(ad)}
            startIcon={<CheckCircle />}
          >
            Publish
          </Button>
        );
        buttons.push(
          <Button
            key="reject"
            variant="outlined"
            color="error"
            size="small"
            onClick={() => handleRejectAd(ad)}
            startIcon={<Cancel />}
          >
            Reject
          </Button>
        );
        break;
      
      case 'PUBLISHED':
        buttons.push(
          <Button
            key="unpublish"
            variant="outlined"
            color="warning"
            size="small"
            onClick={() => handleUnpublishAd(ad)}
            startIcon={<Pause />}
          >
            Unpublish
          </Button>
        );
        break;
      
      case 'REJECTED':
        // No actions available for rejected ads
        break;
      
      case 'INACTIVE':
        buttons.push(
          <Button
            key="publish"
            variant="contained"
            color="success"
            size="small"
            onClick={() => handlePublishAd(ad)}
            startIcon={<CheckCircle />}
          >
            Publish
          </Button>
        );
        break;
      
      default:
        // For unknown states, show publish option
        buttons.push(
          <Button
            key="publish"
            variant="contained"
            color="success"
            size="small"
            onClick={() => handlePublishAd(ad)}
            startIcon={<CheckCircle />}
          >
            Publish
          </Button>
        );
        break;
    }

    return buttons;
  };

  // Render different views based on viewMode
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <Button onClick={handleBackToList} sx={{ mr: 2 }}>
            ← Back to List
          </Button>
          <Typography variant="h4" component="h1">
            {viewMode === 'create' ? 'Create Advertisement' : 'Edit Advertisement'}
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Advertisement Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                error={!!formErrors.title}
                helperText={formErrors.title}
                margin="normal"
              />
              
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                margin="normal"
              />

              {/* Partner field - only show in view and edit modes, not in create mode */}
              {viewMode !== 'create' && selectedAd && (
                <FormControl fullWidth margin="normal">
                  <InputLabel>Partner</InputLabel>
                  <Select
                    value={selectedAd.partner_id || ''}
                    disabled={true}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <em>No partner selected</em>
                    </MenuItem>
                    {partners.map((partner) => (
                      <MenuItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    Partner is automatically detected and cannot be changed
                  </Typography>
                </FormControl>
              )}

              <TextField
                fullWidth
                label="Publication Start Date"
                type="date"
                value={formData.published_time_start}
                onChange={(e) => setFormData({ ...formData, published_time_start: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.published_time_start}
                helperText={formErrors.published_time_start || "When the advertisement should start being displayed"}
              />

              <TextField
                fullWidth
                label="Publication End Date"
                type="date"
                value={formData.published_time_end}
                onChange={(e) => setFormData({ ...formData, published_time_end: e.target.value })}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                error={!!formErrors.published_time_end}
                helperText={formErrors.published_time_end || "When the advertisement should stop being displayed"}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>Content Type</InputLabel>
                <Select
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <MenuItem value="IMAGE">Image</MenuItem>
                  <MenuItem value="VIDEO">Video</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Categories</InputLabel>
                <Select
                  multiple
                  value={formData.categories as string[]}
                  onChange={(e) => setFormData({ ...formData, categories: e.target.value as string[] })}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                  disabled={!categories || categories.length === 0}
                >
                  {(categories || []).map((category) => (
                    <MenuItem key={category} value={category}>
                      <Checkbox checked={(formData.categories as string[]).indexOf(category) > -1} />
                      <ListItemText primary={category} />
                    </MenuItem>
                  ))}
                </Select>
                {(!categories || categories.length === 0) && (
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                    Loading categories...
                  </Typography>
                )}
              </FormControl>

              {formData.type === 'VIDEO' && (
                <TextField
                  fullWidth
                  label="Duration (seconds)"
                  type="number"
                  value={formData.duration || ''}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })}
                  margin="normal"
                  helperText="Duration will be auto-detected when you upload a video file"
                />
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Content Upload
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <input
                    type="file"
                    accept={formData.type === 'VIDEO' ? 'video/*' : 'image/*'}
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    style={{ flexGrow: 1 }}
                  />
                  {uploadingFile && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="caption" color="primary">
                        {formData.type === 'VIDEO' ? 'Uploading & detecting duration...' : 'Uploading...'}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <TextField
                  fullWidth
                  label="Content URL"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  size="small"
                  placeholder="https://example.com/content.jpg"
                  helperText="Upload a file or enter URL manually"
                  disabled={uploadingFile}
                />
                {formData.content && (
                  <Box sx={{ mt: 2 }}>
                    {formData.type === 'VIDEO' ? (
                      <video 
                        src={formData.content} 
                        controls 
                        style={{ maxWidth: '100%', maxHeight: 200 }}
                      />
                    ) : (
                      <img 
                        src={formData.content} 
                        alt="Preview" 
                        style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button onClick={handleBackToList} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : (viewMode === 'create' ? 'Create Advertisement' : 'Update Advertisement')}
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (viewMode === 'view' && selectedAd) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <Button onClick={handleBackToList} sx={{ mr: 2 }}>
            ← Back to List
          </Button>
          <Typography variant="h4" component="h1">
            Advertisement Details
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom>{selectedAd.title || selectedAd.name || 'Untitled Advertisement'}</Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {selectedAd.description || 'No description available'}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Status:</Typography>
                <Chip 
                  label={(selectedAd.state || selectedAd.status || 'unknown').toUpperCase()} 
                  color={getStatusColor(selectedAd.state || selectedAd.status || 'unknown')} 
                  size="small" 
                />
              </Box>

              {selectedAd.type && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Content Type:</Typography>
                  <Chip 
                    label={selectedAd.type} 
                    color={selectedAd.type === 'VIDEO' ? 'primary' : selectedAd.type === 'IMAGE' ? 'secondary' : 'default'} 
                    size="small" 
                    icon={selectedAd.type === 'VIDEO' ? <VideoIcon /> : selectedAd.type === 'IMAGE' ? <ImageIcon /> : <AdIcon />}
                  />
                </Box>
              )}

              {selectedAd.duration && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Duration:</Typography>
                  <Typography variant="body2">
                    {Math.floor(selectedAd.duration / 60)}:{(selectedAd.duration % 60).toString().padStart(2, '0')} minutes
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Partner:</Typography>
                <Typography variant="body2">{getPartnerName(selectedAd.partner_id)}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Published Period:</Typography>
                <Typography variant="body2">
                  {selectedAd.published_time_start ? formatDate(selectedAd.published_time_start) : 'Not set'} - {selectedAd.published_time_end ? formatDate(selectedAd.published_time_end) : 'Not set'}
                </Typography>
              </Box>

              {(selectedAd.start_date || selectedAd.end_date) && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Legacy Schedule:</Typography>
                  <Typography variant="body2">
                    {selectedAd.start_date ? formatDate(selectedAd.start_date) : 'Not set'} - {selectedAd.end_date ? formatDate(selectedAd.end_date) : 'Not set'}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Current Assignments:</Typography>
                <Typography variant="body2">
                  {getMerchantNames(selectedAd.merchant_ids || [])}
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Created:</Typography>
                <Typography variant="body2">
                  {selectedAd.created_at ? formatDate(selectedAd.created_at) : 'Unknown'}
                </Typography>
              </Box>

              {selectedAd.created_by && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Created By:</Typography>
                  <Typography variant="body2">{selectedAd.created_by}</Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              {/* Content Preview */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Content Preview
                </Typography>
                
                {getContentType(selectedAd) === 'image' && (selectedAd.content || selectedAd.image_url) && (
                  <Paper
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      backgroundColor: 'grey.100',
                    }}
                  >
                    <img 
                      src={selectedAd.content || selectedAd.image_url} 
                      alt={selectedAd.name || 'Advertisement'}
                      style={{ 
                        width: '100%', 
                        height: 300, 
                        objectFit: 'contain',
                        backgroundColor: '#f5f5f5'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <ImageIcon fontSize="small" />
                      Image
                    </Box>
                  </Paper>
                )}
                
                {getContentType(selectedAd) === 'video' && (selectedAd.content || selectedAd.video_url) && (
                  <Paper
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      overflow: 'hidden',
                      backgroundColor: '#000',
                    }}
                  >
                    <video 
                      src={selectedAd.content || selectedAd.video_url} 
                      controls
                      style={{ 
                        width: '100%', 
                        height: 300, 
                        objectFit: 'contain',
                        backgroundColor: '#000'
                      }}
                      poster={selectedAd.image_url || undefined}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <VideoIcon fontSize="small" />
                      Video {selectedAd.duration && `(${Math.floor(selectedAd.duration / 60)}:${(selectedAd.duration % 60).toString().padStart(2, '0')})`}
                    </Box>
                  </Paper>
                )}
                
                {getContentType(selectedAd) === 'none' && (
                  <Paper
                    sx={{
                      height: 300,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'grey.50',
                      borderRadius: 2,
                      border: '2px dashed',
                      borderColor: 'grey.300',
                    }}
                  >
                    <AdIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      No content available
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Grid>
          </Grid>

          {/* Action buttons section - positioned after details */}
          {(hasRole('merchant') || hasRole('admin')) && (
            <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {getActionButtons(selectedAd)}
              </Box>
            </Box>
          )}

          <Box sx={{ mt: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button onClick={handleBackToList}>
              Back to List
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  }

  if (viewMode === 'publish' && selectedAd) {
    return (
      <Box>
        <Box display="flex" alignItems="center" mb={3}>
          <Button onClick={handleBackToList} sx={{ mr: 2 }}>
            ← Back to List
          </Button>
          <Typography variant="h4" component="h1">
            Publish Advertisement
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Advertisement Details
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                {selectedAd.image_url && (
                  <Avatar
                    src={selectedAd.image_url}
                    alt={selectedAd.name}
                    sx={{ width: 80, height: 80 }}
                    variant="rounded"
                  />
                )}
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {selectedAd.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {selectedAd.description || 'No description'}
                  </Typography>
                  <Chip 
                    label={(selectedAd.status || 'unknown').toUpperCase()} 
                    color={getStatusColor(selectedAd.status || 'unknown')} 
                    size="small" 
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Partner:</Typography>
                <Typography variant="body2">{getPartnerName(selectedAd.partner_id)}</Typography>
              </Box>

              {selectedAd.start_date && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Schedule:</Typography>
                  <Typography variant="body2">
                    {formatDate(selectedAd.start_date)} - {selectedAd.end_date ? formatDate(selectedAd.end_date) : 'Ongoing'}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Merchants to Publish To
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose which merchants will display this advertisement.
              </Typography>

              {/* Search Field */}
              <TextField
                fullWidth
                placeholder="Search merchants..."
                value={merchantSearchTerm}
                onChange={(e) => setMerchantSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
                size="small"
              />

              {merchants.length === 0 ? (
                <Alert severity="warning">
                  No merchants available. Please create merchants first.
                </Alert>
              ) : (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      onClick={() => {
                        const filteredMerchants = merchants.filter(m =>
                          m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
                          (m.email && m.email.toLowerCase().includes(merchantSearchTerm.toLowerCase())) ||
                          (m.address && m.address.toLowerCase().includes(merchantSearchTerm.toLowerCase()))
                        ).map(m => m.id.toString());
                        
                        const selectedFiltered = selectedMerchantsForPublish.filter(id =>
                          filteredMerchants.includes(id)
                        );
                        
                        if (selectedFiltered.length === filteredMerchants.length) {
                          // Deselect all filtered merchants
                          setSelectedMerchantsForPublish(prev => 
                            prev.filter(id => !filteredMerchants.includes(id))
                          );
                        } else {
                          // Select all filtered merchants
                          setSelectedMerchantsForPublish(prev => [
                            ...prev.filter(id => !filteredMerchants.includes(id)),
                            ...filteredMerchants
                          ]);
                        }
                      }}
                    >
                      {(() => {
                        const filteredMerchants = merchants.filter(m =>
                          m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
                          (m.email && m.email.toLowerCase().includes(merchantSearchTerm.toLowerCase())) ||
                          (m.address && m.address.toLowerCase().includes(merchantSearchTerm.toLowerCase()))
                        ).map(m => m.id.toString());
                        
                        const selectedFiltered = selectedMerchantsForPublish.filter(id =>
                          filteredMerchants.includes(id)
                        );
                        
                        return selectedFiltered.length === filteredMerchants.length && filteredMerchants.length > 0
                          ? 'Deselect All Visible' 
                          : 'Select All Visible';
                      })()}
                    </Button>
                    {merchantSearchTerm && (
                      <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                        {merchants.filter(m =>
                          m.name.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
                          (m.email && m.email.toLowerCase().includes(merchantSearchTerm.toLowerCase())) ||
                          (m.address && m.address.toLowerCase().includes(merchantSearchTerm.toLowerCase()))
                        ).length} merchants found
                      </Typography>
                    )}
                  </Box>

                  <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {merchants
                      .filter(merchant =>
                        merchant.name.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
                        (merchant.email && merchant.email.toLowerCase().includes(merchantSearchTerm.toLowerCase())) ||
                        (merchant.address && merchant.address.toLowerCase().includes(merchantSearchTerm.toLowerCase()))
                      )
                      .length === 0 && merchantSearchTerm ? (
                        <ListItem>
                          <ListItemText
                            primary="No merchants found"
                            secondary={`No merchants match "${merchantSearchTerm}"`}
                            sx={{ textAlign: 'center', color: 'text.secondary' }}
                          />
                        </ListItem>
                      ) : (
                        merchants
                          .filter(merchant =>
                            merchant.name.toLowerCase().includes(merchantSearchTerm.toLowerCase()) ||
                            (merchant.email && merchant.email.toLowerCase().includes(merchantSearchTerm.toLowerCase())) ||
                            (merchant.address && merchant.address.toLowerCase().includes(merchantSearchTerm.toLowerCase()))
                          )
                          .map((merchant) => (
                            <ListItem key={merchant.id} dense>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={selectedMerchantsForPublish.includes(merchant.id.toString())}
                            onChange={(e) => {
                              const merchantId = merchant.id.toString();
                              if (e.target.checked) {
                                setSelectedMerchantsForPublish(prev => [...prev, merchantId]);
                              } else {
                                setSelectedMerchantsForPublish(prev => prev.filter(id => id !== merchantId));
                              }
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {merchant.name}
                              <Chip 
                                label={merchant.status || 'unknown'} 
                                size="small" 
                                color={merchant.status === 'active' ? 'success' : 'default'}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={merchant.email || merchant.address || 'No additional info'}
                        />
                            </ListItem>
                          ))
                      )}
                  </List>

                  {selectedMerchantsForPublish.length > 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      This advertisement will be published to {selectedMerchantsForPublish.length} merchant(s).
                    </Alert>
                  )}
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={handleBackToList} disabled={publishingAds.has(selectedAd.id)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPublish}
            variant="contained"
            color="primary"
            disabled={publishingAds.has(selectedAd.id) || selectedMerchantsForPublish.length === 0}
            startIcon={publishingAds.has(selectedAd.id) ? <CircularProgress size={20} /> : <PublishIcon />}
          >
            {publishingAds.has(selectedAd.id) ? 'Publishing...' : `Publish to ${selectedMerchantsForPublish.length} Merchant(s)`}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Advertisements Management
        </Typography>
        {hasRole('partner') ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateAd}
          >
            Create Advertisement
          </Button>
        ) : null}
      </Box>

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

      <Paper sx={{ mb: 2 }}>
        <Box p={2} display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="Search advertisements..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 300 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="PUBLISHED">Published</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </Button>

            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

            {/* View Toggle */}
            <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <IconButton
                size="small"
                onClick={() => setListViewMode('grid')}
                sx={{
                  color: listViewMode === 'grid' ? 'primary.main' : 'text.secondary',
                  backgroundColor: listViewMode === 'grid' ? 'primary.50' : 'transparent',
                  borderRadius: '4px 0 0 4px',
                  '&:hover': {
                    backgroundColor: listViewMode === 'grid' ? 'primary.100' : 'action.hover',
                  },
                }}
              >
                <GridViewIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setListViewMode('list')}
                sx={{
                  color: listViewMode === 'list' ? 'primary.main' : 'text.secondary',
                  backgroundColor: listViewMode === 'list' ? 'primary.50' : 'transparent',
                  borderRadius: '0 4px 4px 0',
                  '&:hover': {
                    backgroundColor: listViewMode === 'list' ? 'primary.100' : 'action.hover',
                  },
                }}
              >
                <ListViewIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : advertisements.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            No advertisements found
          </Typography>
        </Paper>
      ) : listViewMode === 'grid' ? (
        <Grid container spacing={3}>
          {advertisements.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ad) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={ad.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
                onClick={() => handleViewAd(ad)}
              >
                {/* Content Thumbnail */}
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 200,
                    backgroundColor: 'grey.100',
                    borderRadius: '16px 16px 0 0',
                    overflow: 'hidden',
                  }}
                >
                  {getContentThumbnail(ad) ? (
                    <>
                      <img
                        src={getContentThumbnail(ad)!}
                        alt={ad.name || 'Advertisement'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {getContentType(ad) === 'video' && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'rgba(0,0,0,0.7)',
                            borderRadius: '50%',
                            width: 48,
                            height: 48,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <PlayArrowIcon sx={{ color: 'white', fontSize: 24 }} />
                        </Box>
                      )}
                    </>
                  ) : getContentType(ad) === 'video' ? (
                    // Video without thumbnail - show video icon with play button
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 1,
                        backgroundColor: '#000',
                        color: 'white',
                      }}
                    >
                      <VideoIcon sx={{ fontSize: 48, mb: 1 }} />
                      <Box
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.2)',
                          borderRadius: '50%',
                          width: 40,
                          height: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PlayArrowIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Typography variant="caption" sx={{ mt: 1 }}>
                        Video Content
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      {getContentIcon(ad)}
                      <Typography variant="caption" color="text.secondary">
                        No content
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Content Type Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    {getContentType(ad) === 'video' && <VideoIcon fontSize="small" />}
                    {getContentType(ad) === 'image' && <ImageIcon fontSize="small" />}
                    {getContentType(ad) === 'none' && <AdIcon fontSize="small" />}
                    {getContentType(ad) === 'video' ? 'Video' : getContentType(ad) === 'image' ? 'Image' : 'Ad'}
                  </Box>

                  {/* Status Badge */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                    }}
                  >
                    <Chip 
                      label={(ad.state || ad.status || 'unknown').toUpperCase()} 
                      color={getStatusColor(ad.state || ad.status || 'unknown')} 
                      size="small"
                      sx={{ fontSize: '0.7rem', height: 24 }}
                    />
                  </Box>
                </Box>

                {/* Card Content */}
                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem', fontWeight: 600 }}>
                    {ad.title || ad.name || 'Untitled Advertisement'}
                  </Typography>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 2, 
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {ad.description || 'No description available'}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <BusinessIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {getPartnerName(ad.partner_id)}
                    </Typography>
                  </Box>

                  {(ad.published_time_start || ad.start_date) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(ad.published_time_start || ad.start_date || '')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                {/* Action Buttons */}
                <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewAd(ad);
                    }}
                    sx={{ flex: 1 }}
                  >
                    View
                  </Button>
                  {hasRole('partner') && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAd(ad);
                      }}
                      sx={{ flex: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // List View
        <Grid container spacing={2}>
          {advertisements.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((ad) => (
            <Grid item xs={12} key={ad.id}>
              <Card sx={{ p: 3 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} md={2}>
                    <Box
                      sx={{
                        position: 'relative',
                        width: 80,
                        height: 80,
                        borderRadius: 2,
                        overflow: 'hidden',
                        backgroundColor: 'grey.100',
                      }}
                    >
                      {getContentThumbnail(ad) ? (
                        <>
                          <img
                            src={getContentThumbnail(ad)!}
                            alt={ad.name || 'Advertisement'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                          {getContentType(ad) === 'video' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                bgcolor: 'rgba(0,0,0,0.6)',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <PlayArrowIcon sx={{ color: 'white', fontSize: 14 }} />
                            </Box>
                          )}
                        </>
                      ) : (
                        <Box
                          sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: getContentType(ad) === 'video' ? '#000' : 'grey.100',
                            color: getContentType(ad) === 'video' ? 'white' : 'text.secondary',
                          }}
                        >
                          {getContentType(ad) === 'video' ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <VideoIcon sx={{ fontSize: 24 }} />
                              <PlayArrowIcon sx={{ fontSize: 16 }} />
                            </Box>
                          ) : getContentType(ad) === 'image' ? (
                            <ImageIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                          ) : (
                            <AdIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                          )}
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Typography variant="h6" gutterBottom>
                      {ad.title || ad.name || 'Untitled Advertisement'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {ad.description || 'No description'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2">{getPartnerName(ad.partner_id)}</Typography>
                    </Box>
                    {(ad.published_time_start || ad.start_date) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDate(ad.published_time_start || ad.start_date || '')} - {(ad.published_time_end || ad.end_date) ? formatDate(ad.published_time_end || ad.end_date || '') : 'Ongoing'}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={2}>
                    <Chip 
                      label={(ad.state || ad.status || 'unknown').toUpperCase()} 
                      color={getStatusColor(ad.state || ad.status || 'unknown')} 
                      size="small" 
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewAd(ad)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {hasRole('partner') && (
                        <Tooltip title="Edit Advertisement">
                          <IconButton
                            size="small"
                            onClick={() => handleEditAd(ad)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Box>
    </Box>
  );
};

export default AdvertisementsManagement;