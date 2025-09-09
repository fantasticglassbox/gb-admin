import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  CardMedia,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Attachment as AssetIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocumentIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import { AssetResponse, FilterOptions } from '../types';
import { apiService } from '../services/api';

const AssetsManagement: React.FC = () => {
  const [assets, setAssets] = useState<AssetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Upload states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetResponse | null>(null);

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    tags: '',
  });
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<AssetResponse | null>(null);

  useEffect(() => {
    loadAssets();
  }, [page, rowsPerPage, searchTerm, typeFilter, statusFilter]);

  const loadAssets = async () => {
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
      if (typeFilter) {
        filters.file_type = typeFilter;
      }
      if (statusFilter) {
        filters.status = statusFilter;
      }

      const response = await apiService.getAssets(filters);
      setAssets(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleTypeFilterChange = (event: any) => {
    setTypeFilter(event.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        await apiService.uploadAsset(formData, (progressEvent) => {
          if (progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(progress);
          }
        });

        // Update progress for multiple files
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setUploadDialogOpen(false);
      await loadAssets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleViewAsset = (asset: AssetResponse) => {
    setSelectedAsset(asset);
    setViewDialogOpen(true);
  };

  const handleEditAsset = (asset: AssetResponse) => {
    setSelectedAsset(asset);
    setEditFormData({
      name: asset.name,
      description: asset.description || '',
      tags: asset.tags ? asset.tags.join(', ') : '',
    });
    setEditFormErrors({});
    setEditDialogOpen(true);
  };

  const handleDownloadAsset = async (asset: AssetResponse) => {
    try {
      const response = await apiService.downloadAsset(asset.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = asset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to download asset');
    }
  };

  const handleDeleteAsset = (asset: AssetResponse) => {
    setAssetToDelete(asset);
    setDeleteDialogOpen(true);
  };

  const validateEditForm = () => {
    const errors: Record<string, string> = {};

    if (!editFormData.name.trim()) {
      errors.name = 'Asset name is required';
    }

    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async () => {
    if (!validateEditForm() || !selectedAsset) return;

    try {
      setSubmitting(true);
      
      const updateData = {
        name: editFormData.name,
        description: editFormData.description || undefined,
        tags: editFormData.tags ? editFormData.tags.split(',').map(tag => tag.trim()) : undefined,
      };

      await apiService.updateAsset(selectedAsset.id, updateData);
      setEditDialogOpen(false);
      await loadAssets();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update asset');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!assetToDelete) return;

    try {
      await apiService.deleteAsset(assetToDelete.id);
      setDeleteDialogOpen(false);
      setAssetToDelete(null);
      await loadAssets();
      setSuccess('Operation completed successfully');
    } catch (err: any) {
      setError('Operation failed');
    }
  };

  const getFileTypeIcon = (fileType: string, size: 'small' | 'medium' | 'large' = 'medium') => {
    const iconProps = { fontSize: size };
    
    if (fileType.startsWith('image/')) {
      return <ImageIcon {...iconProps} color="primary" />;
    } else if (fileType.startsWith('video/')) {
      return <VideoIcon {...iconProps} color="secondary" />;
    } else if (fileType.startsWith('audio/')) {
      return <AudioIcon {...iconProps} color="success" />;
    } else {
      return <DocumentIcon {...iconProps} color="action" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const isVideoFile = (fileType: string) => {
    return fileType.startsWith('video/');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Assets Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={handleUploadClick}
        >
          Upload Assets
        </Button>
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
        <Box p={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            placeholder="Search assets..."
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
            <InputLabel>File Type</InputLabel>
            <Select
              value={typeFilter}
              label="File Type"
              onChange={handleTypeFilterChange}
            >
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="image">Images</MenuItem>
              <MenuItem value="video">Videos</MenuItem>
              <MenuItem value="audio">Audio</MenuItem>
              <MenuItem value="document">Documents</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAssets}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Asset</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Size</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Usage Count</TableCell>
                <TableCell>Uploaded</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No assets found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset) => (
                  <TableRow key={asset.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        {isImageFile(asset.file_type) && asset.url ? (
                          <Avatar
                            src={asset.url}
                            variant="rounded"
                            sx={{ width: 48, height: 48 }}
                          >
                            {getFileTypeIcon(asset.file_type)}
                          </Avatar>
                        ) : (
                          <Avatar variant="rounded" sx={{ width: 48, height: 48 }}>
                            {getFileTypeIcon(asset.file_type)}
                          </Avatar>
                        )}
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {asset.name}
                          </Typography>
                          {asset.description && (
                            <Typography variant="caption" color="textSecondary">
                              {asset.description.length > 50 
                                ? asset.description.substring(0, 50) + '...' 
                                : asset.description}
                            </Typography>
                          )}
                          {asset.tags && asset.tags.length > 0 && (
                            <Box display="flex" gap={0.5} mt={0.5}>
                              {asset.tags.slice(0, 3).map((tag, index) => (
                                <Chip key={index} label={tag} size="small" variant="outlined" />
                              ))}
                              {asset.tags.length > 3 && (
                                <Chip label={`+${asset.tags.length - 3}`} size="small" variant="outlined" />
                              )}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getFileTypeIcon(asset.file_type, 'small')}
                        <Typography variant="body2">
                          {(asset.file_type || 'unknown').split('/')[0].toUpperCase()}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatFileSize(asset.file_size)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(asset.status || 'unknown').toUpperCase()}
                        color={getStatusColor(asset.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {asset.usage_count || 0}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {formatDate(asset.created_at)}
                        </Typography>
                        {asset.uploaded_by && (
                          <Typography variant="caption" color="textSecondary">
                            by {asset.uploaded_by}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Asset">
                        <IconButton
                          size="small"
                          onClick={() => handleViewAsset(asset)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Asset">
                        <IconButton
                          size="small"
                          onClick={() => handleEditAsset(asset)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download Asset">
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadAsset(asset)}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Asset">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteAsset(asset)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

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
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Assets</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
            />
            
            {!uploading ? (
              <Box textAlign="center" py={4}>
                <FolderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Select files to upload
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={3}>
                  Supported formats: Images, Videos, Audio, Documents
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleFileSelect}
                  startIcon={<UploadIcon />}
                  size="large"
                >
                  Choose Files
                </Button>
              </Box>
            ) : (
              <Box py={4}>
                <Typography variant="h6" align="center" gutterBottom>
                  Uploading...
                </Typography>
                <LinearProgress variant="determinate" value={uploadProgress} sx={{ mb: 2 }} />
                <Typography variant="body2" align="center" color="textSecondary">
                  {Math.round(uploadProgress)}% complete
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Asset Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Asset Details</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Asset Information
                      </Typography>
                      <Typography variant="body2">
                        <strong>Name:</strong> {selectedAsset.name}
                      </Typography>
                      <Typography variant="body2">
                        <strong>File Type:</strong> {selectedAsset.file_type}
                      </Typography>
                      <Typography variant="body2">
                        <strong>File Size:</strong> {formatFileSize(selectedAsset.file_size)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Status:</strong> {(selectedAsset.status || 'unknown').toUpperCase()}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Usage Count:</strong> {selectedAsset.usage_count || 0}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Uploaded:</strong> {formatDate(selectedAsset.created_at)}
                      </Typography>
                      {selectedAsset.uploaded_by && (
                        <Typography variant="body2">
                          <strong>Uploaded By:</strong> {selectedAsset.uploaded_by}
                        </Typography>
                      )}
                      {selectedAsset.description && (
                        <Typography variant="body2">
                          <strong>Description:</strong> {selectedAsset.description}
                        </Typography>
                      )}
                      {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                        <Box mt={1}>
                          <Typography variant="body2" gutterBottom>
                            <strong>Tags:</strong>
                          </Typography>
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            {selectedAsset.tags.map((tag, index) => (
                              <Chip key={index} label={tag} size="small" />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    {isImageFile(selectedAsset.file_type) && selectedAsset.url ? (
                      <CardMedia
                        component="img"
                        height="300"
                        image={selectedAsset.url}
                        alt={selectedAsset.name}
                        sx={{ objectFit: 'contain' }}
                      />
                    ) : isVideoFile(selectedAsset.file_type) && selectedAsset.url ? (
                      <CardMedia
                        component="video"
                        height="300"
                        controls
                        sx={{ objectFit: 'contain' }}
                      >
                        <source src={selectedAsset.url} type={selectedAsset.file_type} />
                      </CardMedia>
                    ) : (
                      <CardContent sx={{ textAlign: 'center', py: 8 }}>
                        {getFileTypeIcon(selectedAsset.file_type, 'large')}
                        <Typography variant="h6" mt={2}>
                          {(selectedAsset.file_type || 'unknown').split('/')[0].toUpperCase()} File
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Preview not available
                        </Typography>
                      </CardContent>
                    )}
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedAsset && (
            <Button
              onClick={() => handleDownloadAsset(selectedAsset)}
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Asset</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Asset Name"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              error={!!editFormErrors.name}
              helperText={editFormErrors.name}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />

            <TextField
              fullWidth
              label="Tags"
              value={editFormData.tags}
              onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
              margin="normal"
              helperText="Separate tags with commas"
              placeholder="tag1, tag2, tag3"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete asset "{assetToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetsManagement;
