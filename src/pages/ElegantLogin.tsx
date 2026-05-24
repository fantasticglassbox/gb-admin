import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  useTheme,
  alpha,
  InputAdornment,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
  TvOutlined,
  CampaignOutlined,
  InsightsOutlined,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { LoginRequest } from '../types';

const ElegantLogin: React.FC = () => {
  const theme = useTheme();
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(formData);
      navigate(from, { replace: true });
    } catch {
      // Handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        // Stack vertically on mobile, two columns from md up.
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      {/* ─── LEFT: brand / hero panel ────────────────────────────── */}
      <Box
        sx={{
          // Hide entirely below md so the form gets the whole viewport.
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 55%, ${theme.palette.secondary.main} 100%)`,
          color: theme.palette.common.white,
          p: 8,
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Soft floating orbs — decorative, behind content */}
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            left: '-10%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: alpha(theme.palette.common.white, 0.08),
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-15%',
            right: '-10%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: alpha(theme.palette.secondary.light, 0.18),
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />

        {/* Top: logo + wordmark */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            component="img"
            src="/logo.webp"
            alt="Glassbox"
            sx={{
              height: 44,
              width: 'auto',
              objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
              opacity: 0.95,
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '0.02em' }}>
            Glassbox Media
          </Typography>
        </Stack>

        {/* Middle: tagline + supporting line */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{ fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', mb: 2 }}
          >
            Kelola jaringan iklan layar Anda dari satu tempat.
          </Typography>
          <Typography
            variant="body1"
            sx={{ opacity: 0.85, maxWidth: 460, lineHeight: 1.6 }}
          >
            Platform DOOH untuk pasar Indonesia — pantau perangkat, jadwalkan
            kampanye, dan kelola pendapatan partner-merchant secara real-time.
          </Typography>

          <Stack direction="row" spacing={4} sx={{ mt: 5 }}>
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.9 }}>
                <TvOutlined fontSize="small" />
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Perangkat aktif
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                847
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: alpha('#fff', 0.2) }} />
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.9 }}>
                <CampaignOutlined fontSize="small" />
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Kampanye LIVE
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                23
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: alpha('#fff', 0.2) }} />
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.9 }}>
                <InsightsOutlined fontSize="small" />
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Tayang hari ini
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                1,2 jt
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Bottom: legal */}
        <Typography variant="caption" sx={{ position: 'relative', zIndex: 1, opacity: 0.7 }}>
          © {new Date().getFullYear()} Glassbox Media · Jakarta, Indonesia
        </Typography>
      </Box>

      {/* ─── RIGHT: form panel ───────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Soft tinted background on mobile (where hero is hidden) so the
          // form still feels framed.
          backgroundColor: { xs: alpha(theme.palette.primary.main, 0.04), md: 'background.paper' },
          px: { xs: 3, sm: 6, md: 10 },
          py: { xs: 8, md: 0 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile-only logo (hero is hidden < md) */}
          <Box
            sx={{
              display: { xs: 'flex', md: 'none' },
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Box component="img" src="/logo.webp" alt="Glassbox" sx={{ height: 56 }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Masuk
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Gunakan akun admin / partner / merchant Anda untuk mengakses dashboard.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              name="username"
              label="Username"
              autoComplete="username"
              autoFocus
              value={formData.username}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isSubmitting}
              required
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      disabled={isSubmitting}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
              <Typography
                variant="body2"
                component="a"
                href="#"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Lupa password?
              </Typography>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting || !formData.username || !formData.password}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: '0 4px 12px 0 rgb(0 0 0 / 0.15)',
                '&:hover': {
                  boxShadow: '0 8px 25px 0 rgb(0 0 0 / 0.25)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {isSubmitting ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={20} color="inherit" />
                  <span>Sedang masuk…</span>
                </Stack>
              ) : (
                'Masuk'
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mt: 5 }}
          >
            Bantuan? Hubungi <a href="mailto:support@glassbox.id" style={{ color: 'inherit' }}>support@glassbox.id</a>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ElegantLogin;
