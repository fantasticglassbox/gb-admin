import React, { useState, useEffect, useCallback } from 'react';
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
  Drawer,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { User, UserRole, UserStatus, FilterOptions, Publisher, VenuePartner } from '../types';
import { apiService } from '../services/api';

const UsersManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'merchant' as UserRole,
    tid: '',
    publisher_id: '',
    venue_partner_id: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Entity dropdowns for publisher / venue_partner roles. Loaded once
  // when the dialog opens for one of those roles; cheap enough that we
  // don't paginate (CMS expects <100 of each at MVP scale).
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [venuePartners, setVenuePartners] = useState<VenuePartner[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: FilterOptions = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
      };

      if (searchTerm) {
        filters.search = searchTerm;
      }
      if (statusFilter) {
        filters.status = statusFilter;
      }

      const response = await apiService.getUsers(filters);
      setUsers(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPage(0);
  };

  const ensureEntitiesLoaded = useCallback(async () => {
    if (publishers.length > 0 && venuePartners.length > 0) return;
    setEntitiesLoading(true);
    try {
      const [pubs, vps] = await Promise.all([
        apiService.listPublishers({ limit: 200 }),
        apiService.listVenuePartners({ limit: 200 }),
      ]);
      setPublishers(pubs.data);
      setVenuePartners(vps.data);
    } catch {
      // Non-fatal — the user can still pick admin/partner/merchant.
    } finally {
      setEntitiesLoading(false);
    }
  }, [publishers.length, venuePartners.length]);

  const handleCreateUser = () => {
    setDialogMode('create');
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'merchant',
      tid: '',
      publisher_id: '',
      venue_partner_id: '',
    });
    setFormErrors({});
    setDialogOpen(true);
    ensureEntitiesLoaded();
  };

  const handleEditUser = (user: User) => {
    setDialogMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username || user.name || '',
      password: '',
      role: user.role,
      tid: user.tid || '',
      publisher_id: user.publisher_id || '',
      venue_partner_id: user.venue_partner_id || '',
    });
    setFormErrors({});
    setDialogOpen(true);
    ensureEntitiesLoaded();
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (dialogMode === 'create' && !formData.password) {
      errors.password = 'Password is required';
    }

    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Per-role entity-FK validation. Mirrors backend ValidateEntityBinding
    // so we fail fast in the UI instead of round-tripping for the error.
    switch (formData.role) {
      case 'publisher':
        if (!formData.publisher_id) errors.publisher_id = 'Publisher is required';
        break;
      case 'venue_partner':
        if (!formData.venue_partner_id) errors.venue_partner_id = 'Venue partner is required';
        break;
      case 'partner':
      case 'merchant':
        if (!formData.tid) errors.tid = 'TID is required for this role';
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      
      if (dialogMode === 'create') {
        await apiService.createUser({
          username: formData.username,
          password: formData.password,
          role: formData.role,
          tid: formData.tid || undefined,
          publisher_id: formData.publisher_id || undefined,
          venue_partner_id: formData.venue_partner_id || undefined,
        });
      } else if (selectedUser) {
        const updateData: any = {
          username: formData.username,
          role: formData.role,
        };
        
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        if (formData.tid) {
          updateData.tid = formData.tid;
        }

        await apiService.updateUser(String(selectedUser.id), updateData);
      }

      setDialogOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await apiService.deleteUser(String(userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      await loadUsers();
      setSuccess('Operation completed successfully');
    } catch (err: any) {
      setError('Operation failed');
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'partner':
        return 'primary';
      case 'merchant':
        return 'secondary';
      case 'publisher':
        return 'info';
      case 'venue_partner':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: UserStatus) => {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {t('usersManagement')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
        >
          {t('createUser')}
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
            placeholder="Search users..."
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
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="suspended">Suspended</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadUsers}
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
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="textSecondary">
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PersonIcon color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.username || user.name || 'Unknown'}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={(user.role || 'unknown').toUpperCase()}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(user.status || 'active').toUpperCase()}
                        color={getStatusColor(user.status || 'active')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(user.created_at || new Date().toISOString())}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.last_login ? formatDate(user.last_login) : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          onClick={() => handleEditUser(user)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user)}
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

      {/* Create / edit user — right-side drawer (gb-admin form convention). */}
      <Drawer
        anchor="right"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 560 } } }}
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Create New User' : 'Edit User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={!!formErrors.username}
              helperText={formErrors.username}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label={dialogMode === 'create' ? 'Password' : 'New Password (leave blank to keep current)'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={!!formErrors.password}
              helperText={formErrors.password}
              margin="normal"
              required={dialogMode === 'create'}
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  // Clear entity fields that don't apply to the new role
                  // so a stale value can't slip through the binding check.
                  setFormData({
                    ...formData,
                    role,
                    tid: role === 'partner' || role === 'merchant' ? formData.tid : '',
                    publisher_id: role === 'publisher' ? formData.publisher_id : '',
                    venue_partner_id: role === 'venue_partner' ? formData.venue_partner_id : '',
                  });
                }}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="publisher">Publisher</MenuItem>
                <MenuItem value="venue_partner">Venue Partner</MenuItem>
                <MenuItem value="partner">Partner (legacy)</MenuItem>
                <MenuItem value="merchant">Merchant (legacy)</MenuItem>
              </Select>
            </FormControl>

            {formData.role === 'publisher' && (
              <FormControl fullWidth margin="normal" required error={!!formErrors.publisher_id}>
                <InputLabel>Publisher</InputLabel>
                <Select
                  value={formData.publisher_id}
                  label="Publisher"
                  onChange={(e) => setFormData({ ...formData, publisher_id: e.target.value as string })}
                  disabled={entitiesLoading}
                >
                  {publishers.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.display_name || p.legal_name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.publisher_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {formErrors.publisher_id}
                  </Typography>
                )}
              </FormControl>
            )}

            {formData.role === 'venue_partner' && (
              <FormControl fullWidth margin="normal" required error={!!formErrors.venue_partner_id}>
                <InputLabel>Venue Partner</InputLabel>
                <Select
                  value={formData.venue_partner_id}
                  label="Venue Partner"
                  onChange={(e) => setFormData({ ...formData, venue_partner_id: e.target.value as string })}
                  disabled={entitiesLoading}
                >
                  {venuePartners.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.display_name || v.legal_name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.venue_partner_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {formErrors.venue_partner_id}
                  </Typography>
                )}
              </FormControl>
            )}

            {(formData.role === 'partner' || formData.role === 'merchant') && (
              <TextField
                fullWidth
                label="TID"
                value={formData.tid}
                onChange={(e) => setFormData({ ...formData, tid: e.target.value })}
                margin="normal"
                required
                error={!!formErrors.tid}
                helperText={formErrors.tid || `Existing ${formData.role} ID this user logs in as`}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : (dialogMode === 'create' ? 'Create' : 'Update')}
          </Button>
        </DialogActions>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user "{userToDelete?.name}"? This action cannot be undone.
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

export default UsersManagement;
