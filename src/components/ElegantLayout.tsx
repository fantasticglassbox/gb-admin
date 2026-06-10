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
  Language as LanguageIcon,
  AppRegistration as RegistrationIcon,
  Public as DemographyIcon,
  VpnKey as IntegrationsIcon,
  Insights as AnalyticsIcon,
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
        roles: ['admin', 'partner', 'merchant', 'publisher', 'venue_partner'],
      },
      {
        // V2 — per-role analytics (publisher: approval funnel, top
        // venues/brands, settlement trend; venue: fleet status, queue
        // trend, top advertisers, settlement trend). Playback panels
        // show empty-state until devices start reporting.
        text: 'Analytics',
        icon: <AnalyticsIcon />,
        path: 'analytics',
        roles: ['publisher', 'venue_partner'],
      },
    ]
  },

  // Content & Campaign Management Section — pulled up to second position
  // because the day-to-day CMS work happens here.
  {
    title: t('contentCampaigns'),
    items: [
      {
        // V2 — campaigns own multiple zone-pinned creatives and are the
        // atomic unit of submission. New work goes here.
        text: 'Campaigns',
        icon: <CampaignIcon />,
        path: 'campaigns',
        roles: ['admin', 'publisher'],
      },
      {
        // V1 advertisements — legacy page kept for partner/merchant roles
        // that haven't migrated to the campaign model yet. Hidden from
        // admin/publisher to push them to the new Campaigns page.
        text: t('advertisementsManagement'),
        icon: <CampaignIcon />,
        path: 'advertisements',
        roles: ['partner', 'merchant'],
      },
      {
        // V2 booking flow. Approvals are venue-side decisions, so only
        // admin (platform-wide visibility) and venue_partner (own queue)
        // see this nav entry. Publishers track their own submissions
        // from the Campaigns list — surfacing approval state on the
        // campaign row keeps it in their "creator" mental model rather
        // than asking them to context-switch into a venue UI.
        text: 'Campaign Approvals',
        icon: <CampaignIcon />,
        path: 'approvals',
        roles: ['admin'],
      },
      {
        text: 'Approval Queue',
        icon: <CampaignIcon />,
        path: 'approvals',
        roles: ['venue_partner'],
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
      // Legacy V1 "Partners" and "Merchants" nav items are hidden from
      // the sidebar in May 2026 — replaced by V2 Publishers + Venue
      // Partners below. The routes are kept mounted in App.tsx so any
      // bookmarks still work; just no nav entry points to them.
      {
        // V2 entity — venue chains (landlord side) with nested outlets.
        text: 'Venue Partners',
        icon: <StoreIcon />,
        path: 'venue-partners',
        roles: ['admin'],
      },
      {
        // Admin cross-venue outlet view — empty until a venue is
        // picked. Distinct from the venue_partner-scoped "Outlets"
        // entry below; the page itself differs (admin can pick any
        // venue, venue_partner can only see their own).
        text: 'Outlets',
        icon: <StoreIcon />,
        path: 'outlets',
        roles: ['admin'],
      },
      {
        // Curated outlet groups for targeting. Lets admin define
        // VENUE_CURATED sets the publisher picker exposes alongside
        // ANY (all outlets) and SYSTEM_AUTO (by city / province).
        text: 'Outlet groups',
        icon: <StoreIcon />,
        path: 'outlet-groups',
        roles: ['admin'],
      },
      {
        // V2 entity — publisher (seller side) with nested advertisers.
        // Sits next to Partners; once V2 supersedes V1, the legacy
        // Partners entry can retire.
        text: 'Publishers',
        icon: <BusinessIcon />,
        path: 'publishers',
        roles: ['admin'],
      },
      {
        // Admin cross-publisher advertiser view — empty until a
        // publisher is picked. Distinct from the publisher-scoped
        // "Advertisers" entry below.
        text: 'Advertisers',
        icon: <BusinessIcon />,
        path: 'advertisers',
        roles: ['admin'],
      },
      {
        // Scoped self-serve view for publisher role — same master/detail
        // page, but the backend filters to the user's own publisher_id.
        text: 'Advertisers',
        icon: <BusinessIcon />,
        path: 'advertisers',
        roles: ['publisher'],
      },
      {
        // Scoped self-serve view for venue_partner role.
        text: 'Outlets',
        icon: <StoreIcon />,
        path: 'outlets',
        roles: ['venue_partner'],
      },
      {
        // Venue partner manages their own curated outlet groups. The
        // page auto-pins to their venue via JWT; admin sees the
        // venue picker, venue_partner sees a read-only venue label.
        text: 'Outlet groups',
        icon: <StoreIcon />,
        path: 'outlet-groups',
        roles: ['venue_partner'],
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
        roles: ['admin', 'partner', 'venue_partner'],
      },
      {
        // Layouts catalog with per-template device counts + inline
        // Assign drawer. Coverage stats and the device list are
        // auto-scoped to the user's venue when role=venue_partner.
        text: 'Layouts',
        icon: <DeviceIcon />,
        path: 'layouts',
        roles: ['admin', 'venue_partner'],
      },
      // Device Registration nav entry removed — admins pair devices
      // directly from /admin/devices (header button + per-row actions).
      // The route stays mounted in App.tsx so bookmarked URLs still
      // resolve, but it isn't surfaced in the sidebar.
      {
        text: t('deviceDemography'),
        icon: <DemographyIcon />,
        path: 'demography',
        roles: ['admin'],
      },
    ]
  },

  // Financial Management Section. Legacy fee/revenue items
  // (partnerFees, businessFees, revenueGeneration, detailedRevenueReport,
  // assetsManagement) were removed from the sidebar in May 2026 — the
  // V2 Settlements page is now the only money surface.
  {
    title: t('financialManagement'),
    items: [
      {
        // V2 — manual revenue entries + waterfall splits + payment tracking.
        // Publisher/venue_partner see only their own rows (backend-scoped);
        // admin sees the full platform.
        text: 'Settlements',
        icon: <ReceiptIcon />,
        path: 'settlements',
        roles: ['admin', 'publisher', 'venue_partner'],
      },
    ]
  },

  // Integrations Section. Partner-integration API keys per venue
  // partner. Lives as its own section (admin-only) so key ops have a
  // dedicated home and don't get buried in the venue partner CRUD page.
  {
    title: 'Integrations',
    items: [
      {
        text: 'API Keys',
        icon: <IntegrationsIcon />,
        path: 'integrations',
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
    return pathSegments[1]; // 'admin' | 'partner' | 'merchant' | 'publisher' | 'venue'
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
      {/* Logo section — no card, no shadow, no divider. Just breathing room
          so the logo sits on the same continuous gradient as the nav below. */}
      <Box sx={{ px: 3, pt: 3.5, pb: 3, display: 'flex', alignItems: 'center' }}>
        <Box
          component="img"
          src="/logo.webp"
          alt="Glassbox"
          sx={{
            height: 36,
            width: 'auto',
            maxWidth: 160,
            objectFit: 'contain',
          }}
        />
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
                        // Soft pill with a left accent bar instead of a heavy
                        // filled rectangle. Active state stays visible but
                        // doesn't shout.
                        borderRadius: 2,
                        py: 1,
                        pl: 2,
                        pr: 2,
                        position: 'relative',
                        color: isActive ? theme.palette.primary.dark : theme.palette.text.primary,
                        backgroundColor: isActive
                          ? alpha(theme.palette.primary.main, 0.12)
                          : 'transparent',
                        '&::before': isActive
                          ? {
                              content: '""',
                              position: 'absolute',
                              left: 6,
                              top: 8,
                              bottom: 8,
                              width: 3,
                              borderRadius: 2,
                              backgroundColor: theme.palette.primary.main,
                            }
                          : undefined,
                        '&:hover': {
                          backgroundColor: isActive
                            ? alpha(theme.palette.primary.main, 0.16)
                            : alpha(theme.palette.primary.main, 0.06),
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
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: { xs: 56, sm: 64 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 },
              minWidth: 0,
              flex: 1,
            }}
          >
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: { xs: 0.5, sm: 2 },
                display: { sm: 'none' },
                color: theme.palette.text.primary,
              }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h5"
                noWrap
                sx={{
                  color: theme.palette.text.primary,
                  fontWeight: 700,
                  // Smaller on mobile so long titles ("Devices
                  // Management") don't push the right-side controls
                  // off-screen.
                  fontSize: { xs: '1rem', sm: '1.5rem' },
                }}
              >
                {getPageTitle()}
              </Typography>
              {/* Welcome subtitle is a personalisation flourish; on
                  a phone it's pure noise and pushes the page title
                  further from the content. Desktop keeps it. */}
              <Typography
                variant="body2"
                noWrap
                sx={{
                  color: theme.palette.text.secondary,
                  fontSize: '0.875rem',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {t('welcomeBack')}, {user?.name}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.25, sm: 1 } }}>
            {/* Search and notification icons removed — both were
                decorative placeholders (no handlers wired) and the
                badge count was hardcoded. Reclaim the toolbar space
                for the language switcher + avatar until either lands
                a real backend. */}

            {/* Language Switcher — narrower on mobile so the avatar
                doesn't get clipped. */}
            <FormControl size="small" sx={{ minWidth: { xs: 56, sm: 70 } }}>
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
        {/* Responsive content padding. 24px on desktop is generous;
            on a phone it eats almost 15% of the viewport width, so we
            tighten to 12px on xs and 16px on sm. Touching this once
            here propagates to every page inside the layout. */}
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default ElegantLayout;
