import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Store as StoreIcon,
  DeviceHub as DeviceIcon,
  Campaign as CampaignIcon,
  Receipt as ReceiptIcon,
  AccountBalance as SettlementIcon,
  Assessment as ReportsIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  AttachMoney as FeeSchemaIcon,
  CloudUpload as AssetsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const drawerWidth = 240;

interface NavigationItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: UserRole[];
}

const navigationItems: NavigationItem[] = [
  {
    text: 'Dashboard',
    icon: <DashboardIcon />,
    path: '',
    roles: ['admin', 'partner', 'merchant'],
  },
  {
    text: 'Users',
    icon: <PeopleIcon />,
    path: '/users',
    roles: ['admin'],
  },
  {
    text: 'Partners',
    icon: <BusinessIcon />,
    path: '/partners',
    roles: ['admin'],
  },
  {
    text: 'Merchants',
    icon: <StoreIcon />,
    path: '/merchants',
    roles: ['admin', 'partner'],
  },
  {
    text: 'Devices',
    icon: <DeviceIcon />,
    path: '/devices',
    roles: ['admin', 'partner', 'merchant'],
  },
  {
    text: 'Advertisements',
    icon: <CampaignIcon />,
    path: '/advertisements',
    roles: ['admin', 'partner'],
  },
  {
    text: 'Assets',
    icon: <AssetsIcon />,
    path: '/assets',
    roles: ['admin'],
  },
  {
    text: 'Partner Fees',
    icon: <FeeSchemaIcon />,
    path: '/partner-fees',
    roles: ['admin'],
  },
  {
    text: 'Business Fees',
    icon: <ReceiptIcon />,
    path: '/business-fees',
    roles: ['admin'],
  },
  {
    text: 'Revenue Management',
    icon: <SettlementIcon />,
    path: '/revenue',
    roles: ['admin'],
  },
  {
    text: 'Reports',
    icon: <ReportsIcon />,
    path: '/reports',
    roles: ['admin', 'partner', 'merchant'],
  },
];

const Layout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user, logout, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleProfileMenuClose();
    navigate('/login');
  };

  const getBasePath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'partner') return '/partner';
    return '/merchant';
  };

  const isActive = (path: string) => {
    const basePath = getBasePath();
    const fullPath = basePath + path;
    return location.pathname === fullPath;
  };

  const handleNavigation = (path: string) => {
    const basePath = getBasePath();
    navigate(basePath + path);
    setMobileOpen(false);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'partner':
        return 'primary';
      case 'merchant':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const drawer = (
    <div>
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1}>
          <img 
            src="/logo192.png" 
            alt="Glassbox" 
            style={{ height: 32, width: 32 }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <Typography variant="h6" noWrap component="div">
            Glassbox Admin
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems
          .filter(item => hasAnyRole(item.roles))
          .map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {user?.role === 'admin' && 'Admin Dashboard'}
            {user?.role === 'partner' && 'Partner Dashboard'}
            {user?.role === 'merchant' && 'Merchant Dashboard'}
          </Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              label={user?.role?.toUpperCase()}
              color={getRoleColor(user?.role as UserRole)}
              size="small"
              variant="outlined"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            />
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="profile-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32 }}>
                {user?.name?.charAt(0).toUpperCase() || <AccountIcon />}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem disabled>
          <Box>
            <Typography variant="subtitle2">{user?.name}</Typography>
            <Typography variant="caption" color="textSecondary">
              {user?.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
