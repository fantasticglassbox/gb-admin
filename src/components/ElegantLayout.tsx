import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Badge,
  Paper,
  useTheme,
  alpha,
  Select,
  FormControl,
  Tooltip,
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
  Analytics as AssessmentIcon,
  Calculate as CalculateIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as AccountIcon,
  AttachMoney as FeeSchemaIcon,
  CloudUpload as AssetsIcon,
  Notifications as NotificationIcon,
  Search as SearchIcon,
  Language as LanguageIcon,
  AppRegistration as RegistrationIcon,
  Public as DemographyIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

const drawerWidth = 280;

interface NavigationItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  roles: UserRole[];
  badge?: number;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const getNavigationSections = (t: any): NavigationSection[] => [
  // Dashboard Section
  {
    title: '',
    items: [
      {
        text: t('dashboard'),
        icon: <DashboardIcon />,
        path: '',
        roles: ['admin', 'partner', 'merchant'],
      },
    ]
  },
  
  // Entity Management Section
  {
    title: t('entityManagement'),
    items: [
      {
        text: t('usersManagement'),
        icon: <PeopleIcon />,
        path: 'users',
        roles: ['admin'],
      },
      {
        text: t('partnersManagement'),
        icon: <BusinessIcon />,
        path: 'partners',
        roles: ['admin'],
      },
      {
        text: t('merchantsManagement'),
        icon: <StoreIcon />,
        path: 'merchants',
        roles: ['admin'],
      },
    ]
  },

  // Device & Infrastructure Section
  {
    title: t('deviceInfrastructure'),
    items: [
      {
        text: t('devicesManagement'),
        icon: <DeviceIcon />,
        path: 'devices',
        roles: ['admin', 'partner'],
      },
      {
        text: t('deviceRegistration'),
        icon: <RegistrationIcon />,
        path: 'device-registration',
        roles: ['admin'],
      },
      {
        text: t('deviceDemography'),
        icon: <DemographyIcon />,
        path: 'demography',
        roles: ['admin'],
      },
    ]
  },

  // Content & Campaign Management Section
  {
    title: t('contentCampaigns'),
    items: [
      {
        text: t('advertisementsManagement'),
        icon: <CampaignIcon />,
        path: 'advertisements',
        roles: ['admin', 'partner', 'merchant'],
      },
      {
        text: t('assetsManagement'),
        icon: <AssetsIcon />,
        path: 'assets',
        roles: ['admin'],
      },
    ]
  },

  // Financial Management Section
  {
    title: t('financialManagement'),
    items: [
      {
        text: t('revenue'),
        icon: <FeeSchemaIcon />,
        path: 'detailed-revenue',
        roles: ['merchant'],
      },
      {
        text: t('partnerFees'),
        icon: <FeeSchemaIcon />,
        path: 'partner-fees',
        roles: ['admin'],
      },
      {
        text: t('businessFees'),
        icon: <ReceiptIcon />,
        path: 'business-fees',
        roles: ['admin'],
      },
      {
        text: t('revenueGeneration'),
        icon: <CalculateIcon />,
        path: 'revenue-generation',
        roles: ['admin'],
      },
      {
        text: t('detailedRevenueReport'),
        icon: <AssessmentIcon />,
        path: 'detailed-revenue',
        roles: ['admin'],
      },
    ]
  },
];

const ElegantLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const getBasePath = () => {
    const pathSegments = location.pathname.split('/');
    return pathSegments[1]; // 'admin', 'partner', or 'merchant'
  };

  const getCurrentPath = () => {
    const pathSegments = location.pathname.split('/');
    return pathSegments[2] || ''; // the sub-path after role
  };

  const navigationSections = getNavigationSections(t);

  const getFilteredNavigationSections = () => {
    if (!user) return [];
    return navigationSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.roles.includes(user.role as UserRole)
        )
      }))
      .filter(section => section.items.length > 0);
  };

  const getPageTitle = () => {
    const currentPath = getCurrentPath();
    for (const section of navigationSections) {
      const currentItem = section.items.find(item => item.path === currentPath);
      if (currentItem) {
        return currentItem.text;
      }
    }
    return t('dashboard');
  };

  const drawer = (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        background: `linear-gradient(180deg, 
          ${alpha(theme.palette.primary.main, 0.05)} 0%, 
          ${alpha(theme.palette.primary.main, 0.02)} 50%,
          ${alpha(theme.palette.background.paper, 0.95)} 100%
        )`,
        backdropFilter: 'blur(20px)',
        borderRight: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.main, 0.08)} 0%, 
            ${alpha(theme.palette.primary.main, 0.03)} 100%
          )`,
        }}
      >
        <Box
          component="img"
          src="/logo.webp"
          alt="Glassbox Logo"
          sx={{
            height: 40,
            width: 'auto',
            maxWidth: 120,
            objectFit: 'contain',
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        />
        <Box sx={{ ml: 1 }}>
          <Typography
            variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'block',
                lineHeight: 1,
              }}
          >
            Admin Portal
          </Typography>
        </Box>
      </Box>


      {/* Navigation */}
      <Box sx={{ flex: 1, px: 2, py: 1.5, overflowY: 'auto' }}>
        {getFilteredNavigationSections().map((section, sectionIndex) => (
          <Box key={section.title || 'dashboard'} sx={{ mb: 1.5 }}>
            {/* Section Title */}
            {section.title && (
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  px: 2,
                  py: 0.5,
                  display: 'block',
                  mb: 0.5,
                }}
              >
                {section.title}
              </Typography>
            )}
            
            {/* Section Items */}
            <List disablePadding>
              {section.items.map((item) => {
                const isActive = getCurrentPath() === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.2 }}>
                    <ListItemButton
                      onClick={() => navigate(`/${getBasePath()}/${item.path}`)}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        px: 2,
                        color: isActive ? 'white' : theme.palette.text.primary,
                        backgroundColor: isActive
                          ? theme.palette.primary.main
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: isActive
                            ? theme.palette.primary.dark
                            : alpha(theme.palette.primary.main, 0.08),
                          color: isActive ? 'white' : theme.palette.primary.dark,
                        },
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          color: 'inherit',
                          minWidth: 36,
                        }}
                      >
                        {item.badge ? (
                          <Badge badgeContent={item.badge} color="error">
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.85rem',
                            fontWeight: isActive ? 600 : 500,
                          },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
            
            {/* Section Divider */}
            {sectionIndex < getFilteredNavigationSections().length - 1 && (
              <Divider 
                sx={{ 
                  my: 1,
                  mx: 2,
                  borderColor: alpha(theme.palette.primary.main, 0.1),
                }} 
              />
            )}
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          background: `linear-gradient(135deg, 
            ${alpha(theme.palette.primary.main, 0.04)} 0%, 
            ${alpha(theme.palette.primary.main, 0.01)} 100%
          )`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: '0.7rem',
            textAlign: 'center',
            display: 'block',
          }}
        >
          © 2024 Glassbox Media
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ 
                mr: 2, 
                display: { sm: 'none' },
                color: theme.palette.text.primary,
              }}
            >
              <MenuIcon />
            </IconButton>
            
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  fontSize: '1.5rem',
                }}
              >
                {getPageTitle()}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.875rem',
                }}
              >
                {t('welcomeBack')}, {user?.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              sx={{ 
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <SearchIcon />
            </IconButton>
            
            <IconButton
              sx={{ 
                color: theme.palette.text.primary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationIcon />
              </Badge>
            </IconButton>

            {/* Language Switcher */}
            <FormControl size="small" sx={{ minWidth: 70 }}>
              <Select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                variant="outlined"
                sx={{
                  height: 36,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    '& fieldset': {
                      borderColor: alpha(theme.palette.primary.main, 0.2),
                    },
                    '&:hover fieldset': {
                      borderColor: alpha(theme.palette.primary.main, 0.4),
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiSelect-select': {
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  },
                  '& .MuiSelect-icon': {
                    color: theme.palette.text.secondary,
                  },
                }}
              >
                <MenuItem value="en" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  🇺🇸 EN
                </MenuItem>
                <MenuItem value="id" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  🇮🇩 ID
                </MenuItem>
              </Select>
            </FormControl>

            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ 
                ml: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Avatar
                sx={{
                  bgcolor: theme.palette.primary.main,
                  width: 36,
                  height: 36,
                  fontSize: '0.875rem',
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        sx={{ mt: 1 }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          },
        }}
      >
        <MenuItem onClick={handleProfileMenuClose} sx={{ py: 1.5 }}>
          <AccountIcon sx={{ mr: 2 }} />
          {t('profileSettings')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: theme.palette.error.main }}>
          <LogoutIcon sx={{ mr: 2 }} />
          {t('signOut')}
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default ElegantLayout;
