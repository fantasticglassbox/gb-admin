// User and Authentication Types
export interface User {
  id: number | string;
  username?: string;
  name?: string;
  email?: string;
  roles?: string[];
  role: UserRole;
  status?: UserStatus;
  tid?: string;
  // V2 entity bindings — populated when role is 'publisher' or
  // 'venue_partner' respectively. Empty string for other roles.
  publisher_id?: string;
  venue_partner_id?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export type UserRole =
  | 'admin'
  | 'partner'
  | 'merchant'
  | 'publisher'
  | 'venue_partner';
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
  // V2 binding. Empty / missing for legacy devices.
  outlet_id?: string;
  // V2 venue ownership — populated when the device is registered via
  // /partner/devices/register. Used by the admin assign-to-outlet
  // picker to restrict choices to outlets of the owning venue.
  venue_partner_id?: string;
  // V2 multi-zone layout binding. Empty = fullscreen (single main zone,
  // playlist behaves as before). Set via admin "Set layout" dialog.
  layout_id?: string;
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
  title?: string;

  // V2 canonical wire fields (GET /v2/advertisements, /v2/devices/*/playlist).
  // The backend emits these on every V2 response; v1 endpoints still emit
  // the legacy fields below. Readers should prefer canonical names and
  // fall back via the `adContentUrl` / `adContentType` / `adDuration`
  // helpers (see services/api.ts).
  content_url?: string;
  content_type?: string;
  duration_seconds?: number;

  // Legacy V1 names — kept for compatibility with v1 /advertisements/list
  // and the create/edit form which still POSTs against /v1. Will be
  // removed once /v2 has CREATE + UPDATE endpoints and the form migrates.
  /** @deprecated prefer content_url */
  content?: string;
  /** @deprecated prefer content_type */
  type?: string;
  /** @deprecated prefer duration_seconds */
  duration?: number;

  categories?: string; // Comma-separated categories
  state?: 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE'; // Advertisement state
  rejection_reason?: string; // Reason for rejection
  created_by?: string;
  description?: string;
  published_time_start?: string; // Start time
  published_time_end?: string; // End time
  /** V2 — which zone slug this ad targets (default 'main'). Picked at submit. */
  target_zone_slug?: string;
  /** V2 — Advertiser (brand) ownership for publisher-created ads. */
  advertiser_id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  // Legacy fields for backward compatibility (older list endpoint shapes)
  name?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  start_date?: string;
  end_date?: string;
  image_url?: string;
  video_url?: string;
  merchant_ids?: string[];
}

/** Read the playable URL from an Advertisement regardless of wire shape. */
export const adContentUrl = (a: Advertisement): string =>
  a.content_url || a.content || a.image_url || a.video_url || '';

/** Read the content type (IMAGE|VIDEO|…) regardless of wire shape. */
export const adContentType = (a: Advertisement): string =>
  (a.content_type || a.type || '').toString();

/** Read the duration in seconds regardless of wire shape. */
export const adDuration = (a: Advertisement): number =>
  a.duration_seconds ?? a.duration ?? 0;

export interface CreateAdvertisementRequest {
  partner_id?: string; // Optional - will be detected from bearer token
  /** V2 — set by publisher role; the brand this creative is for. */
  advertiser_id?: string;
  /** V2 — which zone slug this ad targets (default 'main'). */
  target_zone_slug?: string;
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
  publisher_id?: string;
  venue_partner_id?: string;
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
  /** V2 — which zone slug this ad targets (default 'main'). Picked at submit. */
  target_zone_slug?: string;
  /** V2 — Advertiser (brand) ownership for publisher-created ads. */
  advertiser_id?: string;
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

// =====================================================================
// V2 marketplace entities — see gb-admin/docs/PRD.md §4.
// Additive; existing Partner / Merchant types are kept for back-compat.
// =====================================================================

export type VenuePartnerStatus = 'ACTIVE' | 'SUSPENDED' | 'CHURNED';
export type VenuePartnerTier = 'NATIONAL' | 'REGIONAL' | 'SINGLE';

export interface VenuePartnerApiKeyResult {
  venue_partner_id: string;
  /** Plaintext key — returned once on rotate; persist nowhere. */
  api_key: string;
  api_key_prefix: string;
  api_key_set_at: string;
  /** Hint for the partner: HTTP Basic auth username = venue_partner_id. */
  username: string;
}

export interface VenuePartner {
  id: string;
  legal_name: string;
  display_name: string;
  npwp: string;
  pkp_registered: boolean;
  billing_address?: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_owner: string;
  /** First 12 chars of the issued API key (e.g. "gbx_abc12345"); empty if none. */
  api_key_prefix?: string;
  api_key_set_at?: string;
  contact_name: string;
  contact_email: string;
  contact_phone_wa: string;
  default_revenue_share_pct: number;
  tier: VenuePartnerTier;
  status: VenuePartnerStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** Populated by GET /v2/venue-partners list endpoint. */
  outlet_count?: number;
}

export type OutletStatus = 'ACTIVE' | 'PAUSED' | 'DECOMMISSIONED';

export type OutletType =
  | 'MALL'
  | 'CONVENIENCE_STORE'
  | 'FNB'
  | 'TRANSIT'
  | 'OFFICE'
  | 'KOST'
  | 'HOSPITAL'
  | 'GYM'
  | 'SALON'
  | 'EDUCATION'
  | 'GOVERNMENT'
  | 'OTHER';

export interface Outlet {
  id: string;
  venue_partner_id: string;
  display_name: string;
  address: string;
  city: string;
  province: string;
  country: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  outlet_type: OutletType;
  halal_only: boolean;
  /** CSV. Empty = no restriction. */
  permitted_categories: string;
  /** CSV. Examples: "TOBACCO,ALCOHOL,POLITICAL". */
  blocked_categories: string;
  /** Format: "mon=08:00-22:00,tue=...". Empty = 24/7. */
  operating_hours: string;
  /** NULL = inherit venue partner default. */
  revenue_share_pct_override?: number | null;
  status: OutletStatus;
  /** Default layout for this outlet. New devices paired in inherit
   *  this. Empty = no default; new devices land on fullscreen. */
  layout_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Publisher (seller side of the marketplace) ────────────────────────

export type PublisherStatus = 'ACTIVE' | 'SUSPENDED' | 'CHURNED';
export type PublisherKind = 'AGENCY' | 'BRAND_DIRECT' | 'RESELLER' | 'HOUSE';
export type PublisherTier = 'STRATEGIC' | 'STANDARD' | 'SELF_SERVE';

export interface Publisher {
  id: string;
  legal_name: string;
  display_name: string;
  npwp: string;
  pkp_registered: boolean;
  billing_address?: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_owner: string;
  contact_name: string;
  contact_email: string;
  contact_phone_wa: string;
  /** Publisher's cut of gross billable for inventory they bring (e.g. 15%). */
  default_commission_pct: number;
  kind: PublisherKind;
  tier: PublisherTier;
  status: PublisherStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** Populated by GET /v2/publishers list endpoint. */
  advertiser_count?: number;
}

// ── Advertiser (the brand whose ad runs) ──────────────────────────────

export type AdvertiserStatus = 'ACTIVE' | 'PAUSED' | 'BLACKLISTED';

export type AdvertiserCategory =
  | 'FOOD' | 'BEVERAGE' | 'RETAIL' | 'BEAUTY' | 'FASHION'
  | 'TECHNOLOGY' | 'AUTOMOTIVE' | 'HEALTHCARE' | 'FINANCE'
  | 'EDUCATION' | 'TRAVEL' | 'ENTERTAINMENT' | 'SPORTS'
  | 'REAL_ESTATE' | 'TELCO' | 'GOVERNMENT'
  | 'POLITICAL' | 'TOBACCO' | 'ALCOHOL' | 'GAMBLING'
  | 'OTHER';

export interface Advertiser {
  id: string;
  publisher_id: string;
  legal_name: string;
  display_name: string;
  logo_url: string;
  npwp: string;
  billing_address?: string;
  contact_name: string;
  contact_email: string;
  contact_phone_wa: string;
  category: AdvertiserCategory;
  status: AdvertiserStatus;
  /** TRUE for tobacco/alcohol/political/gambling — booking enforces against per-Outlet blocks. */
  requires_regulated_slot: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Settlements + Payments (V2 money layer) ───────────────────────────

export type SettlementStakeholderType = 'VENUE' | 'PUBLISHER';
export type SettlementStatus = 'DRAFT' | 'LOCKED' | 'PAID' | 'VOID';
export type PaymentMethod = 'BANK_TRANSFER' | 'VA' | 'CASH' | 'OTHER';

export interface Settlement {
  id: string;
  source_id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  stakeholder_type: SettlementStakeholderType;
  stakeholder_id: string;
  source_venue_partner_id: string;
  source_publisher_id: string;
  source_gross_idr: number;
  split_pct: number;
  amount_idr: number;
  pph23_idr: number;
  net_idr: number;
  status: SettlementStatus;
  payment_id: string;
  notes?: string;
  created_by: string;
  locked_by: string;
  locked_at?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Returned by POST /v2/settlements/entries — preview of the waterfall. */
export interface CreateEntryResult {
  source_id: string;
  venue_pct: number;
  publisher_pct: number;
  platform_pct: number;
  platform_idr: number;
  settlements: Settlement[];
}

export interface Payment {
  id: string;
  stakeholder_type: SettlementStakeholderType;
  stakeholder_id: string;
  amount_idr: number;
  method: PaymentMethod;
  reference: string;
  paid_at: string;
  recorded_by: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Per-role dashboard payloads. The backend auto-scopes by JWT claims, so
// admin-only callers may pass an override id via query string; other
// roles ignore the override.
export interface PublisherDashboard {
  publisher_id: string;
  advertisers_total: number;
  approvals_pending: number;
  approvals_approved: number;
  approvals_rejected: number;
  settlements_draft: number;
  settlements_locked: number;
  settlements_paid: number;
  pending_payout_idr: number;
  paid_this_month_idr: number;
  recent_settlements: Settlement[];
}

// V2 analytics types (per-role aggregate metrics).
//
// Most fields are simple counts/sums. `playback` returns zeros until
// gb-media starts pushing PlaybackEvents — the UI should show an
// empty-state for those panels rather than rendering 0-valued charts.

export interface ApprovalFunnel {
  proposed: number;
  approved: number;
  rejected: number;
  revoked: number;
}

export interface WeeklyPoint {
  week_start: string; // ISO date for the Monday
  count: number;
}

export interface MonthlyMoney {
  month: string; // "2026-04"
  amount_idr: number;
}

export interface TopCount {
  id: string;
  label: string;
  count: number;
}

export interface PlaybackSummary {
  total_events: number;
  completed: number;
  partial: number;
  errored: number;
  skipped: number;
  distinct_devices: number;
  distinct_ads: number;
}

export interface PublisherAnalytics {
  publisher_id: string;
  window_days: number;
  approvals_funnel: ApprovalFunnel;
  approvals_weekly: WeeklyPoint[];
  settlement_monthly: MonthlyMoney[];
  top_venues: TopCount[];
  top_advertisers: TopCount[];
  playback: PlaybackSummary;
}

export interface VenueFleet {
  devices_total: number;
  devices_active: number;
  devices_registered: number;
  outlets_total: number;
  outlets_active: number;
}

export interface VenuePartnerAnalytics {
  venue_partner_id: string;
  window_days: number;
  fleet: VenueFleet;
  approvals_funnel: ApprovalFunnel;
  approvals_weekly: WeeklyPoint[];
  settlement_monthly: MonthlyMoney[];
  top_advertisers: TopCount[];
  playback: PlaybackSummary;
}

// V2 ad-approval (booking) types
//
// One row per (advertisement × venue_partner). Approval is venue-wide:
// once a venue approves an ad, it plays on every outlet of that venue
// during the ad's own published_time window.

export type AdApprovalStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVOKED';

export interface AdApproval {
  id: string;
  advertisement_id: string;
  venue_partner_id: string;
  status: AdApprovalStatus;
  requested_by: string;
  decided_by: string;
  decided_at?: string;
  reject_reason?: string;
  revoked_by: string;
  revoked_at?: string;
  revoked_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitAdApprovalRequest {
  advertisement_id: string;
  venue_partner_ids: string[];
  notes?: string;
}

export interface SubmitAdApprovalResult {
  created: AdApproval[];
  skipped: { venue_partner_id: string; reason: string }[];
}

export interface PlaylistAd {
  id: string;
  title: string;
  /** Canonical wire field — replaces legacy `content`. */
  content_url: string;
  /** Canonical wire field — replaces legacy `type`. */
  content_type: string;
  /** Canonical wire field — replaces legacy `duration` (seconds). */
  duration_seconds: number;
  /** Layout zone the asset is pinned to. "main" when the device runs
   *  fullscreen (no layout). Multi-zone campaigns surface as multiple
   *  rows here — one per zone. */
  target_zone_slug: string;
  state?: string;
  approval_id: string;
  venue_partner_id: string;
}

export interface VenuePartnerDashboard {
  venue_partner_id: string;
  outlets_total: number;
  outlets_active: number;
  devices_total: number;
  devices_active: number;
  approvals_pending: number;
  approvals_approved: number;
  settlements_draft: number;
  settlements_locked: number;
  settlements_paid: number;
  pending_payout_idr: number;
  paid_this_month_idr: number;
  recent_settlements: Settlement[];
}


// V2 multi-zone layouts ----------------------------------------------------

/** A single rectangular region inside a layout. Coordinates are 0-100
 *  percentage points so the same template fits any aspect ratio. */
export interface LayoutZone {
  slug: string;
  x_pct: number;
  y_pct: number;
  w_pct: number;
  h_pct: number;
  /** Which content kinds this zone is willing to play. */
  accepts: ('video' | 'image' | 'ticker')[];
}

export type LayoutStatus = 'ACTIVE' | 'DEPRECATED';

/** Platform-defined screen template. Devices reference one layout via
 *  Device.layout_id; gb-media reads zones[] and lays out widgets at the
 *  declared rectangles. */
export interface Layout {
  id: string;
  slug: string;
  display_name: string;
  description?: string;
  zones: LayoutZone[];
  status: LayoutStatus;
}

// ----- V2 campaigns (Epic-D D-1/D-2) -----
//
// A Campaign is the atomic V2 unit of advertiser intent. It owns one
// or more CampaignAssets, each pinned to a layout zone slug, so a
// single approval per (campaign × venue) covers a multi-zone layout.
// Replaces the V1 Advertisement-shaped flow on the V2 surface.

export type CampaignState = 'DRAFT' | 'PUBLISHED' | 'REJECTED' | 'INACTIVE';

export type CampaignAssetType = 'IMAGE' | 'VIDEO';

export interface CampaignAsset {
  id: string;
  campaign_id: string;
  zone_slug: string;
  content_url: string;
  content_type: CampaignAssetType;
  duration_seconds: number;
  sort_order: number;
  sha256?: string;
  size_bytes?: number;
  version?: number;
  created_at: string;
  updated_at: string;
}

/** Per-status approval count for one campaign. Returned inline on
 *  CampaignResponse so list views can show submission outcomes without
 *  a separate /campaign-approvals roundtrip. */
export interface ApprovalSummary {
  proposed: number;
  approved: number;
  rejected: number;
  revoked: number;
}

/** Per-campaign proof-of-play roll-up returned by
 *  GET /v2/analytics/campaign-playback. Values are summed across the
 *  requested time range (default last 30 days) from playback_aggregates.
 *  Impressions = `complete_count` only — a partial render doesn't bill
 *  as an impression. */
export interface CampaignPlaybackRow {
  campaign_id: string;
  campaign_title: string;
  complete_count: number;
  partial_count: number;
  error_count: number;
  skipped_count: number;
  total_played_ms: number;
  total_expected_ms: number;
  device_count: number;
  venue_count: number;
}

export interface CampaignPlaybackResponse {
  data: CampaignPlaybackRow[];
  from: string;
  to: string;
}

/** Per-(device × asset × error_code) failure tally returned by
 *  GET /v2/analytics/playback-errors. Lets the admin diagnose which
 *  hardware is dropping which content with what error code — the
 *  "CODEC_UNSUPPORTED on every Cocaa TV" story. Manufacturer / model /
 *  device_type come from the joined devices row and may be empty for
 *  unregistered or pre-heartbeat devices. */
export interface PlaybackErrorRow {
  device_id: string;
  device_name: string;
  manufacturer: string;
  model: string;
  device_type: string;
  campaign_id: string;
  campaign_title: string;
  campaign_asset_id: string;
  error_code: string;
  error_count: number;
  last_seen: string;
}

export interface PlaybackErrorsResponse {
  data: PlaybackErrorRow[];
  from: string;
  to: string;
}

export interface Campaign {
  id: string;
  publisher_id?: string;
  advertiser_id?: string;
  title: string;
  description?: string;
  /** Layout the publisher designed against. Drives editor zone picker
   *  + live preview. Empty = no preferred layout. */
  target_layout_id?: string;
  categories?: string;
  /** Day-of-week schedule. CSV: "mon=08:00-22:00,tue=08:00-22:00,...".
   *  Empty = 24/7. Days not listed = dark that day. */
  playing_hours?: string;
  published_time_start: string;
  published_time_end: string;
  state: CampaignState;
  rejection_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  assets: CampaignAsset[];
  /** Submission outcomes per status. Zeros across the board means the
   *  campaign has never been submitted. */
  approval_summary: ApprovalSummary;
}

export interface CreateCampaignRequest {
  advertiser_id: string;
  title: string;
  description?: string;
  target_layout_id?: string;
  categories?: string;
  playing_hours?: string;
  published_time_start: string;
  published_time_end: string;
}

export interface UpdateCampaignRequest {
  title?: string;
  description?: string;
  target_layout_id?: string;
  categories?: string;
  playing_hours?: string;
  published_time_start?: string;
  published_time_end?: string;
}

export interface CreateCampaignAssetRequest {
  zone_slug: string;
  content_url: string;
  content_type: CampaignAssetType;
  duration_seconds?: number;
  sort_order?: number;
  sha256?: string;
  size_bytes?: number;
}

export type CampaignApprovalStatus =
  | 'PROPOSED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVOKED';

export interface CampaignApproval {
  id: string;
  campaign_id: string;
  venue_partner_id: string;
  outlet_group_id?: string;
  status: CampaignApprovalStatus;
  requested_by: string;
  decided_by: string;
  decided_at?: string;
  reject_reason?: string;
  revoked_by: string;
  revoked_at?: string;
  revoked_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SubmitCampaignRequest {
  campaign_id: string;
  venue_partner_ids: string[];
  outlet_group_ids?: string[];
  notes?: string;
}

export interface SubmitCampaignResult {
  created: CampaignApproval[];
  skipped: { venue_partner_id: string; reason: string }[];
}

// ----- V2 outlet groups (Epic-D phase 1) -----

/** How an OutletGroup computes its membership.
 *  ANY            — every outlet of the venue (one per venue, always present)
 *  SYSTEM_AUTO    — predicate (city = X or province = Y), resolved on the fly
 *  VENUE_CURATED  — explicit member list managed by the venue partner */
export type OutletGroupKind = 'ANY' | 'SYSTEM_AUTO' | 'VENUE_CURATED';

/** Status badge used by the picker to grey out non-selectable groups. */
export type OutletGroupStatus = 'ACTIVE' | 'DEPRECATED';

/** A targetable subset of a venue's outlets. Publishers pick groups
 *  (not individual outlets) when submitting an ad. */
export interface OutletGroup {
  id: string;
  venue_partner_id: string;
  slug: string;
  display_name: string;
  description?: string;
  kind: OutletGroupKind;
  status: OutletGroupStatus;
  /** SYSTEM_AUTO only — e.g. {field: "city", value: "Bandung"}. */
  predicate?: { field: string; value: string } | null;
  /** Resolved live by the backend (lightweight count, not an array). */
  member_count: number;
}

// ----- Targeting preview (Epic-D phase 2) -----

export interface TargetingPreviewRequest {
  /** Optional — when provided, compliance_exceptions is populated by
   *  intersecting the ad's categories with each outlet's blocked_categories. */
  advertisement_id?: string;
  outlet_group_ids: string[];
}

export interface PreviewVenueRow {
  venue_partner_id: string;
  outlets: number;
}

export interface PreviewCityRow {
  city: string;
  outlets: number;
}

export interface PreviewException {
  outlet_id: string;
  outlet_name: string;
  venue_partner_id: string;
  blocked_category: string;
  outlet_group_id: string;
  outlet_group_name: string;
}

export interface TargetingPreview {
  total_outlets: number;
  total_cities: number;
  total_venues: number;
  by_venue: PreviewVenueRow[];
  top_cities: PreviewCityRow[];
  compliance_exceptions: PreviewException[];
  fan_out_groups: number;
  exception_count: number;
}
