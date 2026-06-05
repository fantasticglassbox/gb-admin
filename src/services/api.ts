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
  VenuePartner,
  VenuePartnerApiKeyResult,
  Outlet,
  Publisher,
  Advertiser,
  Settlement,
  Payment,
  CreateEntryResult,
  PaymentMethod,
  PublisherDashboard,
  VenuePartnerDashboard,
  PublisherAnalytics,
  VenuePartnerAnalytics,
  AdApproval,
  AdApprovalStatus,
  SubmitAdApprovalRequest,
  SubmitAdApprovalResult,
  PlaylistAd,
  Layout,
  OutletGroup,
  TargetingPreview,
  TargetingPreviewRequest,
  Campaign,
  CampaignAsset,
  CampaignApproval,
  CampaignApprovalStatus,
  CampaignPlaybackResponse,
  CampaignState,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CreateCampaignAssetRequest,
  SubmitCampaignRequest,
  SubmitCampaignResult,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  /** V2 surface — same host, same auth, different base path. */
  private apiV2: AxiosInstance;

  constructor() {
    const root = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
    this.api = axios.create({
      baseURL: `${root}/v1`,
      headers: { 'Content-Type': 'application/json' },
    });
    this.apiV2 = axios.create({
      baseURL: `${root}/v2`,
      headers: { 'Content-Type': 'application/json' },
    });

    // Share auth interceptor across both v1 and v2 — same token, same 401
    // recovery. Future migration to refresh-token flow flips here once.
    const attachAuth = (config: any) => {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    };
    const handleResponse = (response: any) => response;
    const handleAuthError = (error: any) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    };

    this.api.interceptors.request.use(attachAuth, (e) => Promise.reject(e));
    this.api.interceptors.response.use(handleResponse, handleAuthError);
    this.apiV2.interceptors.request.use(attachAuth, (e) => Promise.reject(e));
    this.apiV2.interceptors.response.use(handleResponse, handleAuthError);
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
    const response: AxiosResponse<{
      users: User[];
      pagination?: { page: number; limit: number; total: number };
    }> = await this.api.get('/user/list', { params: filters });

    const users = response.data.users || [];
    // Prefer the backend's pagination block (post May-2026 fix). Fall back to
    // synthesizing one for any deploy where the backend hasn't shipped yet.
    const p = response.data.pagination;
    return {
      data: users,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: users.length, page: 1, limit: users.length },
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
    publisher_id?: string;
    venue_partner_id?: string;
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

  // Partners Management
  async getPartners(filters?: FilterOptions): Promise<PaginatedResponse<Partner>> {
    const response: AxiosResponse<
      | Partner[]
      | { data: Partner[]; pagination: { page: number; limit: number; total: number } }
    > = await this.api.get('/partners', { params: filters });

    // Backend post-fix returns { data, pagination }. Legacy fallback for any
    // older deploy still returns a bare array.
    const body: any = response.data;
    const partners: Partner[] = Array.isArray(body) ? body : body?.data ?? [];
    const p = Array.isArray(body) ? undefined : body?.pagination;
    return {
      data: partners,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: partners.length, page: 1, limit: partners.length },
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
    const response = await this.api.get('/merchants', { params: filters });
    const body: any = response.data;
    const merchants: Merchant[] = Array.isArray(body) ? body : body?.data ?? [];
    const p = Array.isArray(body) ? undefined : body?.pagination;
    return {
      data: merchants,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: merchants.length, page: 1, limit: merchants.length },
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
    const response = await this.api.get('/advertisements/list', { params: filters });
    const body: any = response.data;
    const ads: Advertisement[] = Array.isArray(body) ? body : body?.data ?? [];
    const p = Array.isArray(body) ? undefined : body?.pagination;
    return {
      data: ads,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: ads.length, page: 1, limit: ads.length },
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
    const response = await this.api.get('/assets', { params: filters });
    const body: any = response.data;
    const assets: Asset[] = Array.isArray(body) ? body : body?.data ?? [];
    const p = Array.isArray(body) ? undefined : body?.pagination;
    return {
      data: assets,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: assets.length, page: 1, limit: assets.length },
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
  //
  // Backend's /merchants/ads returns a bare array when called with no
  // pagination params (back-compat for gb-media TV client) OR a
  // { data, pagination } envelope when any pagination param is present.
  // Always pass at least { page: 1, limit: N } to force the paginated shape.
  async getMerchantAds(filters?: FilterOptions): Promise<PaginatedResponse<MerchantAd>> {
    const response = await this.api.get('/merchants/ads', { params: filters });
    const body: any = response.data;
    const ads: MerchantAd[] = Array.isArray(body) ? body : body?.data ?? [];
    const p = Array.isArray(body) ? undefined : body?.pagination;
    return {
      data: ads,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: ads.length, page: 1, limit: ads.length },
    };
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
    const data = response.data?.data || [];
    const p = response.data?.pagination;
    return {
      data,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: data.length, page: 1, limit: data.length },
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
    const data = response.data?.data || [];
    const p = response.data?.pagination;
    return {
      data,
      pagination: p
        ? { total: p.total, page: p.page, limit: p.limit }
        : { total: data.length, page: 1, limit: data.length },
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

  // =====================================================================
  // V2: Venue Partners & Outlets
  // =====================================================================
  //
  // Backend: /v2/venue-partners + /v2/outlets (see gb-core/handler/v2/).
  // Response envelope on list: { data: [...], pagination: { page, limit, total } }
  // Response envelope on single: { data: { ... } }

  async listVenuePartners(filters?: FilterOptions & { tier?: string }): Promise<PaginatedResponse<VenuePartner>> {
    const response = await this.apiV2.get('/venue-partners', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getVenuePartner(id: string): Promise<VenuePartner> {
    const response = await this.apiV2.get(`/venue-partners/${id}`);
    return response.data?.data ?? response.data;
  }

  async createVenuePartner(payload: Partial<VenuePartner>): Promise<VenuePartner> {
    const response = await this.apiV2.post('/venue-partners', payload);
    return response.data?.data ?? response.data;
  }

  async updateVenuePartner(id: string, payload: Partial<VenuePartner>): Promise<VenuePartner> {
    const response = await this.apiV2.put(`/venue-partners/${id}`, payload);
    return response.data?.data ?? response.data;
  }

  async deleteVenuePartner(id: string): Promise<void> {
    await this.apiV2.delete(`/venue-partners/${id}`);
  }

  /**
   * Issues (or rotates) the partner-integration API key for a venue.
   * Plaintext key is in the response — show it to the admin once and
   * never persist it. Subsequent fetches only return the prefix.
   */
  async rotateVenuePartnerApiKey(id: string): Promise<VenuePartnerApiKeyResult> {
    const response = await this.apiV2.post(`/venue-partners/${id}/api-key`);
    return response.data?.data ?? response.data;
  }

  /**
   * Revokes the partner-integration API key (clears the hash without
   * issuing a new one). Idempotent — no-ops if there's no key.
   */
  async revokeVenuePartnerApiKey(id: string): Promise<void> {
    await this.apiV2.delete(`/venue-partners/${id}/api-key`);
  }

  async listOutlets(
    filters?: FilterOptions & {
      venue_partner_id?: string;
      city?: string;
      outlet_type?: string;
      halal_only?: boolean;
    },
  ): Promise<PaginatedResponse<Outlet>> {
    const response = await this.apiV2.get('/outlets', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  /** Convenience: outlets scoped to one VenuePartner. */
  async listOutletsForVenuePartner(
    venuePartnerId: string,
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<Outlet>> {
    const response = await this.apiV2.get(
      `/venue-partners/${venuePartnerId}/outlets`,
      { params: filters },
    );
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getOutlet(id: string): Promise<Outlet> {
    const response = await this.apiV2.get(`/outlets/${id}`);
    return response.data?.data ?? response.data;
  }

  async createOutlet(payload: Partial<Outlet>): Promise<Outlet> {
    const response = await this.apiV2.post('/outlets', payload);
    return response.data?.data ?? response.data;
  }

  async updateOutlet(id: string, payload: Partial<Outlet>): Promise<Outlet> {
    const response = await this.apiV2.put(`/outlets/${id}`, payload);
    return response.data?.data ?? response.data;
  }

  async deleteOutlet(id: string): Promise<void> {
    await this.apiV2.delete(`/outlets/${id}`);
  }

  // ---------- V2: Device ↔ Outlet binding ----------

  async assignDeviceToOutlet(deviceId: string, outletId: string): Promise<void> {
    await this.apiV2.post(`/devices/${deviceId}/assign-outlet`, { outlet_id: outletId });
  }

  async unassignDeviceFromOutlet(deviceId: string): Promise<void> {
    await this.apiV2.post(`/devices/${deviceId}/unassign-outlet`);
  }

  /**
   * Pair a gb-media device using the 6-character code displayed on its screen.
   * Creates the device row tagged with the chosen venue (and optional outlet),
   * flips the PairCode to CLAIMED — the device's next /pair/status poll then
   * picks up its credentials and navigates to playback.
   *
   * Code is normalised to upper-case + stripped of whitespace before sending,
   * since the device displays it as "G4N 7XP" for legibility but stores it
   * unhyphenated.
   */
  async pairDevice(
    code: string,
    payload: { venue_partner_id: string; outlet_id?: string; device_name?: string },
  ): Promise<{ device_id: string; venue_partner_id: string; outlet_id?: string }> {
    const normalized = code.replace(/\s+/g, '').toUpperCase();
    const response = await this.apiV2.post(`/devices/pair/${normalized}`, payload);
    return response.data?.data ?? response.data;
  }

  /**
   * Bump the device's sync_token so its next heartbeat detects "new content
   * server-side" and refetches the playlist immediately. Used by the admin
   * "Pull latest now" row action and by the gb-media operator panel's Sync
   * button (which calls the same endpoint with its own JWT).
   */
  async forceSyncDevice(deviceId: string): Promise<{ sync_token: number }> {
    const response = await this.apiV2.post(`/devices/${deviceId}/force-sync`);
    return response.data?.data ?? response.data;
  }

  /**
   * V2 multi-zone layouts — fetches the catalog of ACTIVE templates.
   * Used by the device layout picker and by the publisher-side zone
   * picker (which derives slugs from the union of zones across layouts).
   */
  async listLayouts(): Promise<Layout[]> {
    const response = await this.apiV2.get('/layouts');
    return response.data?.data ?? [];
  }

  /**
   * Assigns a layout to a device. Pass empty string to clear the override
   * — the device falls back to fullscreen behavior (legacy playlist shape).
   */
  async setDeviceLayout(deviceId: string, layoutId: string): Promise<void> {
    await this.apiV2.put(`/devices/${deviceId}/layout`, { layout_id: layoutId });
  }

  async listUnassignedDevices(filters?: FilterOptions): Promise<PaginatedResponse<Device>> {
    const response = await this.apiV2.get('/devices/unassigned', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async listDevicesByOutlet(
    outletId: string,
    filters?: FilterOptions & { status?: string },
  ): Promise<PaginatedResponse<Device>> {
    const response = await this.apiV2.get(`/outlets/${outletId}/devices`, { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async listDevicesByVenuePartner(
    venuePartnerId: string,
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<Device>> {
    const response = await this.apiV2.get(`/venue-partners/${venuePartnerId}/devices`, {
      params: filters,
    });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  // =====================================================================
  // V2: Publishers & Advertisers
  // =====================================================================

  async listPublishers(
    filters?: FilterOptions & { kind?: string; tier?: string },
  ): Promise<PaginatedResponse<Publisher>> {
    const response = await this.apiV2.get('/publishers', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getPublisher(id: string): Promise<Publisher> {
    const response = await this.apiV2.get(`/publishers/${id}`);
    return response.data?.data ?? response.data;
  }

  async createPublisher(payload: Partial<Publisher>): Promise<Publisher> {
    const response = await this.apiV2.post('/publishers', payload);
    return response.data?.data ?? response.data;
  }

  async updatePublisher(id: string, payload: Partial<Publisher>): Promise<Publisher> {
    const response = await this.apiV2.put(`/publishers/${id}`, payload);
    return response.data?.data ?? response.data;
  }

  async deletePublisher(id: string): Promise<void> {
    await this.apiV2.delete(`/publishers/${id}`);
  }

  // Naming note: `listAdvertisersV2` etc. — there's no existing
  // `listAdvertisers` in this file, but V1 already has `getAdvertisements`
  // (different concept — that's the ad creative). The V2 suffix keeps it
  // unambiguous to future readers.
  async listAdvertisersV2(
    filters?: FilterOptions & {
      publisher_id?: string;
      category?: string;
      requires_regulated_slot?: boolean;
    },
  ): Promise<PaginatedResponse<Advertiser>> {
    const response = await this.apiV2.get('/advertisers', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async listAdvertisersForPublisher(
    publisherId: string,
    filters?: FilterOptions,
  ): Promise<PaginatedResponse<Advertiser>> {
    const response = await this.apiV2.get(
      `/publishers/${publisherId}/advertisers`,
      { params: filters },
    );
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getAdvertiserV2(id: string): Promise<Advertiser> {
    const response = await this.apiV2.get(`/advertisers/${id}`);
    return response.data?.data ?? response.data;
  }

  async createAdvertiserV2(payload: Partial<Advertiser>): Promise<Advertiser> {
    const response = await this.apiV2.post('/advertisers', payload);
    return response.data?.data ?? response.data;
  }

  async updateAdvertiserV2(id: string, payload: Partial<Advertiser>): Promise<Advertiser> {
    const response = await this.apiV2.put(`/advertisers/${id}`, payload);
    return response.data?.data ?? response.data;
  }

  async deleteAdvertiserV2(id: string): Promise<void> {
    await this.apiV2.delete(`/advertisers/${id}`);
  }

  // =====================================================================
  // V2: Settlements + Payments (money waterfall)
  // =====================================================================

  /**
   * Create a revenue entry. Backend computes the waterfall (venue + publisher
   * cuts + PPh23 withholding + platform keep) and persists Settlement rows.
   * Returns the preview block so the UI can show the split before refresh.
   */
  async createSettlementEntry(payload: {
    venue_partner_id: string;
    publisher_id: string;
    period_start: string; // YYYY-MM-DD
    period_end: string;
    gross_idr: number;
    notes?: string;
    venue_pct_override?: number | null;
    publisher_pct_override?: number | null;
  }): Promise<CreateEntryResult> {
    const response = await this.apiV2.post('/settlements/entries', payload);
    return response.data?.data ?? response.data;
  }

  async listSettlements(
    filters?: FilterOptions & {
      stakeholder_type?: string;
      stakeholder_id?: string;
      venue_partner_id?: string;
      publisher_id?: string;
      status?: string;
      source_id?: string;
      period_start_gte?: string; // YYYY-MM-DD
      period_end_lte?: string;
    },
  ): Promise<PaginatedResponse<Settlement>> {
    const response = await this.apiV2.get('/settlements', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getSettlementV2(id: string): Promise<Settlement> {
    const response = await this.apiV2.get(`/settlements/${id}`);
    return response.data?.data ?? response.data;
  }

  /** Returns all settlements created from the same revenue entry (venue + publisher rows). */
  async getSettlementsBySource(sourceId: string): Promise<Settlement[]> {
    const response = await this.apiV2.get(`/settlements/source/${sourceId}`);
    return response.data?.data ?? [];
  }

  async lockSettlement(id: string): Promise<void> {
    await this.apiV2.post(`/settlements/${id}/lock`);
  }

  async voidSettlement(id: string): Promise<void> {
    await this.apiV2.post(`/settlements/${id}/void`);
  }

  /** Records a Payment and marks N settlements PAID atomically. */
  async markSettlementsPaid(payload: {
    settlement_ids: string[];
    method?: PaymentMethod;
    reference?: string;
    paid_at?: string; // ISO datetime
    notes?: string;
  }): Promise<Payment> {
    const response = await this.apiV2.post('/settlements/mark-paid', payload);
    return response.data?.data ?? response.data;
  }

  async listPayments(
    filters?: FilterOptions & {
      stakeholder_type?: string;
      stakeholder_id?: string;
      reference?: string;
      paid_at_gte?: string;
      paid_at_lte?: string;
    },
  ): Promise<PaginatedResponse<Payment>> {
    const response = await this.apiV2.get('/payments', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  // ---------- V2: Per-role dashboards ----------

  async getPublisherDashboard(publisherId?: string): Promise<PublisherDashboard> {
    const response = await this.apiV2.get('/dashboards/publisher', {
      params: publisherId ? { publisher_id: publisherId } : undefined,
    });
    return response.data?.data ?? response.data;
  }

  async getVenuePartnerDashboard(venuePartnerId?: string): Promise<VenuePartnerDashboard> {
    const response = await this.apiV2.get('/dashboards/venue-partner', {
      params: venuePartnerId ? { venue_partner_id: venuePartnerId } : undefined,
    });
    return response.data?.data ?? response.data;
  }

  // ---------- V2: Per-role analytics ----------
  //
  // Backend forces scope from JWT claims; admins can pass an override
  // id and a window of 7/30/90 days. Playback panels return zeros until
  // gb-media starts pushing PlaybackEvents — UIs should render an
  // empty-state for those rather than 0-valued charts.

  async getPublisherAnalytics(opts?: {
    publisher_id?: string;
    days?: number;
  }): Promise<PublisherAnalytics> {
    const response = await this.apiV2.get('/analytics/publisher', { params: opts });
    return response.data?.data ?? response.data;
  }

  async getVenuePartnerAnalytics(opts?: {
    venue_partner_id?: string;
    days?: number;
  }): Promise<VenuePartnerAnalytics> {
    const response = await this.apiV2.get('/analytics/venue-partner', { params: opts });
    return response.data?.data ?? response.data;
  }

  // ---------- V2: Ad approvals (booking flow) ----------
  //
  // One AdApproval row per (advertisement × venue_partner). Publisher
  // submits one ad to N venues at once; each venue approves/rejects
  // independently; either side can revoke an APPROVED row.

  async listAdApprovals(
    filters?: FilterOptions & {
      status?: AdApprovalStatus | string;
      advertisement_id?: string;
      publisher_id?: string;
      venue_partner_id?: string;
    },
  ): Promise<PaginatedResponse<AdApproval>> {
    const response = await this.apiV2.get('/ad-approvals', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getAdApproval(id: string): Promise<AdApproval> {
    const response = await this.apiV2.get(`/ad-approvals/${id}`);
    return response.data?.data ?? response.data;
  }

  async submitAdApprovals(payload: SubmitAdApprovalRequest): Promise<SubmitAdApprovalResult> {
    const response = await this.apiV2.post('/ad-approvals/submit', payload);
    return response.data?.data ?? response.data;
  }

  async approveAdApproval(id: string): Promise<void> {
    await this.apiV2.post(`/ad-approvals/${id}/approve`);
  }

  async rejectAdApproval(id: string, reason: string): Promise<void> {
    await this.apiV2.post(`/ad-approvals/${id}/reject`, { reason });
  }

  async revokeAdApproval(id: string, reason?: string): Promise<void> {
    await this.apiV2.post(`/ad-approvals/${id}/revoke`, { reason: reason || '' });
  }

  /**
   * V2 paginated, role-scoped ad list. Use this (not the V1
   * /advertisements/list) anywhere a publisher needs to see only their
   * own ads — the backend forces publisher_id from the JWT claim.
   * `state` filter: 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE'.
   */
  async listAdvertisementsV2(
    filters?: FilterOptions & {
      state?: 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE' | string;
      advertiser_id?: string;
      publisher_id?: string; // admin override only
    },
  ): Promise<PaginatedResponse<Advertisement>> {
    const response = await this.apiV2.get('/advertisements', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  // Device playlist endpoint stays the same path (/v2/devices/:id/playlist)
  // and is registered by the partner package as well; the response shape
  // changed (placement_* fields → approval_id + venue_partner_id).
  async getDevicePlaylist(deviceId: string, at?: string): Promise<PlaylistAd[]> {
    const response = await this.apiV2.get(`/devices/${deviceId}/playlist`, {
      params: at ? { at } : undefined,
    });
    return response.data?.data || [];
  }

  // ----- V2 outlet groups (Epic-D phase 1) -----

  /**
   * Lists every active outlet group for a venue — drives the per-venue
   * picker on the publisher submit page. Admin + publisher can read
   * any venue; venue partner is restricted to their own.
   */
  async listOutletGroupsForVenue(venueId: string): Promise<OutletGroup[]> {
    const response = await this.apiV2.get(`/venues/${venueId}/outlet-groups`);
    return response.data?.data || [];
  }

  /**
   * Live coverage preview for the publisher submit page's right rail.
   * Pass `advertisement_id` to include per-outlet compliance exceptions
   * (outlets that block one of the ad's categories — these turn into
   * per-outlet decisions instead of bulk group approvals).
   */
  async targetingPreview(req: TargetingPreviewRequest): Promise<TargetingPreview> {
    const response = await this.apiV2.post('/targeting/preview', req);
    return response.data;
  }

  // ----- V2 campaigns (Epic-D D-1/D-2) -----
  //
  // A campaign is the V2 atomic unit. List / detail / mutate operate
  // on campaigns; assets are managed through nested routes. The legacy
  // /v2/advertisements list is still around for backward compat but
  // the V2 admin UI now consumes campaigns end-to-end.

  async listCampaigns(filters?: FilterOptions & {
    state?: CampaignState | string;
    advertiser_id?: string;
    publisher_id?: string;
  }): Promise<PaginatedResponse<Campaign>> {
    const response = await this.apiV2.get('/campaigns', { params: filters });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getCampaign(id: string): Promise<Campaign> {
    const response = await this.apiV2.get(`/campaigns/${id}`);
    return response.data?.data ?? response.data;
  }

  async createCampaign(payload: CreateCampaignRequest): Promise<Campaign> {
    const response = await this.apiV2.post('/campaigns', payload);
    return response.data?.data ?? response.data;
  }

  async updateCampaign(id: string, payload: UpdateCampaignRequest): Promise<Campaign> {
    const response = await this.apiV2.put(`/campaigns/${id}`, payload);
    return response.data?.data ?? response.data;
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.apiV2.delete(`/campaigns/${id}`);
  }

  /** DRAFT → PUBLISHED transition. Requires at least one asset. */
  async publishCampaign(id: string): Promise<Campaign> {
    const response = await this.apiV2.post(`/campaigns/${id}/publish`);
    return response.data?.data ?? response.data;
  }

  async addCampaignAsset(
    campaignId: string,
    payload: CreateCampaignAssetRequest,
  ): Promise<CampaignAsset> {
    const response = await this.apiV2.post(
      `/campaigns/${campaignId}/assets`,
      payload,
    );
    return response.data?.data ?? response.data;
  }

  async updateCampaignAsset(
    campaignId: string,
    assetId: string,
    payload: CreateCampaignAssetRequest,
  ): Promise<CampaignAsset> {
    const response = await this.apiV2.put(
      `/campaigns/${campaignId}/assets/${assetId}`,
      payload,
    );
    return response.data?.data ?? response.data;
  }

  async deleteCampaignAsset(campaignId: string, assetId: string): Promise<void> {
    await this.apiV2.delete(`/campaigns/${campaignId}/assets/${assetId}`);
  }

  // Campaign-approval lifecycle (replaces ad-approvals).

  async listCampaignApprovals(
    filters?: FilterOptions & {
      status?: CampaignApprovalStatus | string;
      campaign_id?: string;
      venue_partner_id?: string;
      publisher_id?: string;
    },
  ): Promise<PaginatedResponse<CampaignApproval>> {
    const response = await this.apiV2.get('/campaign-approvals', {
      params: filters,
    });
    const body: any = response.data;
    return {
      data: body?.data || [],
      pagination: body?.pagination || { total: 0, page: 1, limit: 0 },
    };
  }

  async getCampaignApproval(id: string): Promise<CampaignApproval> {
    const response = await this.apiV2.get(`/campaign-approvals/${id}`);
    return response.data?.data ?? response.data;
  }

  async submitCampaign(payload: SubmitCampaignRequest): Promise<SubmitCampaignResult> {
    const response = await this.apiV2.post('/campaign-approvals/submit', payload);
    return response.data?.data ?? response.data;
  }

  async approveCampaignApproval(id: string): Promise<void> {
    await this.apiV2.post(`/campaign-approvals/${id}/approve`);
  }

  async rejectCampaignApproval(id: string, reason: string): Promise<void> {
    await this.apiV2.post(`/campaign-approvals/${id}/reject`, { reason });
  }

  async revokeCampaignApproval(id: string, reason?: string): Promise<void> {
    await this.apiV2.post(`/campaign-approvals/${id}/revoke`, {
      reason: reason || '',
    });
  }

  /**
   * Per-campaign proof-of-play roll-up. Auto-scoped from the JWT —
   * publishers see their own campaigns only, venue partners see
   * playback that happened at their devices. Pass `from`/`to` as
   * RFC3339; default window is the last 30 days.
   */
  async getCampaignPlayback(
    params?: { from?: string; to?: string; publisher_id?: string; venue_partner_id?: string },
  ): Promise<CampaignPlaybackResponse> {
    const response = await this.apiV2.get('/analytics/campaign-playback', { params });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
