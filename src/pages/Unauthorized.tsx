import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { Block as BlockIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoToDashboard = () => {
    const dashboardPath = user?.role === 'admin' 
      ? '/admin' 
      : user?.role === 'partner' 
        ? '/partner' 
        : '/merchant';
    navigate(dashboardPath);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <BlockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom color="error">
            Access Denied
          </Typography>
          
          <Typography variant="h6" gutterBottom color="textSecondary">
            You don't have permission to access this page
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 4 }} color="textSecondary">
            Your current role ({user?.role}) doesn't have the necessary permissions 
            to view this content. Please contact your administrator if you believe 
            this is an error.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleGoToDashboard}
              size="large"
            >
              Go to Dashboard
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleGoBack}
              size="large"
            >
              Go Back
            </Button>
            
            <Button
              variant="text"
              onClick={handleLogout}
              size="large"
              color="error"
            >
              Logout
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;
