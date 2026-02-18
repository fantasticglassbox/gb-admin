import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  User,
  LoginRequest,
  LoginResponse,
  Partner,
  Merchant,
  Device,
  DeviceWithActiveAds,
  FeeTransaction,
  FeeSettlement,
  AdminDashboardData,
  PartnerDashboardData,
  MerchantDashboardData,
  PaginatedResponse,
  FilterOptions,
  Advertisement,
  CreateAdvertisementRequest,
  AssignAds,
  FeeSchema,
  CreateFeeSchemaRequest,
  ProcessViewRequest,
  Asset,
  RevenueFilters,
  TransactionStats,
  MerchantAd,
} from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic GET method for flexibility
  async get(url: string, params?: any): Promise<any> {
    const response = await this.api.get(url, { params });
    return response;
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/public/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    // Note: Production API doesn't have logout endpoint, just clear local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  // Note: No getCurrentUser endpoint available in API
  // Token validation happens through 401 responses on API calls

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const formData = new FormData();
    formData.append('refresh_token', refreshToken);
    const response = await this.api.post('/public/refresh-token', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async register(userData: {
    username: string;
    password: string;
    role: string;
    tid?: string;
  }): Promise<{ message: string }> {
    const response = await this.api.post('/public/register', userData);
    return response.data;
  }

  // Users Management
  async getUsers(filters?: FilterOptions): Promise<PaginatedResponse<User>> {
    const response: AxiosResponse<{ users: User[] }> = await this.api.get('/user/list', {
      params: filters,
    });
    
    // Transform API response to match expected PaginatedResponse format
    return {
      data: response.data.users || [],
      pagination: {
        total: response.data.users?.length || 0,
        page: 1,
        limit: response.data.users?.length || 0
      }
    };
  }

  // Device Activity Logs
  async getDeviceActivities(params?: {
    merchant_id?: string;
    offset?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<any> {
    const response = await this.api.get('/admin/device/activities', { params });
    return response.data;
  }

  async exportDeviceActivities(params?: {
    merchant_id?: string;
    start_date?: string;
    end_date?: string;
    format?: 'excel' | 'xlsx';
  }): Promise<Blob> {
    const response = await this.api.get('/admin/device/activities/export', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  async createUser(userData: {
    username: string;
    password: string;
    role: string;
    tid?: string;
  }): Promise<User> {
    const response: AxiosResponse<User> = await this.api.post('/user', userData);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response: AxiosResponse<User> = await this.api.put(`/user/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await this.api.delete(`/user/${id}`);
  }

  // Partners Management - No dedicated endpoint available, return empty data
  async getPartners(filters?: FilterOptions): Promise<PaginatedResponse<Partner>> {
    const response: AxiosResponse<Partner[]> = await this.api.get('/partners', {
      params: filters,
    });
    
    // Transform API response to match expected PaginatedResponse format
    return {
      data: response.data || [],
      pagination: {
        total: response.data?.length || 0,
        page: 1,
        limit: response.data?.length || 0,
      }
    };
  }

  async getPartner(id: string): Promise<Partner> {
    const response: AxiosResponse<Partner> = await this.api.get(`/partners/${id}`);
    return response.data;
  }

  async createPartner(partnerData: Partial<Partner>): Promise<Partner> {
    const response: AxiosResponse<Partner> = await this.api.post('/partners', partnerData);
    return response.data;
  }

  async updatePartner(id: string, partnerData: Partial<Partner>): Promise<Partner> {
    const response: AxiosResponse<Partner> = await this.api.put(`/partners/${id}`, partnerData);
    return response.data;
  }

  async deletePartner(id: string): Promise<void> {
    await this.api.delete(`/partners/${id}`);
  }

  // Merchants Management
  async getMerchants(filters?: FilterOptions): Promise<PaginatedResponse<Merchant>> {
    const response: AxiosResponse<Merchant[]> = await this.api.get('/merchants', {
      params: filters,
    });
    
    // Transform API response to match expected PaginatedResponse format
    return {
      data: response.data || [],
      pagination: {
        total: response.data?.length || 0,
        page: 1,
        limit: response.data?.length || 0
      }
    };
  }

  async getMerchant(id: string): Promise<Merchant> {
    const response: AxiosResponse<Merchant> = await this.api.get(`/merchants/${id}`);
    return response.data;
  }

  async createMerchant(merchantData: Partial<Merchant>): Promise<Merchant> {
    const response: AxiosResponse<Merchant> = await this.api.post('/merchants', merchantData);
    return response.data;
  }

  async updateMerchant(id: string, merchantData: Partial<Merchant>): Promise<Merchant> {
    const response: AxiosResponse<Merchant> = await this.api.put(`/merchants/${id}`, merchantData);
    return response.data;
  }

  async deleteMerchant(id: string): Promise<void> {
    await this.api.delete(`/merchants/${id}`);
  }

  // Devices Management
  async getDevices(filters?: FilterOptions): Promise<PaginatedResponse<Device>> {
    const response = await this.api.get('/devices', {
      params: filters,
    });
    
    // Backend now returns { data: Device[], pagination: { total, page, limit } }
    return {
      data: response.data.data || [],
      pagination: {
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 0
      }
    };
  }

  async getDevicesWithActiveAds(): Promise<{ devices: DeviceWithActiveAds[], count: number }> {
    const response = await this.api.get('/devices/with-ads');
    return response.data;
  }

  async getDevice(id: string): Promise<Device> {
    const response: AxiosResponse<Device> = await this.api.get(`/devices/${id}`);
    return response.data;
  }

  async createDevice(deviceData: Partial<Device>): Promise<Device> {
    const response: AxiosResponse<Device> = await this.api.post('/devices', deviceData);
    return response.data;
  }

  async updateDevice(id: string, deviceData: Partial<Device>): Promise<Device> {
    const response: AxiosResponse<Device> = await this.api.put(`/devices/${id}`, deviceData);
    return response.data;
  }

  async deleteDevice(id: string): Promise<void> {
    await this.api.delete(`/devices/${id}`);
  }

  // Device Registration Management
  async getUnassignedDevices(): Promise<{ data: any[], count: number, message: string }> {
    const response = await this.api.get('/devices/unassigned');
    return response.data;
  }

  async assignDeviceToMerchant(deviceId: string, merchantId: string): Promise<void> {
    await this.api.post('/devices/assign', {
      device_id: deviceId,
      merchant_id: [merchantId], // Existing endpoint expects array of merchant IDs
      description: 'Device assigned via device registration interface'
    });
  }

  // Transactions
  async getTransactions(filters?: FilterOptions): Promise<PaginatedResponse<FeeTransaction>> {
    const response: AxiosResponse<PaginatedResponse<FeeTransaction>> = await this.api.get('/transactions', {
      params: filters,
    });
    return response.data;
  }

  async getTransaction(id: string): Promise<FeeTransaction> {
    const response: AxiosResponse<FeeTransaction> = await this.api.get(`/transactions/${id}`);
    return response.data;
  }

  // Settlements
  async getSettlements(filters?: FilterOptions): Promise<PaginatedResponse<FeeSettlement>> {
    const response: AxiosResponse<PaginatedResponse<FeeSettlement>> = await this.api.get('/settlements', {
      params: filters,
    });
    return response.data;
  }

  async getSettlement(id: string): Promise<FeeSettlement> {
    const response: AxiosResponse<FeeSettlement> = await this.api.get(`/settlements/${id}`);
    return response.data;
  }

  async createSettlement(settlementData: {
    settlement_type: 'daily' | 'weekly' | 'monthly' | 'manual';
    period_start: string;
    period_end: string;
  }): Promise<FeeSettlement> {
    const response: AxiosResponse<FeeSettlement> = await this.api.post('/settlements', settlementData);
    return response.data;
  }

  // Dashboard Data
  async getAdminDashboard(filters?: { period_start?: string; period_end?: string }): Promise<AdminDashboardData> {
    const response: AxiosResponse<AdminDashboardData> = await this.api.get('/dashboard/admin', {
      params: filters,
    });
    return response.data;
  }

  async getPartnerDashboard(partnerId: string, filters?: { period_start?: string; period_end?: string }): Promise<PartnerDashboardData> {
    const response: AxiosResponse<PartnerDashboardData> = await this.api.get(`/dashboard/partner/${partnerId}`, {
      params: filters,
    });
    return response.data;
  }

  async getMerchantDashboard(merchantId: string, filters?: { period_start?: string; period_end?: string }): Promise<MerchantDashboardData> {
    const response: AxiosResponse<MerchantDashboardData> = await this.api.get(`/dashboard/merchant/${merchantId}`, {
      params: filters,
    });
    return response.data;
  }

  // Advertisements Management
  async getAdvertisements(filters?: FilterOptions): Promise<PaginatedResponse<Advertisement>> {
    const response: AxiosResponse<Advertisement[]> = await this.api.get('/advertisements/list', {
      params: filters,
    });
    
    // Transform API response to match expected PaginatedResponse format
    return {
      data: response.data || [],
      pagination: {
        total: response.data?.length || 0,
        page: 1,
        limit: response.data?.length || 0
      }
    };
  }

  async getActiveAdvertisements(): Promise<Advertisement[]> {
    const response: AxiosResponse<Advertisement[]> = await this.api.get('/advertisements/active');
    return response.data;
  }

  async getMerchantAdvertisements(): Promise<Advertisement[]> {
    const response: AxiosResponse<Advertisement[]> = await this.api.get('/merchants/ads');
    return response.data;
  }

  async getAdvertisement(id: string): Promise<Advertisement> {
    const response: AxiosResponse<Advertisement> = await this.api.get(`/advertisements/${id}`);
    return response.data;
  }

  async createAdvertisement(adData: CreateAdvertisementRequest): Promise<Advertisement> {
    const response: AxiosResponse<Advertisement> = await this.api.post('/advertisements/create', adData);
    return response.data;
  }

  async updateAdvertisement(id: string, adData: Partial<Advertisement>): Promise<Advertisement> {
    const response: AxiosResponse<Advertisement> = await this.api.put(`/advertisements/${id}`, adData);
    return response.data;
  }


  async completeAdvertisement(id: string): Promise<void> {
    await this.api.put(`/advertisements/${id}/complete`);
  }

  async getAdvertisementsByState(state: 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE'): Promise<Advertisement[]> {
    const response = await this.api.get(`/advertisements/state/${state}`);
    return response.data;
  }

  async getAdvertisementCategories(): Promise<string[]> {
    try {
      const response = await this.api.get('/advertisements/categories');
      return response.data;
    } catch (error) {
      // Return mock categories if API is not available
      return ['FOOD', 'RETAIL', 'BEAUTY', 'ENTERTAINMENT', 'SERVICE', 'TECHNOLOGY', 'HEALTH', 'EDUCATION', 'AUTOMOTIVE', 'TRAVEL'];
    }
  }

  async assignAdvertisementToMerchants(assignData: AssignAds): Promise<void> {
    await this.api.put('/advertisements/merchant', assignData);
  }

  async publishAdvertisement(id: string, merchantIds: string[]): Promise<void> {
    await this.api.put(`/advertisements/${id}/publish`, {
      merchant_ids: merchantIds
    });
  }

  async unpublishAdvertisement(id: string): Promise<void> {
    await this.api.put(`/advertisements/${id}/unpublish`);
  }

  async rejectAdvertisement(id: string): Promise<void> {
    await this.api.put(`/advertisements/${id}`, { state: 'REJECTED' });
  }

  // File upload for advertisements
  async uploadFile(file: File, onUploadProgress?: (progressEvent: any) => void): Promise<{ message: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post('/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  }

  // Fee Schemas Management
  async getFeeSchemas(filters?: FilterOptions): Promise<PaginatedResponse<FeeSchema>> {
    const response: AxiosResponse<PaginatedResponse<FeeSchema>> = await this.api.get('/fee-schemas', {
      params: filters,
    });
    return response.data;
  }

  async getFeeSchema(id: string): Promise<FeeSchema> {
    const response: AxiosResponse<FeeSchema> = await this.api.get(`/fee-schemas/${id}`);
    return response.data;
  }

  async createFeeSchema(schemaData: CreateFeeSchemaRequest): Promise<FeeSchema> {
    const response: AxiosResponse<FeeSchema> = await this.api.post('/fee-schemas', schemaData);
    return response.data;
  }

  async updateFeeSchema(id: string, schemaData: Partial<FeeSchema>): Promise<FeeSchema> {
    const response: AxiosResponse<FeeSchema> = await this.api.put(`/fee-schemas/${id}`, schemaData);
    return response.data;
  }

  async activateFeeSchema(id: string): Promise<void> {
    await this.api.post(`/fee-schemas/${id}/activate`);
  }

  async deactivateFeeSchema(id: string): Promise<void> {
    await this.api.post(`/fee-schemas/${id}/deactivate`);
  }

  // Enhanced Transaction Management
  async processView(viewData: ProcessViewRequest): Promise<FeeTransaction> {
    const response: AxiosResponse<FeeTransaction> = await this.api.post('/fee-transactions/process-view', viewData);
    return response.data;
  }

  async processTransaction(id: string): Promise<void> {
    await this.api.post(`/fee-transactions/${id}/process`);
  }

  // Enhanced Settlement Management
  async processSettlement(batchId: string): Promise<void> {
    await this.api.post(`/settlements/${batchId}/process`);
  }

  // File/Asset Management

  async getAssets(filters?: FilterOptions): Promise<PaginatedResponse<Asset>> {
    const response: AxiosResponse<Asset[]> = await this.api.get('/assets', {
      params: filters,
    });
    
    // Transform API response to match expected PaginatedResponse format
    return {
      data: response.data || [],
      pagination: {
        total: response.data?.length || 0,
        page: 1,
        limit: response.data?.length || 0
      }
    };
  }

  async getAsset(id: string): Promise<Asset> {
    const response: AxiosResponse<Asset> = await this.api.get(`/assets/${id}`);
    return response.data;
  }

  async deleteAsset(id: string): Promise<void> {
    await this.api.delete(`/assets/${id}`);
  }


  async getRevenueStats(filters?: RevenueFilters): Promise<TransactionStats> {
    const response: AxiosResponse<TransactionStats> = await this.api.get('/revenue/stats', {
      params: filters,
    });
    return response.data;
  }

  // Merchant Ads Assignment
  async getMerchantAds(filters?: FilterOptions): Promise<PaginatedResponse<MerchantAd>> {
    const response: AxiosResponse<PaginatedResponse<MerchantAd>> = await this.api.get('/merchants/ads', {
      params: filters,
    });
    return response.data;
  }


  // Demography and Location Analytics
  async getDeviceLocations(): Promise<any> {
    const response = await this.api.get('/demography/locations');
    return response.data;
  }

  async getLocationStats(): Promise<any> {
    const response = await this.api.get('/demography/stats');
    return response.data;
  }

  // System Health and Monitoring
  async getSystemHealth(): Promise<any> {
    const response = await this.api.get('/system/health');
    return response.data;
  }

  async getSystemMetrics(filters?: any): Promise<any> {
    const response = await this.api.get('/system/metrics', { params: filters });
    return response.data;
  }

  async getAuditLogs(filters?: FilterOptions): Promise<PaginatedResponse<any>> {
    const response = await this.api.get('/audit/logs', { params: filters });
    return response.data;
  }


  async exportRevenueReport(filters?: any): Promise<any> {
    const response = await this.api.get('/reports/revenue/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response;
  }

  // Revenue Generation - New table-based system
  async generateRevenue(data: {
    year: number;
    month: number;
    force_regenerate?: boolean;
  }): Promise<any> {
    const response = await this.api.post('/revenue/generate', data);
    return response.data;
  }

  async getPreCalculatedRevenueData(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get('/revenue/data', { params });
    return response.data;
  }

  async getRevenueGenerationHistory(limit?: number): Promise<any> {
    const params: any = {};
    if (limit) params.limit = limit;
    
    const response = await this.api.get('/revenue/generations', { params });
    return response.data;
  }

  // Detailed Revenue Report - Uses the detailed report endpoint
  async getDetailedRevenueReport(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get('/revenue/detailed', { params });
    return response.data;
  }

  // Enhanced Revenue Summary
  async getRevenueSummary(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get('/revenue/summary', { params });
    return response.data;
  }

  // Admin Analytics for Dashboard
  async getAdminAnalytics(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get('/analytics/admin', { params });
    return response.data;
  }

  // Partner Analytics for Dashboard
  async getPartnerAnalytics(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get('/analytics/partner', { params });
    return response.data;
  }

  // Merchant Analytics for Dashboard
  async getMerchantAnalytics(year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get('/analytics/merchant', { params });
    return response.data;
  }

  // Admin-specific Partner Analytics
  async getPartnerAnalyticsById(partnerId: string, year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get(`/analytics/partner/${partnerId}`, { params });
    return response.data;
  }

  // Admin-specific Merchant Analytics
  async getMerchantAnalyticsById(merchantId: string, year?: number, month?: number): Promise<any> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    
    const response = await this.api.get(`/analytics/merchant/${merchantId}`, { params });
    return response.data;
  }

  // Partner Schema Fee Management - Aligned with Backend
  async getPartnerSchemaFees(filters?: FilterOptions): Promise<PaginatedResponse<any>> {
    const response = await this.api.get('/partner-schema-fees', { params: filters });
    return {
      data: response.data.data || [],
      pagination: {
        total: response.data.data?.length || 0,
        page: 1,
        limit: response.data.data?.length || 0
      }
    };
  }

  async createPartnerSchemaFee(feeData: {
    partner_id: string;
    amount: number;
    currency?: string;
    description?: string;
    is_active?: boolean;
  }): Promise<any> {
    const response = await this.api.post('/partner-schema-fees', feeData);
    return response.data;
  }

  async updatePartnerSchemaFee(id: string, feeData: any): Promise<any> {
    const response = await this.api.put(`/partner-schema-fees/${id}`, feeData);
    return response.data;
  }

  async deletePartnerSchemaFee(id: string): Promise<void> {
    await this.api.delete(`/partner-schema-fees/${id}`);
  }

  // Business Schema Fee Management - Aligned with Backend
  async getBusinessSchemaFees(filters?: FilterOptions): Promise<PaginatedResponse<any>> {
    const response = await this.api.get('/business-schema-fees', { params: filters });
    return {
      data: response.data.data || [],
      pagination: {
        total: response.data.data?.length || 0,
        page: 1,
        limit: response.data.data?.length || 0
      }
    };
  }

  async createBusinessSchemaFee(feeData: {
    entity: 'GLASSBOX' | 'SALES' | 'BROKER' | 'MERCHANT';
    amount: number; // Percentage (0.00-100.00)
    merchant_id: string;
    description?: string;
    is_active?: boolean;
  }): Promise<any> {
    const response = await this.api.post('/business-schema-fees', feeData);
    return response.data;
  }

  async updateBusinessSchemaFee(id: string, feeData: any): Promise<any> {
    const response = await this.api.put(`/business-schema-fees/${id}`, feeData);
    return response.data;
  }

  async deleteBusinessSchemaFee(id: string): Promise<void> {
    await this.api.delete(`/business-schema-fees/${id}`);
  }

  // Assets Management
  async uploadAsset(formData: FormData, onUploadProgress?: (progressEvent: any) => void): Promise<any> {
    const response = await this.api.post('/assets/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return response.data;
  }

  async updateAsset(id: string, data: any): Promise<any> {
    const response = await this.api.put(`/assets/${id}`, data);
    return response.data;
  }

  async downloadAsset(id: string): Promise<any> {
    const response = await this.api.get(`/assets/${id}/download`, {
      responseType: 'blob',
    });
    return response;
  }

  // Fee Schema Management
  async deleteFeeSchema(id: string): Promise<void> {
    await this.api.delete(`/fee-schemas/${id}`);
  }

  // Location generation endpoints
  async generateLocationInfo(data: { device_ids?: string[], all?: boolean }): Promise<any> {
    const response = await this.api.post('/locations/generate', data);
    return response.data;
  }

  async getDevicesNeedingLocationInfo(): Promise<any> {
    const response = await this.api.get('/locations/devices-needing-info');
    return response.data;
  }

  async getDeviceMerchant(deviceId: string): Promise<Merchant | null> {
    try {
      const response = await this.api.get(`/devices/${deviceId}/merchant`);
      return response.data;
    } catch (err) {
      console.error('Failed to get device merchant:', err);
      return null;
    }
  }

}

export const apiService = new ApiService();
export default apiService;
