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
  Checkbox,
  Menu,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AttachMoney as FeeIcon,
  Business as PartnerIcon,
  Visibility as ViewIcon,
  AttachMoney,
} from '@mui/icons-material';
import { apiService } from '../services/api';

// Aligned with backend model
interface PartnerSchemaFee {
  id: string;
  partner_id: string;
  price_type: 'MONTHLY';
  amount: number;
  currency: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  partner?: {
    id: string;
    name: string;
  };
}

interface FormData {
  partner_id: string;
  amount: number;
  currency: string;
  description: string;
  is_active: boolean;
}

const CURRENCIES = [
  { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
];

const AlignedPartnerSchemaFeeManagement: React.FC = () => {
  const { t } = useTranslation();
  const [fees, setFees] = useState<PartnerSchemaFee[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedFee, setSelectedFee] = useState<PartnerSchemaFee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<PartnerSchemaFee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    partner_id: '',
    amount: 0,
    currency: 'IDR',
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedFees, setSelectedFees] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete'>('activate');

  useEffect(() => {
    loadFees();
    loadPartners();
  }, []);

  const loadFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPartnerSchemaFees();
      setFees(response.data);
    } catch (err: any) {
      console.error('Error loading partner schema fees:', err);
      setError(err.response?.data?.message || 'Failed to load partner schema fees');
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const response = await apiService.getPartners();
      setPartners(response.data);
    } catch (err: any) {
      console.error('Error loading partners:', err);
    }
  };

  const handleCreateFee = () => {
    setDialogMode('create');
    setSelectedFee(null);
    setFormData({
      partner_id: '',
      amount: 0,
      currency: 'IDR',
      description: '',
      is_active: true,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleEditFee = (fee: PartnerSchemaFee) => {
    setDialogMode('edit');
    setSelectedFee(fee);
    setFormData({
      partner_id: fee.partner_id,
      amount: fee.amount,
      currency: fee.currency,
      description: fee.description || '',
      is_active: fee.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleViewFee = (fee: PartnerSchemaFee) => {
    setDialogMode('view');
    setSelectedFee(fee);
    setDialogOpen(true);
  };

  const handleDeleteFee = (fee: PartnerSchemaFee) => {
    setFeeToDelete(fee);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.partner_id) {
      errors.partner_id = 'Partner is required';
    }

    if (formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }

    if (!formData.currency) {
      errors.currency = 'Currency is required';
    }

    // Check if partner already has an active fee
    const existingFee = fees.find(fee => 
      fee.partner_id === formData.partner_id && 
      fee.is_active && 
      fee.id !== selectedFee?.id
    );
    
    if (existingFee) {
      errors.partner_id = 'Partner already has an active fee';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      if (dialogMode === 'create') {
        await apiService.createPartnerSchemaFee(formData);
      } else if (dialogMode === 'edit' && selectedFee) {
        await apiService.updatePartnerSchemaFee(selectedFee.id, formData);
      }

      setDialogOpen(false);
      await loadFees();
    } catch (err: any) {
      console.error('Error saving partner schema fee:', err);
      setError(err.response?.data?.message || 'Failed to save partner schema fee');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!feeToDelete) return;

    try {
      await apiService.deletePartnerSchemaFee(feeToDelete.id);
      setDeleteDialogOpen(false);
      setFeeToDelete(null);
      await loadFees();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to delete partner schema fee');
    }
  };

  const handleSelectAll = () => {
    if (selectedFees.size === filteredFees.length) {
      setSelectedFees(new Set());
    } else {
      setSelectedFees(new Set(filteredFees.map(fee => fee.id)));
    }
  };

  const handleSelectFee = (feeId: string) => {
    const newSelected = new Set(selectedFees);
    if (newSelected.has(feeId)) {
      newSelected.delete(feeId);
    } else {
      newSelected.add(feeId);
    }
    setSelectedFees(newSelected);
  };

  const handleBulkAction = async () => {
    if (selectedFees.size === 0) return;

    try {
      const promises = Array.from(selectedFees).map(feeId => {
        const fee = fees.find(f => f.id === feeId);
        if (!fee) return Promise.resolve();

        const updateData = { ...fee };
        
        switch (bulkAction) {
          case 'activate':
            updateData.is_active = true;
            break;
          case 'deactivate':
            updateData.is_active = false;
            break;
          case 'delete':
            return apiService.deletePartnerSchemaFee(feeId);
          default:
            return Promise.resolve();
        }
        
        return apiService.updatePartnerSchemaFee(feeId, updateData);
      });

      await Promise.all(promises);
      await loadFees();
      setSelectedFees(new Set());
      setBulkActionDialogOpen(false);
    } catch (err: any) {
      console.error('Error performing bulk action:', err);
      setError(err.response?.data?.message || 'Failed to perform bulk action');
    }
  };

  const filteredFees = fees.filter(fee => {
    const partnerName = fee.partner?.name || partners.find(p => p.id === fee.partner_id)?.name || '';
    return (
      partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fee.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const paginatedFees = filteredFees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const formatCurrency = (amount: number, currency: string) => {
    const formatters = {
      IDR: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      SGD: new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }),
      MYR: new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR' }),
    };
    return formatters[currency as keyof typeof formatters]?.format(amount) || `${currency} ${amount}`;
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
          {t('partnersManagement')} - {t('revenue')} {t('settings')}
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
                <FeeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
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
                <PartnerIcon sx={{ fontSize: 40, color: 'success.main' }} />
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
                    {t('totalRevenue')}
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(
                      fees.reduce((sum, fee) => sum + fee.amount, 0),
                      fees[0]?.currency || 'IDR'
                    )}
                  </Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder={t('search') + ' partner fees...'}
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

      {/* Partner Schema Fees Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Partner</TableCell>
                <TableCell>Price Type</TableCell>
                <TableCell>{t('budget')}</TableCell>
                <TableCell>Currency</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell>{t('description')}</TableCell>
                <TableCell>{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedFees.map((fee) => {
                const partnerName = fee.partner?.name || partners.find(p => p.id === fee.partner_id)?.name || fee.partner_id;
                return (
                  <TableRow key={fee.id}>
                    <TableCell>{partnerName}</TableCell>
                    <TableCell>
                      <Chip
                        label="MONTHLY"
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(fee.amount, fee.currency)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fee.currency}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fee.is_active ? t('active') : t('inactive')}
                        color={fee.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{fee.description || 'N/A'}</TableCell>
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
          {dialogMode === 'create' ? t('createPartner') + ' Fee Schema' : 
           dialogMode === 'edit' ? t('editPartner') + ' Fee Schema' : t('view') + ' Partner Fee Schema'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.partner_id}>
                <InputLabel>Partner</InputLabel>
                <Select
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  disabled={dialogMode === 'view'}
                >
                  {partners.map((partner) => (
                    <MenuItem key={partner.id} value={partner.id}>
                      {partner.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Price Type</InputLabel>
                <Select
                  value="MONTHLY"
                  disabled
                >
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('budget')}
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                error={!!formErrors.amount}
                helperText={formErrors.amount}
                disabled={dialogMode === 'view'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!formErrors.currency}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  disabled={dialogMode === 'view'}
                >
                  {CURRENCIES.map((curr) => (
                    <MenuItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            Apakah Anda yakin ingin menghapus skema biaya untuk partner ini? Tindakan ini tidak dapat dibatalkan.
            <br />
            Are you sure you want to delete this partner fee schema? This action cannot be undone.
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

export default AlignedPartnerSchemaFeeManagement;
