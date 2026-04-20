/**
 * IP Fabric API Type Definitions
 * These types define the structure of data returned from IP Fabric API endpoints
 */

// Base API Response Types
export interface APIResponse<T = unknown> {
  data: T;
  _meta?: {
    size: number;
    limit: number;
    start: number;
    total?: number;
  };
  _error?: {
    status: number;
    message: string;
    isAuthError?: boolean;
  };
}

export interface APICallOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  skipSnapshot?: boolean;
}

// Snapshot Types
export interface Snapshot {
  id: string;
  name: string;  // Original name from IP Fabric (immutable)
  displayName: string;  // UI-friendly name for display
  createdAt: string;
  state: 'loaded' | 'unloaded' | 'loading';
  note?: string;
  version?: string;
  locked?: boolean;
  totalDeviceCount?: number;
}

// Device Types
export interface Device {
  hostname: string;
  vendor: string;
  model?: string;
  version: string;
  platform?: string;
  family?: string;
  sn?: string;
  siteName?: string;
  loginIp?: string;
  loginType?: string;
}

export interface DeviceWithStatus extends Device {
  intentCheckStatus?: IntentCheckStatus;
  complianceScore?: number;
}

// Intent Check Types
export interface IntentCheckStatus {
  '0'?: number;   // Passed
  '10'?: number;  // Warning
  '20'?: number;  // Failed
  '30'?: number;  // Critical
}

export interface IntentCheckResult {
  name: string;
  value: number;
  color: string;
}

export interface IntentCheckReport {
  id?: string;
  name: string;
  status?: string;
  result: {
    count: number;
    checks: IntentCheckStatus;
  };
  groups?: Array<{ name: string }>;
  descriptions?: {
    general?: string;
    checks?: Record<string, string>;
  };
  webEndpoint?: string;
}

// Discovery Types
export interface DiscoveryTask {
  hostname: string;
  taskName: string;
  status: 'completed' | 'failed' | 'running';
  message?: string;
}

export interface DiscoveryIssue {
  hostname: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Site Types
export interface Site {
  siteName: string;
  id?: string;
  location?: string;
  deviceCount?: number;
}

// Table Request Types
export interface TableRequest {
  columns: string[];
  filters?: Record<string, unknown>;
  snapshot?: string;
  pagination?: {
    limit: number;
    start: number;
  };
  sort?: {
    column: string;
    order: 'asc' | 'desc';
  };
}

// Metric Types for Dashboard
export interface DashboardMetrics {
  totalDevices: number;
  siteCount: number;
  discoveryErrors: number;
  versionVariance: number;
  platformTypes: number;
  endOfSupportPercentage: number;
}

// Compliance Types
export interface ComplianceData {
  overallScore: number;
  categories: ComplianceCategory[];
  trend: ComplianceTrend[];
}

export interface ComplianceCategory {
  name: string;
  score: number;
  weight: number;
  details?: string;
}

export interface ComplianceTrend {
  date: string;
  score: number;
}

// Authentication Types
export interface AuthSession {
  user?: {
    email: string;
    apiUrl: string;
    name?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

// Persistence Types
export interface PersistenceData {
  preferences?: Record<string, unknown>;
  compliance?: ComplianceData;
  dashboard?: DashboardMetrics;
  timestamp?: number;
}

// API Function Type
export type APICallFunction = <T = unknown>(
  endpoint: string,
  options?: APICallOptions
) => Promise<APIResponse<T>>;