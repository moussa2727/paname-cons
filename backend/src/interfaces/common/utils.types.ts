// =================================
// TYPES UTILS (Utilitaires communs)
// =================================

export interface SanitizedHeaders {
  [key: string]: string;
}

export interface SanitizedBody {
  [key: string]: unknown;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
  method?: string;
  statusCode: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
  method?: string;
  statusCode: number;
}
