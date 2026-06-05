import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Direction-C "Indonesia warm-modern" palette anchored on the existing
// Glassbox brand color #0BA6DF. The shift from the previous theme is in
// the *surround*, not the accent: linen background instead of cool
// white, coffee-toned text instead of cool grey, soft warm shadows
// instead of black. Buttons drop the gradient — flat primary reads as
// more confident and matches the SME visual culture this direction
// borrows from (Tokopedia / Gojek / Mandiri).
const colors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f4ff',
    200: '#b8e6ff',
    300: '#7dd1ff',
    400: '#3fb9ff',
    500: '#0BA6DF', // Glassbox brand color — kept exactly
    600: '#0891c7',
    700: '#0773a3',
    800: '#0a5f85',
    900: '#0d4f6e',
  },
  // Accent — promoted to first-class. Used for "needs attention"
  // states like pending payout, awaiting approval, KPI emphasis.
  // Matches the existing #f97316 already declared as secondary.
  secondary: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#F97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16A34A',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#DC2626', // Terracotta — firm but warm
    600: '#b91c1c',
    700: '#991b1b',
    800: '#7f1d1d',
    900: '#7f1d1d',
  },
  // Coffee-toned neutrals replace cool grey. Numbers chosen so that
  // contrast ratios against the linen background stay AA on body+.
  neutral: {
    50: '#FAF7F2',  // Linen — page background
    100: '#F5F1EA', // Linen-2 — zebra rows, soft surfaces
    200: '#E8E2D7', // Stone — borders, dividers
    300: '#D4CCBE', // Pebble — disabled fills
    400: '#9B948C', // Coffee-light — placeholders, soft text
    500: '#6B645C', // Coffee-mid — captions, secondary text
    600: '#54504A', // Coffee-deep — body alt
    700: '#3D3935', // Coffee-warm — headings
    800: '#2C2825', // Coffee — body
    900: '#1A1816', // Espresso — display headings
  },
};

// Warm shadow stack — rgba(120, 90, 60) instead of rgb(0,0,0), so
// shadows read as falling on linen, not on paper. Intensities tuned
// so the rest/hover/modal levels are visibly distinct.
const warmShadow = {
  rest: '0 1px 2px rgba(120, 90, 60, 0.06)',
  raised: '0 4px 12px rgba(120, 90, 60, 0.08)',
  hover: '0 8px 24px rgba(120, 90, 60, 0.10)',
  modal: '0 24px 48px rgba(60, 40, 20, 0.18)',
};

export const elegantTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary[500],
      light: colors.primary[400],
      dark: colors.primary[700],
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.secondary[500],
      light: colors.secondary[400],
      dark: colors.secondary[700],
      contrastText: '#ffffff',
    },
    success: { main: colors.success[600], light: colors.success[400], dark: colors.success[800] },
    warning: { main: colors.warning[500], light: colors.warning[400], dark: colors.warning[700] },
    error: { main: colors.error[500], light: colors.error[400], dark: colors.error[700] },
    background: {
      default: colors.neutral[50], // Linen
      paper: '#FFFFFF',
    },
    text: {
      primary: colors.neutral[800],   // Coffee
      secondary: colors.neutral[500], // Coffee-mid
    },
    divider: colors.neutral[200],
  },
  typography: {
    // Plus Jakarta Sans — designed for Jakarta. JetBrains Mono only for
    // monospaced contexts (UUIDs, API keys, code).
    fontFamily:
      '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: '-0.02em',
      color: colors.neutral[900],
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.015em',
      color: colors.neutral[900],
    },
    h3: {
      fontSize: '1.625rem',
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: '-0.01em',
      color: colors.neutral[800],
    },
    h4: {
      fontSize: '1.375rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.005em',
      color: colors.neutral[800],
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.35,
      color: colors.neutral[800],
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: colors.neutral[800],
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.55,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 500,
      letterSpacing: '0.02em',
      lineHeight: 1.4,
      color: colors.neutral[500],
    },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: colors.neutral[500],
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  // MUI's shadow stack — fill 1..24 but pre-warm the ones we actually
  // use (1/2/8). Higher levels keep a warm color and just intensify.
  shadows: [
    'none',
    warmShadow.rest,
    warmShadow.raised,
    warmShadow.hover,
    warmShadow.hover,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
    warmShadow.modal,
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.neutral[50],
          // No decorative pattern — let the linen warmth carry the
          // surface character. Cool blue dots in the previous theme
          // pulled the whole page toward "tech SaaS" feel.
          fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '9px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 160ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: 'none', // Direction C: confident flat, no lift
          },
        },
        // Flat primary — drops the previous gradient. Cleaner read,
        // matches SME visual culture better than glossy SaaS.
        contained: {
          backgroundColor: colors.primary[500],
          '&:hover': {
            backgroundColor: colors.primary[600],
          },
        },
        containedSecondary: {
          backgroundColor: colors.secondary[500],
          '&:hover': {
            backgroundColor: colors.secondary[600],
          },
        },
        outlined: {
          borderWidth: 1.5,
          borderColor: colors.neutral[200],
          color: colors.neutral[800],
          '&:hover': {
            borderWidth: 1.5,
            borderColor: colors.primary[400],
            backgroundColor: alpha(colors.primary[500], 0.04),
          },
        },
        text: {
          color: colors.primary[600],
          '&:hover': {
            backgroundColor: alpha(colors.primary[500], 0.06),
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: warmShadow.rest,
          border: `1px solid ${colors.neutral[200]}`,
          backgroundColor: '#FFFFFF',
          transition: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: warmShadow.raised,
            transform: 'none', // No lift; warmth comes from shadow color
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: warmShadow.rest,
          border: `1px solid ${colors.neutral[200]}`,
          backgroundColor: '#FFFFFF',
          backgroundImage: 'none', // Kill MUI's elevation gradient
        },
        elevation1: { boxShadow: warmShadow.rest },
        elevation2: { boxShadow: warmShadow.raised },
        elevation3: { boxShadow: warmShadow.hover },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            transition: 'all 160ms cubic-bezier(0.4, 0, 0.2, 1)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.neutral[200],
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.primary[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: colors.primary[500],
            },
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(colors.primary[500], 0.12)}`,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999, // True pill shape
          fontWeight: 600,
          fontSize: '0.75rem',
          height: 26,
          letterSpacing: '0.01em',
        },
        filled: {
          backgroundColor: colors.neutral[100],
          color: colors.neutral[700],
        },
        outlined: {
          borderColor: colors.neutral[200],
          backgroundColor: '#FFFFFF',
        },
        colorPrimary: {
          backgroundColor: colors.primary[100],
          color: colors.primary[800],
        },
        colorSecondary: {
          backgroundColor: colors.secondary[100],
          color: colors.secondary[800],
        },
        colorSuccess: {
          backgroundColor: colors.success[100],
          color: colors.success[800],
        },
        colorWarning: {
          backgroundColor: colors.secondary[100], // Warning = use accent orange
          color: colors.secondary[800],
        },
        colorError: {
          backgroundColor: colors.error[100],
          color: colors.error[700],
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: 'all 160ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: alpha(colors.primary[500], 0.08),
            transform: 'none', // No scale; warmth is enough
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          backgroundColor: '#FFFFFF',
          borderRight: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: `1px solid ${colors.neutral[200]}`,
          background: 'rgba(250, 247, 242, 0.85)', // Linen, semi-translucent
          backdropFilter: 'blur(16px)',
          color: colors.neutral[800],
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${colors.neutral[200]}`,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: colors.neutral[100], // Linen-2
          '& .MuiTableCell-head': {
            fontWeight: 700,
            color: colors.neutral[700],
            fontSize: '0.75rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: colors.neutral[200],
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(colors.primary[500], 0.025),
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: warmShadow.modal,
        },
      },
    },
  },
});

// Utility — semantic tokens that pages can opt-in to without reaching
// into the theme object directly. Reused by the per-page reskin work.
export const glassboxTokens = {
  surface: {
    linen: colors.neutral[50],
    linen2: colors.neutral[100],
    paper: '#FFFFFF',
  },
  text: {
    coffee: colors.neutral[800],
    coffeeMid: colors.neutral[500],
    coffeeSoft: colors.neutral[400],
    espresso: colors.neutral[900],
  },
  border: {
    stone: colors.neutral[200],
  },
  shadow: warmShadow,
  // For money/KPI numbers — tabular nums + slight tracking adjustment
  // keeps Rp values column-aligned across rows.
  tabularNum: {
    fontFeatureSettings: '"tnum" 1, "lnum" 1',
    fontVariantNumeric: 'tabular-nums lining-nums',
  } as const,
  mono: {
    fontFamily: '"JetBrains Mono", "Menlo", "Monaco", monospace',
  } as const,
};

export default elegantTheme;
