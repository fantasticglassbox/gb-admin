import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Computer as ServerIcon,
  Storage as DatabaseIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  Timeline as MetricsIcon,
  Notifications as AlertsIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { SystemHealth, AuditLog } from '../types';
import { apiService } from '../services/api';

interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_in: number;
  network_out: number;
  active_connections: number;
  response_time: number;
  error_rate: number;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  last_check: string;
  response_time?: number;
  message?: string;
}

const SystemMonitoring: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadSystemData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [healthResponse, metricsResponse, auditResponse] = await Promise.all([
        apiService.getSystemHealth(),
        apiService.getSystemMetrics({ period: '1h' }),
        apiService.getAuditLogs({ limit: 10 }),
      ]);

      setSystemHealth(healthResponse);
      setMetrics(generateMockMetrics()); // Mock data for demo
      setServices(generateMockServices()); // Mock data for demo
      setAuditLogs(auditResponse.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  // Generate mock metrics data for demonstration
  const generateMockMetrics = (): SystemMetrics[] => {
    const now = new Date();
    const data = [];
    
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
      data.push({
        timestamp: time.toLocaleTimeString(),
        cpu_usage: Math.random() * 30 + 20, // 20-50%
        memory_usage: Math.random() * 20 + 60, // 60-80%
        disk_usage: Math.random() * 10 + 40, // 40-50%
        network_in: Math.random() * 100 + 50, // 50-150 MB/s
        network_out: Math.random() * 50 + 25, // 25-75 MB/s
        active_connections: Math.floor(Math.random() * 500 + 1000), // 1000-1500
        response_time: Math.random() * 100 + 50, // 50-150ms
        error_rate: Math.random() * 2, // 0-2%
      });
    }
    
    return data;
  };

  // Generate mock services data for demonstration
  const generateMockServices = (): ServiceStatus[] => {
    const services = [
      { name: 'API Gateway', baseUptime: 99.9 },
      { name: 'Authentication Service', baseUptime: 99.8 },
      { name: 'Database', baseUptime: 99.95 },
      { name: 'File Storage', baseUptime: 99.7 },
      { name: 'Payment Gateway', baseUptime: 99.6 },
      { name: 'Notification Service', baseUptime: 98.9 },
      { name: 'Analytics Engine', baseUptime: 99.4 },
      { name: 'CDN', baseUptime: 99.99 },
    ];

    return services.map(service => {
      const uptime = service.baseUptime + (Math.random() - 0.5) * 0.2;
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      
      if (uptime < 99) {
        status = 'error';
      } else if (uptime < 99.5) {
        status = 'warning';
      }

      return {
        name: service.name,
        status,
        uptime: `${uptime.toFixed(2)}%`,
        last_check: new Date(Date.now() - Math.random() * 60000).toISOString(),
        response_time: Math.random() * 200 + 50,
        message: status === 'error' ? 'Service degraded' : status === 'warning' ? 'Performance issues' : 'Service operational',
      };
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <HealthyIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <ServerIcon />;
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOverallHealth = () => {
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const warningCount = services.filter(s => s.status === 'warning').length;
    const errorCount = services.filter(s => s.status === 'error').length;

    if (errorCount > 0) return 'error';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          System Monitoring
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="body2" color="textSecondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSystemData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !systemHealth ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Overall System Status */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    {getStatusIcon(getOverallHealth())}
                    <Typography variant="h5">
                      System Status: {getOverallHealth().toUpperCase()}
                    </Typography>
                    <Chip
                      label={getOverallHealth().toUpperCase()}
                      color={getStatusColor(getOverallHealth())}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {services.filter(s => s.status === 'healthy').length} of {services.length} services are operational
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Key Metrics */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="between">
                    <Box>
                      <Typography variant="h4">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].cpu_usage.toFixed(1)}%` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        CPU Usage
                      </Typography>
                    </Box>
                    <PerformanceIcon color="primary" sx={{ fontSize: 40 }} />
                  </Box>
                  {metrics.length > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={metrics[metrics.length - 1].cpu_usage}
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="between">
                    <Box>
                      <Typography variant="h4">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].memory_usage.toFixed(1)}%` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Memory Usage
                      </Typography>
                    </Box>
                    <MemoryIcon color="secondary" sx={{ fontSize: 40 }} />
                  </Box>
                  {metrics.length > 0 && (
                    <LinearProgress
                      variant="determinate"
                      value={metrics[metrics.length - 1].memory_usage}
                      color="secondary"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="between">
                    <Box>
                      <Typography variant="h4">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].response_time.toFixed(0)}ms` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Response Time
                      </Typography>
                    </Box>
                    <MetricsIcon color="success" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="between">
                    <Box>
                      <Typography variant="h4">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].error_rate.toFixed(2)}%` : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Error Rate
                      </Typography>
                    </Box>
                    <AlertsIcon color="warning" sx={{ fontSize: 40 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Performance Charts */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Performance (Last 2 Hours)
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cpu_usage" 
                        stroke="#8884d8" 
                        name="CPU (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="memory_usage" 
                        stroke="#82ca9d" 
                        name="Memory (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="response_time" 
                        stroke="#ffc658" 
                        name="Response Time (ms)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Network Traffic
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={metrics.slice(-12)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(1)} MB/s`, '']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="network_in" 
                        stackId="1"
                        stroke="#8884d8" 
                        fill="#8884d8"
                        name="Inbound"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="network_out" 
                        stackId="1"
                        stroke="#82ca9d" 
                        fill="#82ca9d"
                        name="Outbound"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Services Status and Recent Activity */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Service Status
                  </Typography>
                  <List>
                    {services.map((service, index) => (
                      <React.Fragment key={service.name}>
                        <ListItem>
                          <ListItemIcon>
                            {getStatusIcon(service.status)}
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" justifyContent="between">
                                <Typography variant="body1">
                                  {service.name}
                                </Typography>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Chip
                                    label={service.status.toUpperCase()}
                                    color={getStatusColor(service.status)}
                                    size="small"
                                  />
                                  <Typography variant="body2" color="textSecondary">
                                    {service.uptime} uptime
                                  </Typography>
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Box display="flex" alignItems="center" justifyContent="between">
                                <Typography variant="body2" color="textSecondary">
                                  {service.message}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  Response: {service.response_time?.toFixed(0)}ms | 
                                  Last check: {formatDate(service.last_check)}
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < services.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  <List dense>
                    {auditLogs.slice(0, 8).map((log, index) => (
                      <React.Fragment key={log.id}>
                        <ListItem disablePadding>
                          <ListItemText
                            primary={
                              <Typography variant="body2">
                                {log.action}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" color="textSecondary">
                                  {log.user_id} • {formatDate(log.created_at)}
                                </Typography>
                                {log.details && (
                                  <Typography variant="caption" display="block" color="textSecondary">
                                    {log.details}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < Math.min(auditLogs.length, 8) - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  {auditLogs.length === 0 && (
                    <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                      No recent activity
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default SystemMonitoring;
