// User and Authentication Types
export interface User {
  id: number | string; // API returns integer, but we'll handle both
  username?: string; // API uses username, not name
  name?: string; // For compatibility
  email?: string;
  roles?: string[];
  role: UserRole; // Primary role for compatibility
  status?: UserStatus;
  tid?: string; // Tenant ID from API
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export type UserRole = 'admin' | 'partner' | 'merchant';
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  account: {
    id: string;
    name: string;
    roles: string[];
  };
}

// Partner Types
export interface Partner {
  id: string;
  name: string;
  logo?: string;
  email: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
}

// Merchant Types
export interface Merchant {
  id: number | string; // API returns integer, but we'll handle both
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string; // API always returns status
  created_at: string;
  updated_at: string;
}

// Device Types
export interface Device {
  id: string;
  name: string;
  device_id: string;
  device_secret?: string;
  merchant_id: string;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  device_type: 'tablet' | 'phone' | 'tv' | 'kiosk';
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  device_info?: {
    model?: string;
    os?: string;
    app_version?: string;
    screen_resolution?: string;
  };
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceResponse extends Device {}

// Active Advertisement on Device
export interface ActiveAdvertisement {
  id: string;
  title: string;
  content: string;
  type: string;
  duration: number;
  state: string;
  published_time_start: string;
  published_time_end: string;
  partner_name: string;
}

// Device with Active Ads
export interface DeviceWithActiveAds extends Device {
  active_ads: ActiveAdvertisement[];
}

// Fee Transaction Types
export interface FeeTransaction {
  id: string;
  fee_schema_id: string;
  advertisement_id: string;
  partner_id: string;
  merchant_id: string;
  transaction_type: 'charge' | 'refund' | 'bonus' | 'adjustment';
  status: 'pending' | 'processed' | 'settled' | 'failed' | 'cancelled' | 'disputed';
  base_amount: number;
  partner_amount: number;
  merchant_amount: number;
  glassbox_amount: number;
  total_amount: number;
  currency: string;
  view_count: number;
  display_duration: number;
  view_quality_score: number;
  location?: string;
  timezone: string;
  displayed_at: string;
  settlement_date?: string;
  settlement_batch_id?: string;
  processed_at?: string;
  processed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Settlement Types
export interface FeeSettlement {
  id: string;
  batch_id: string;
  settlement_type: 'daily' | 'weekly' | 'monthly' | 'manual';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  period_start: string;
  period_end: string;
  total_amount: number;
  partner_amount: number;
  merchant_amount: number;
  glassbox_amount: number;
  currency: string;
  transaction_count: number;
  partner_count: number;
  merchant_count: number;
  processed_at?: string;
  processed_by?: string;
  completed_at?: string;
  external_batch_id?: string;
  payment_provider?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Dashboard Types
export interface AdminDashboardData {
  total_revenue: number;
  total_transactions: number;
  total_views: number;
  average_revenue_per_view: number;
  partner_revenue: number;
  merchant_revenue: number;
  glassbox_revenue: number;
  transactions_by_status: Array<{
    status: string;
    count: number;
    total_amount: number;
  }>;
  revenue_growth: number;
  transaction_growth: number;
  view_growth: number;
  top_partners: Array<{
    partner_id: string;
    partner_name: string;
    transaction_count: number;
    total_revenue: number;
    total_views: number;
  }>;
  top_merchants: Array<{
    merchant_id: string;
    merchant_name: string;
    transaction_count: number;
    total_revenue: number;
    total_views: number;
  }>;
  settlement_summary: {
    total_settlements: number;
    total_amount: number;
  };
  pending_settlements: number;
  active_fee_schemas: number;
  average_quality_score: number;
  average_display_duration: number;
  currency: string;
  period_start: string;
  period_end: string;
  period_days: number;
}

export interface PartnerDashboardData {
  total_revenue: number;
  pending_revenue: number;
  processed_revenue: number;
  settled_revenue: number;
  revenue_growth: number;
  total_views: number;
  total_transactions: number;
  average_revenue_per_view: number;
  average_display_duration: number;
  average_quality_score: number;
  active_fee_schemas: number;
  transactions_by_status: Record<string, number>;
  revenue_by_day: Record<string, number>;
  top_advertisements: AdvertisementPerformance[];
  currency: string;
  period_start: string;
  period_end: string;
  period_days: number;
}

export interface MerchantDashboardData {
  total_revenue: number;
  pending_revenue: number;
  processed_revenue: number;
  settled_revenue: number;
  revenue_growth: number;
  total_views: number;
  total_transactions: number;
  average_revenue_per_view: number;
  average_display_duration: number;
  average_quality_score: number;
  active_devices: number;
  unique_advertisements: number;
  revenue_by_day: Record<string, number>;
  top_advertisements: AdvertisementPerformance[];
  device_performance: DevicePerformance[];
  currency: string;
  period_start: string;
  period_end: string;
  period_days: number;
}

export interface AdvertisementPerformance {
  advertisement_id: string;
  advertisement_name: string;
  views: number;
  revenue: number;
  total_duration: number;
  average_quality: number;
}

export interface DevicePerformance {
  device_id: string;
  device_name: string;
  views: number;
  revenue: number;
  total_duration: number;
  average_quality: number;
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Utility Types
export interface DateRange {
  start: string;
  end: string;
}

export interface FilterOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_range?: DateRange;
  partner_id?: string;
  merchant_id?: string;
  file_type?: string;
}

// Advertisement Types
export interface Advertisement {
  id: string;
  partner_id: string;
  title?: string; // Advertisement title (was name)
  content?: string; // URL to the content (image/video)
  type?: string; // Content type (image, video, etc.)
  categories?: string; // Comma-separated categories
  state?: 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE'; // Advertisement state
  rejection_reason?: string; // Reason for rejection
  created_by?: string;
  duration?: number; // Display duration in seconds
  description?: string;
  published_time_start?: string; // Start time
  published_time_end?: string; // End time
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Legacy fields for backward compatibility
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  image_url?: string;
  video_url?: string;
  merchant_ids?: string[];
}

export interface CreateAdvertisementRequest {
  partner_id?: string; // Optional - will be detected from bearer token
  title?: string; // Advertisement title
  content?: string; // URL to the content (image/video)
  type?: string; // Content type (image, video, etc.)
  categories?: string | string[]; // Categories as array or comma-separated string
  duration?: number; // Display duration in seconds
  description?: string;
  published_time_start?: string; // Start time
  published_time_end?: string; // End time
  // Legacy fields for backward compatibility
  name?: string;
  merchant_ids?: string[];
  status?: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  image_url?: string;
  video_url?: string;
}

// Fee Schema Types
export interface FeeSchema {
  id: string;
  name: string;
  description?: string;
  partner_percentage: number;
  merchant_percentage: number;
  glassbox_percentage: number;
  base_fee?: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateFeeSchemaRequest {
  name: string;
  description?: string;
  partner_percentage: number;
  merchant_percentage: number;
  glassbox_percentage: number;
  base_fee?: number;
}

// Asset/File Management Types
export interface Asset {
  id: string;
  name: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_url: string;
  url?: string;
  mime_type: string;
  file_type: string;
  file_size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    [key: string]: any;
  };
  uploaded_by: string;
  description?: string;
  tags?: string[];
  usage_count?: number;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mime_type: string;
}

// Process View Request
export interface ProcessViewRequest {
  advertisement_id: string;
  merchant_id: string;
  device_id?: string;
  display_duration: number;
  view_quality_score: number;
  location?: string;
  timezone?: string;
}

// Revenue Filters
export interface RevenueFilters {
  start_date?: string;
  end_date?: string;
  partner_id?: string;
  merchant_id?: string;
  currency?: string;
}

// Merchant Ad Assignment
export interface MerchantAd {
  id: string;
  merchant_id: string;
  advertisement_id: string;
  assigned_at: string;
  status: 'active' | 'inactive';
}

export interface DeviceAssignmentRequest {
  device_id: string;
  merchant_id: string;
}

// Comprehensive API Models from Swagger Specification

// Registration and Authentication
export interface RegistrationRequest {
  username: string;
  password: string;
  role: UserRole;
  tid?: string;
}

export interface AuthRequest {
  username: string;
  password: string;
}

export interface LoginDevice {
  device_id: string;
  device_secret: string;
  device_info?: {
    model?: string;
    os?: string;
    app_version?: string;
  };
}

export interface LoginDeviceResponse {
  access_token: string;
  device: Device;
  merchant: Merchant;
  expires_at: string;
}

// Device Token Management
export interface DeviceTokenRequest {
  fcm_token: string;
  device_type: 'android' | 'ios' | 'web';
}

// Enhanced User Model
export interface UserResponse {
  id: string;
  username: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  tid?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    avatar_url?: string;
  };
}

// Enhanced Device Model
export interface DeviceResponse {
  id: string;
  name: string;
  device_id: string;
  device_secret?: string;
  merchant_id: string;
  status: 'active' | 'inactive' | 'maintenance' | 'offline';
  device_type: 'tablet' | 'phone' | 'tv' | 'kiosk';
  location?: {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  device_info?: {
    model?: string;
    os?: string;
    app_version?: string;
    screen_resolution?: string;
  };
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Merchant Model
export interface MerchantResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  partner_id: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  business_info?: {
    business_name?: string;
    business_type?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
  };
  settings?: {
    timezone?: string;
    currency?: string;
    auto_approve_ads?: boolean;
  };
  created_at: string;
  updated_at: string;
}

// Enhanced Partner Model
export interface PartnerResponse {
  id: string;
  name: string;
  logo?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  company_info?: {
    company_name?: string;
    industry?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
  };
  settings?: {
    default_fee_schema_id?: string;
    auto_approve_merchants?: boolean;
  };
  created_at: string;
  updated_at: string;
}

// Fee Schema Models
export interface FeeSchemaResponse {
  id: string;
  name: string;
  description?: string;
  partner_percentage: number;
  merchant_percentage: number;
  glassbox_percentage: number;
  base_fee?: number;
  min_amount?: number;
  max_amount?: number;
  status: 'active' | 'inactive' | 'draft';
  valid_from?: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateFeeSchemaRequest {
  name: string;
  description?: string;
  partner_percentage: number;
  merchant_percentage: number;
  glassbox_percentage: number;
  base_fee?: number;
  min_amount?: number;
  max_amount?: number;
  valid_from?: string;
  valid_until?: string;
}

export interface UpdateFeeSchemaRequest extends Partial<CreateFeeSchemaRequest> {}

// Advertisement Models
export interface AdvertisementResponse {
  id: string;
  partner_id: string;
  title?: string; // Advertisement title (was name)
  content?: string; // URL to the content (image/video)
  type?: string; // Content type (image, video, etc.)
  categories?: string; // Comma-separated categories
  state?: 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE'; // Advertisement state
  rejection_reason?: string; // Reason for rejection
  created_by?: string;
  duration?: number; // Display duration in seconds
  description?: string;
  published_time_start?: string; // Start time
  published_time_end?: string; // End time
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Legacy fields for backward compatibility
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'expired';
  start_date?: string;
  end_date?: string;
  image_url?: string;
  video_url?: string;
  merchant_ids?: string[];
  partner_name?: string;
  target_merchants?: string[];
  target_locations?: string[];
  schedule?: {
    start_date: string;
    end_date?: string;
    time_slots?: Array<{
      start_time: string;
      end_time: string;
    }>;
  };
  budget?: {
    total_budget?: number;
    daily_budget?: number;
    cost_per_view?: number;
  };
  metrics?: {
    total_views: number;
    total_revenue: number;
    average_quality_score: number;
  };
}


// Process Advertisement View
export interface ProcessAdvertisementViewRequest {
  advertisement_id: string;
  device_id: string;
  merchant_id: string;
  view_data: {
    display_duration: number;
    view_quality_score: number;
    timestamp: string;
    location?: string;
    viewer_demographics?: {
      age_group?: string;
      gender?: string;
    };
  };
}

// Enhanced Asset Model
export interface AssetResponse {
  id: string;
  name: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_url: string;
  url?: string;
  mime_type: string;
  file_type: string;
  file_size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  metadata?: {
    duration?: number; // for videos
    format?: string;
    quality?: string;
  };
  uploaded_by: string;
  description?: string;
  tags?: string[];
  usage_count?: number;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

// Enhanced Revenue Report
export interface RevenueReportResponse {
  id: string;
  date: string;
  partner_id: string;
  merchant_id: string;
  total_revenue: number;
  partner_revenue: number;
  merchant_revenue: number;
  glassbox_revenue: number;
  transaction_count: number;
  currency: string;
  entity_type?: 'partner' | 'merchant' | 'glassbox';
  entity_id?: string;
  entity_name?: string;
  period?: {
    start_date: string;
    end_date: string;
    period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  };
  metrics?: {
    total_revenue: number;
    total_views: number;
    total_transactions: number;
    average_revenue_per_view: number;
    average_display_duration: number;
    average_quality_score: number;
  };
  breakdown?: {
    by_status: Record<string, { count: number; amount: number }>;
    by_date: Record<string, number>;
    by_advertisement?: Record<string, { views: number; revenue: number }>;
    by_merchant?: Record<string, { views: number; revenue: number }>;
    by_device?: Record<string, { views: number; revenue: number }>;
  };
  generated_at?: string;
}

// System Health and Monitoring
export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  services: {
    database: 'up' | 'down' | 'degraded';
    api: 'up' | 'down' | 'degraded';
    file_storage: 'up' | 'down' | 'degraded';
    payment_processor: 'up' | 'down' | 'degraded';
  };
  metrics: {
    active_devices: number;
    active_advertisements: number;
    pending_transactions: number;
    pending_settlements: number;
    system_uptime: number;
  };
  last_updated: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, { old_value: any; new_value: any }>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  created_at: string;
  details?: string;
}

// Bulk Operations
export interface BulkOperationRequest {
  operation: 'create' | 'update' | 'delete' | 'activate' | 'deactivate';
  resource_type: 'users' | 'merchants' | 'devices' | 'advertisements' | 'fee_schemas';
  items: Array<{
    id?: string;
    data?: any;
  }>;
}

export interface BulkOperationResponse {
  operation_id: string;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  total_items: number;
  processed_items: number;
  failed_items: number;
  results: Array<{
    item_id?: string;
    status: 'success' | 'failed';
    error?: string;
    result?: any;
  }>;
  started_at: string;
  completed_at?: string;
}

// Advanced Search
export interface SearchRequest {
  query?: string;
  filters?: {
    resource_type?: string[];
    date_range?: DateRange;
    status?: string[];
    tags?: string[];
    [key: string]: any;
  };
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResponse<T> {
  results: T[];
  total_count: number;
  facets?: Record<string, Record<string, number>>;
  suggestions?: string[];
  query_time: number;
}

// Revenue Report Types (from API spec)
export interface RevenueReport {
  entity_type: 'partner' | 'merchant' | 'glassbox';
  transaction_count: number;
  total_views: number;
  total_revenue: number;
  total_display_duration: number;
  average_revenue_per_view: number;
  average_display_duration: number;
  currency: string;
  pending_amount: number;
  processed_amount: number;
  settled_amount: number;
}

// Transaction Stats (from API spec)
export interface TransactionStats {
  total_transactions: number;
  total_revenue: number;
  total_partner_revenue: number;
  total_merchant_revenue: number;
  total_glassbox_revenue: number;
  total_views: number;
  avg_display_duration: number;
  avg_quality_score: number;
}

// Advertisement Assignment Types
export interface AssignAds {
  advertisement_id: string;
  merchant_id: string[];
  status?: string;
}

// Admin Analytics Types
export interface AdminAnalyticsResponse {
  period: {
    year: number;
    month: number;
  };
  analytics: AdminAnalytics;
}

export interface AdminAnalytics {
  total_revenue: number;
  total_ads_published: number;
  total_merchants: number;
  total_partners: number;
  revenue_by_month: MonthlyRevenue[];
  top_performing_ads: AdPerformance[];
  revenue_by_partner: PartnerRevenue[];
  revenue_by_merchant: MerchantRevenue[];
  ad_state_distribution: Record<string, number>;
  business_fee_breakdown: BusinessEntityRevenue[];
  ad_category_distribution: Record<string, number>;
}

export interface MonthlyRevenue {
  month: number;
  revenue: number;
}

export interface AdPerformance {
  advertisement_id: string;
  title: string;
  revenue: number;
  views: number;
  partner_name: string;
}

export interface PartnerRevenue {
  partner_id: string;
  partner_name: string;
  revenue: number;
  ad_count: number;
}

export interface MerchantRevenue {
  merchant_id: string;
  merchant_name: string;
  revenue: number;
  ad_views: number;
}

export interface BusinessEntityRevenue {
  entity_type: string;
  entity_name: string;
  revenue: number;
  fee_percentage: number;
}

// Device Activity Types
export interface DeviceActivity {
  id: string;
  device_id: string;
  merchant_id: string;
  merchant_name: string;
  activity_type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
