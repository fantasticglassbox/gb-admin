import React, { useState, useEffect, useCallback } from 'react';
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
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Visibility as ViewIcon,
  People as PeopleIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import { PartnerResponse, FilterOptions, Merchant, AdvertisementResponse } from '../types';
import { apiService } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const PartnersManagement: React.FC = () => {
  const [partners, setPartners] = useState<PartnerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedPartner, setSelectedPartner] = useState<PartnerResponse | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Partner details for view mode
  const [partnerMerchants, setPartnerMerchants] = useState<Merchant[]>([]);
  const [partnerAds, setPartnerAds] = useState<AdvertisementResponse[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'pending' | 'suspended',
    company_info: {
      company_name: '',
      industry: '',
      address: '',
      city: '',
      country: '',
      website: '',
    },
    settings: {
      default_fee_schema_id: '',
      auto_approve_merchants: false,
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<PartnerResponse | null>(null);

  const loadPartners = useCallback(async () => {
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

      const response = await apiService.getPartners(filters);
      setPartners(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const loadPartnerDetails = async (partnerId: string) => {
    try {
      setLoadingDetails(true);
      
      // Load partner's merchants
      const merchantsResponse = await apiService.getMerchants({ partner_id: partnerId, limit: 100 });
      setPartnerMerchants(merchantsResponse.data);

      // Load partner's advertisements
      const adsResponse = await apiService.getAdvertisements({ partner_id: partnerId, limit: 100 });
      setPartnerAds(adsResponse.data);
    } catch (err: any) {
      console.error('Failed to load partner details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };


  const handleCreatePartner = () => {
    setDialogMode('create');
    setSelectedPartner(null);
    setFormData({
      name: '',
      logo: '',
      email: '',
      phone: '',
      status: 'active',
      company_info: {
        company_name: '',
        industry: '',
        address: '',
        city: '',
        country: '',
        website: '',
      },
      settings: {
        default_fee_schema_id: '',
        auto_approve_merchants: false,
      },
    });
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleEditPartner = (partner: PartnerResponse) => {
    setDialogMode('edit');
    setSelectedPartner(partner);
    setFormData({
      name: partner.name,
      logo: partner.logo || '',
      email: partner.email || '',
      phone: partner.phone || '',
      status: partner.status,
      company_info: {
        company_name: partner.company_info?.company_name || '',
        industry: partner.company_info?.industry || '',
        address: partner.company_info?.address || '',
        city: partner.company_info?.city || '',
        country: partner.company_info?.country || '',
        website: partner.company_info?.website || '',
      },
      settings: {
        default_fee_schema_id: partner.settings?.default_fee_schema_id || '',
        auto_approve_merchants: partner.settings?.auto_approve_merchants || false,
      },
    });
    setFormErrors({});
    setTabValue(0);
    setDialogOpen(true);
  };

  const handleViewPartner = (partner: PartnerResponse) => {
    setDialogMode('view');
    setSelectedPartner(partner);
    setTabValue(0);
    setDialogOpen(true);
    loadPartnerDetails(partner.id);
  };

  const handleDeletePartner = (partner: PartnerResponse) => {
    setPartnerToDelete(partner);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Partner name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Valid email is required';
    }

    if (formData.company_info.website && 
        !/^https?:\/\/.+\..+/.test(formData.company_info.website)) {
      errors.website = 'Valid website URL is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      if (dialogMode === 'create') {
        await apiService.createPartner(formData);
      } else if (selectedPartner) {
        await apiService.updatePartner(selectedPartner.id, formData);
      }

      setDialogOpen(false);
      await loadPartners();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save partner');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!partnerToDelete) return;

    try {
      await apiService.deletePartner(partnerToDelete.id);
      setDeleteDialogOpen(false);
      setPartnerToDelete(null);
      await loadPartners();
      setSuccess('Operation completed successfully');
    } catch (err: any) {
      setError('Operation failed');
    }
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
      case 'inactive':
        return 'default';
      case 'pending':
        return 'warning';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Partners Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePartner}
        >
          Create Partner
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
        <Box p={2} display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="Search partners..."
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

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPartners}
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
                <TableCell>Partner</TableCell>
                <TableCell>Logo</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Industry</TableCell>
                <TableCell>Created</TableCell>
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
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No partners found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner) => (
                  <TableRow key={partner.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <BusinessIcon color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {partner.name}
                          </Typography>
                          {partner.company_info?.company_name && (
                            <Typography variant="caption" color="textSecondary">
                              {partner.company_info.company_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          overflow: 'hidden',
                          backgroundColor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {partner.logo ? (
                          <img
                            src={partner.logo}
                            alt={`${partner.name} logo`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <BusinessIcon color="action" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {partner.company_info?.company_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box>
                        {partner.email && (
                          <Typography variant="body2">
                            {partner.email}
                          </Typography>
                        )}
                        {partner.phone && (
                          <Typography variant="caption" color="textSecondary">
                            {partner.phone}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {partner.company_info?.industry || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(partner.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPartner(partner)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Partner">
                        <IconButton
                          size="small"
                          onClick={() => handleEditPartner(partner)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Partner">
                        <IconButton
                          size="small"
                          onClick={() => handleDeletePartner(partner)}
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

      {/* Create/Edit/View Partner Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New Partner' : 
           dialogMode === 'edit' ? 'Edit Partner' : 'Partner Details'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' && selectedPartner ? (
            <Box sx={{ pt: 1 }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Overview" />
                <Tab label={`Merchants (${partnerMerchants.length})`} />
                <Tab label={`Advertisements (${partnerAds.length})`} />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Basic Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Name:</strong> {selectedPartner.name}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Email:</strong> {selectedPartner.email || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Phone:</strong> {selectedPartner.phone || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Status:</strong> {(selectedPartner.status || 'unknown').toUpperCase()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Created:</strong> {formatDate(selectedPartner.created_at)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Company Information
                        </Typography>
                        <Typography variant="body2">
                          <strong>Company:</strong> {selectedPartner.company_info?.company_name || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Industry:</strong> {selectedPartner.company_info?.industry || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Address:</strong> {selectedPartner.company_info?.address || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>City:</strong> {selectedPartner.company_info?.city || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Country:</strong> {selectedPartner.company_info?.country || 'N/A'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Website:</strong> {selectedPartner.company_info?.website || 'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                {loadingDetails ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Merchant</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Business Type</TableCell>
                          <TableCell>Created</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {partnerMerchants.map((merchant) => (
                          <TableRow key={merchant.id}>
                            <TableCell>{merchant.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={(merchant.status || 'active').toUpperCase()}
                                color={getStatusColor(merchant.status || 'active')}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{merchant.description || 'N/A'}</TableCell>
                            <TableCell>{formatDate(merchant.created_at || new Date().toISOString())}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                {loadingDetails ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Advertisement</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Start Date</TableCell>
                          <TableCell>Views</TableCell>
                          <TableCell>Revenue</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {partnerAds.map((ad) => (
                          <TableRow key={ad.id}>
                            <TableCell>{ad.name}</TableCell>
                            <TableCell>
                              <Chip
                                label={(ad.status || 'unknown').toUpperCase()}
                                color={getStatusColor(ad.status || 'unknown')}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {ad.schedule?.start_date ? formatDate(ad.schedule.start_date) : 'N/A'}
                            </TableCell>
                            <TableCell>{ad.metrics?.total_views || 0}</TableCell>
                            <TableCell>
                              ${((ad.metrics?.total_revenue || 0) / 100).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </TabPanel>
            </Box>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Basic Info" />
                <Tab label="Company Details" />
                <Tab label="Settings" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <TextField
                  fullWidth
                  label="Partner Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  margin="normal"
                  required
                />

                <TextField
                  fullWidth
                  label="Logo URL"
                  value={formData.logo}
                  onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                  error={!!formErrors.logo}
                  helperText={formErrors.logo || "Enter the URL for the partner's logo image"}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  margin="normal"
                />

                <FormControl fullWidth margin="normal" required>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                  </Select>
                </FormControl>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.company_info.company_name}
                  onChange={(e) => setFormData({
                    ...formData,
                    company_info: { ...formData.company_info, company_name: e.target.value }
                  })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Industry"
                  value={formData.company_info.industry}
                  onChange={(e) => setFormData({
                    ...formData,
                    company_info: { ...formData.company_info, industry: e.target.value }
                  })}
                  margin="normal"
                />

                <TextField
                  fullWidth
                  label="Address"
                  value={formData.company_info.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    company_info: { ...formData.company_info, address: e.target.value }
                  })}
                  margin="normal"
                  multiline
                  rows={2}
                />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={formData.company_info.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        company_info: { ...formData.company_info, city: e.target.value }
                      })}
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Country"
                      value={formData.company_info.country}
                      onChange={(e) => setFormData({
                        ...formData,
                        company_info: { ...formData.company_info, country: e.target.value }
                      })}
                      margin="normal"
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  label="Website"
                  value={formData.company_info.website}
                  onChange={(e) => setFormData({
                    ...formData,
                    company_info: { ...formData.company_info, website: e.target.value }
                  })}
                  error={!!formErrors.website}
                  helperText={formErrors.website}
                  margin="normal"
                  placeholder="https://example.com"
                />
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <TextField
                  fullWidth
                  label="Default Fee Schema ID"
                  value={formData.settings.default_fee_schema_id}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: { ...formData.settings, default_fee_schema_id: e.target.value }
                  })}
                  margin="normal"
                  helperText="Default fee schema for this partner's merchants"
                />

                <FormControl fullWidth margin="normal">
                  <InputLabel>Auto-approve Merchants</InputLabel>
                  <Select
                    value={formData.settings.auto_approve_merchants}
                    label="Auto-approve Merchants"
                    onChange={(e) => setFormData({
                      ...formData,
                      settings: { ...formData.settings, auto_approve_merchants: e.target.value as boolean }
                    })}
                  >
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </Select>
                </FormControl>
              </TabPanel>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            {dialogMode === 'view' ? 'Close' : 'Cancel'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : (dialogMode === 'create' ? 'Create' : 'Update')}
            </Button>
          )}
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
            Are you sure you want to delete partner "{partnerToDelete?.name}"? This action cannot be undone.
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

export default PartnersManagement;
