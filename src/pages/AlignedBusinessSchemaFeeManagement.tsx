import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Grid,
  Card,
  CardContent,
  InputAdornment,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Percent as PercentIcon,
  Business as BusinessIcon,
  Visibility as ViewIcon,
  Store as MerchantIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

// Aligned with backend model
interface BusinessSchemaFee {
  id: string;
  entity: 'GLASSBOX' | 'SALES' | 'BROKER' | 'MERCHANT';
  amount: number; // Percentage share (0.00-100.00)
  merchant_id: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  merchant?: {
    id: string;
    name: string;
  };
}

interface FormData {
  entity: 'GLASSBOX' | 'SALES' | 'BROKER' | 'MERCHANT';
  amount: number;
  merchant_id: string;
  description: string;
  is_active: boolean;
}

const ENTITY_TYPES = [
  { value: 'GLASSBOX', label: 'GLASSBOX - Platform Commission', color: 'primary' },
  { value: 'SALES', label: 'SALES - Sales Team Commission', color: 'secondary' },
  { value: 'BROKER', label: 'BROKER - Broker/Intermediary Fee', color: 'info' },
  { value: 'MERCHANT', label: 'MERCHANT - Merchant Share', color: 'success' },
];

const AlignedBusinessSchemaFeeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [fees, setFees] = useState<BusinessSchemaFee[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedFee, setSelectedFee] = useState<BusinessSchemaFee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<BusinessSchemaFee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    entity: 'GLASSBOX',
    amount: 0,
    merchant_id: '',
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadFees();
    loadMerchants();
  }, []);

  const loadFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getBusinessSchemaFees();
      setFees(response.data);
    } catch (err: any) {
      console.error('Error loading business schema fees:', err);
      setError(err.response?.data?.message || 'Failed to load business schema fees');
    } finally {
      setLoading(false);
    }
  };

  const loadMerchants = async () => {
    try {
      const response = await apiService.getMerchants();
      setMerchants(response.data);
    } catch (err: any) {
      console.error('Error loading merchants:', err);
    }
  };

  const handleCreateFee = () => {
    setDialogMode('create');
    setSelectedFee(null);
    setFormData({
      entity: 'GLASSBOX',
      amount: 0,
      merchant_id: '',
      description: '',
      is_active: true,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEditFee = (fee: BusinessSchemaFee) => {
    setDialogMode('edit');
    setSelectedFee(fee);
    setFormData({
      entity: fee.entity,
      amount: fee.amount,
      merchant_id: fee.merchant_id,
      description: fee.description || '',
      is_active: fee.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleViewFee = (fee: BusinessSchemaFee) => {
    setDialogMode('view');
    setSelectedFee(fee);
    setDialogOpen(true);
  };

  const handleDeleteFee = (fee: BusinessSchemaFee) => {
    setFeeToDelete(fee);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.entity) {
      errors.entity = 'Entity is required';
    }

    if (formData.amount < 0 || formData.amount > 100) {
      errors.amount = 'Percentage must be between 0 and 100';
    }

    if (!formData.merchant_id) {
      errors.merchant_id = 'Merchant is required';
    }

    // Check if entity already has a fee for this merchant
    const existingFee = fees.find(fee => 
      fee.entity === formData.entity && 
      fee.merchant_id === formData.merchant_id &&
      fee.is_active && 
      fee.id !== selectedFee?.id
    );
    
    if (existingFee) {
      errors.entity = `${formData.entity} already has an active fee for this merchant`;
    }

    // Validate total percentage for merchant doesn't exceed 100%
    const merchantFees = fees.filter(fee => 
      fee.merchant_id === formData.merchant_id && 
      fee.is_active && 
      fee.id !== selectedFee?.id
    );
    
    const totalPercentage = merchantFees.reduce((sum, fee) => sum + fee.amount, 0) + formData.amount;
    
    if (totalPercentage > 100) {
      errors.amount = `Total percentage for this merchant would exceed 100% (currently ${(totalPercentage - formData.amount).toFixed(1)}%)`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        await apiService.createBusinessSchemaFee(formData);
      } else if (dialogMode === 'edit' && selectedFee) {
        await apiService.updateBusinessSchemaFee(selectedFee.id, formData);
      }

      setDialogOpen(false);
      await loadFees();
    } catch (err: any) {
      console.error('Error saving business schema fee:', err);
      setError(err.response?.data?.message || 'Failed to save business schema fee');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!feeToDelete) return;

    try {
      await apiService.deleteBusinessSchemaFee(feeToDelete.id);
      setDeleteDialogOpen(false);
      setFeeToDelete(null);
      await loadFees();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete business schema fee');
    }
  };

  const filteredFees = fees.filter(fee => {
    const merchantName = fee.merchant?.name || merchants.find(m => m.id === fee.merchant_id)?.name || '';
    return (
      merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const paginatedFees = filteredFees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const getEntityColor = (entity: string) => {
    const entityType = ENTITY_TYPES.find(e => e.value === entity);
    return entityType?.color || 'default';
  };

  const calculateTotalPercentage = (merchantId: string) => {
    return fees
      .filter(fee => fee.merchant_id === merchantId && fee.is_active)
      .reduce((sum, fee) => sum + fee.amount, 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Business Fee Schema Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateFee}
        >
          {t('add')} Fee Schema
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('total')} Schemas
                  </Typography>
                  <Typography variant="h4">
                    {fees.length}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    {t('active')} Schemas
                  </Typography>
                  <Typography variant="h4">
                    {fees.filter(f => f.is_active).length}
                  </Typography>
                </Box>
                <PercentIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Average Percentage
                  </Typography>
                  <Typography variant="h4">
                    {fees.length > 0 ? (fees.reduce((sum, fee) => sum + fee.amount, 0) / fees.length).toFixed(1) : '0'}%
                  </Typography>
                </Box>
                <MerchantIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('search') + ' business fee schemas...'}
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            onClick={loadFees}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* Business Schema Fees Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Merchant</TableCell>
                <TableCell>Entity</TableCell>
                <TableCell>Percentage</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('description')}</TableCell>
                <TableCell>{t('created')}</TableCell>
                <TableCell>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedFees.map((fee) => {
                const merchantName = fee.merchant?.name || merchants.find(m => m.id === fee.merchant_id)?.name || fee.merchant_id;
                return (
                  <TableRow key={fee.id}>
                    <TableCell>{merchantName}</TableCell>
                    <TableCell>
                      <Chip
                        label={fee.entity}
                        color={getEntityColor(fee.entity) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {fee.amount}%
                        </Typography>
                        <PercentIcon fontSize="small" />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fee.is_active ? t('active') : t('inactive')}
                        color={fee.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{fee.description || 'N/A'}</TableCell>
                    <TableCell>{new Date(fee.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleViewFee(fee)} size="small">
                        <ViewIcon />
                      </IconButton>
                      <IconButton onClick={() => handleEditFee(fee)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteFee(fee)} size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredFees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? t('create') + ' Business Fee Schema' : 
           dialogMode === 'edit' ? t('edit') + ' Business Fee Schema' : t('view') + ' Business Fee Schema'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.merchant_id}>
                <InputLabel>Merchant</InputLabel>
                <Select
                  value={formData.merchant_id}
                  onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
                  disabled={dialogMode === 'view'}
                >
                  {merchants.map((merchant) => (
                    <MenuItem key={merchant.id} value={merchant.id}>
                      {merchant.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.entity}>
                <InputLabel>Entity</InputLabel>
                <Select
                  value={formData.entity}
                  onChange={(e) => setFormData({ ...formData, entity: e.target.value as any })}
                  disabled={dialogMode === 'view'}
                >
                  {ENTITY_TYPES.map((entity) => (
                    <MenuItem key={entity.value} value={entity.value}>
                      {entity.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Percentage"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                error={!!formErrors.amount}
                helperText={formErrors.amount || 'Enter percentage (0.00-100.00)'}
                disabled={dialogMode === 'view'}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {formData.merchant_id && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Total persentase untuk merchant ini: {calculateTotalPercentage(formData.merchant_id)}%
                  <br />
                  Total percentage for this merchant: {calculateTotalPercentage(formData.merchant_id)}%
                </Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('description')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={3}
                disabled={dialogMode === 'view'}
                placeholder="Example: Platform commission for advertising services"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={dialogMode === 'view'}
                  />
                }
                label={t('active')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {dialogMode === 'view' ? t('close') : t('cancel')}
          </Button>
          {dialogMode !== 'view' && (
            <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : (dialogMode === 'create' ? t('create') : t('update'))}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography>
            Apakah Anda yakin ingin menghapus skema biaya bisnis untuk entitas "{feeToDelete?.entity}"? 
            Tindakan ini tidak dapat dibatalkan.
            <br />
            <br />
            Are you sure you want to delete the business fee schema for entity "{feeToDelete?.entity}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AlignedBusinessSchemaFeeManagement;
