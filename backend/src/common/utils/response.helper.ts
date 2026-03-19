// Interface pour les réponses API standardisées
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

// Interface pour les réponses d'erreur
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

// Interface pour les réponses de succès avec pagination
export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Interface pour les réponses de validation
export interface ValidationErrorResponse extends ErrorResponse {
  error: {
    code: string;
    message: string;
    details: {
      field: string;
      message: string;
      value?: any;
    }[];
  };
}

// Interface pour les réponses d'authentification
export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user?: any;
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  timestamp: string;
  path: string;
  method?: string;
  statusCode: number;
}

// Codes d'erreur standardisés
export enum ErrorCode {
  // Erreurs de validation (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Erreurs d'authentification (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Erreurs d'autorisation (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Erreurs de ressource (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Erreurs de conflit (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // Erreurs serveur (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Erreurs de limite (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Erreurs métier (custom)
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  HOLIDAY_OR_WEEKEND = 'HOLIDAY_OR_WEEKEND',
  APPOINTMENT_UNAVAILABLE = 'APPOINTMENT_UNAVAILABLE',
}

// Messages d'erreur standardisés
export enum ErrorMessage {
  SUCCESS = 'Opération réussie',
  CREATED = 'Ressource créée avec succès',
  UPDATED = 'Ressource mise à jour avec succès',
  DELETED = 'Ressource supprimée avec succès',

  VALIDATION_ERROR = 'Erreur de validation des données',
  MISSING_REQUIRED_FIELD = 'Champ obligatoire manquant',
  INVALID_FORMAT = 'Format de données invalide',

  UNAUTHORIZED = 'Non autorisé',
  INVALID_TOKEN = 'Token invalide',
  TOKEN_EXPIRED = 'Token expiré',

  FORBIDDEN = 'Accès interdit',
  INSUFFICIENT_PERMISSIONS = 'Permissions insuffisantes',

  NOT_FOUND = 'Ressource non trouvée',
  RESOURCE_NOT_FOUND = 'Ressource demandée non trouvée',

  CONFLICT = 'Conflit de données',
  DUPLICATE_RESOURCE = 'Ressource déjà existante',

  INTERNAL_SERVER_ERROR = 'Erreur interne du serveur',
  DATABASE_ERROR = 'Erreur de base de données',
  EXTERNAL_SERVICE_ERROR = 'Erreur service externe',

  RATE_LIMIT_EXCEEDED = 'Limite de requêtes dépassée',

  BUSINESS_LOGIC_ERROR = 'Erreur logique métier',
  HOLIDAY_OR_WEEKEND = 'Jour férié ou week-end',
  APPOINTMENT_UNAVAILABLE = 'Créneau de rendez-vous indisponible',
}

// Fonctions utilitaires pour créer des réponses
export class ResponseHelper {
  /**
   * Crée une réponse de succès
   */
  static success<T>(
    data: T,
    message: string = ErrorMessage.SUCCESS,
    statusCode: number = 200,
    path?: string,
    method?: string,
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
      path: path || '',
      method,
      statusCode,
    };
  }

  /**
   * Crée une réponse de succès avec pagination
   */
  static paginated<T>(
    data: T,
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
    message: string = ErrorMessage.SUCCESS,
    statusCode: number = 200,
    path?: string,
    method?: string,
  ): PaginatedResponse<T> {
    return {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
      path: path || '',
      method,
      statusCode,
    };
  }

  /**
   * Crée une réponse d'erreur
   */
  static error(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return {
      success: false,
      message,
      error: {
        code,
        message,
        details: details as Record<string, unknown> | undefined,
      },
      timestamp: new Date().toISOString(),
      path: path || '',
      method,
      statusCode,
    };
  }

  /**
   * Crée une réponse d'erreur de validation
   */
  static validationError(
    details: {
      field: string;
      message: string;
      value?: any;
    }[],
    message: string = ErrorMessage.VALIDATION_ERROR,
    path?: string,
    method?: string,
  ): ValidationErrorResponse {
    return {
      success: false,
      message,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
      path: path || '',
      method,
      statusCode: 400,
    };
  }

  /**
   * Crée une réponse d'authentification
   */
  static authResponse(
    user: any,
    tokens?: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    },
    message: string = 'Authentification réussie',
    statusCode: number = 200,
    path?: string,
    method?: string,
  ): AuthResponse {
    return {
      success: true,
      message,
      data: {
        user: user as Record<string, unknown>,
        tokens: tokens as {
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        },
      },
      timestamp: new Date().toISOString(),
      path: path || '',
      method,
      statusCode,
    };
  }

  /**
   * Crée une réponse de non trouvé
   */
  static notFound(
    resource: string = 'Ressource',
    message?: string,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.NOT_FOUND,
      message || `${resource} non trouvée`,
      404,
      undefined,
      path,
      method,
    );
  }

  /**
   * Crée une réponse d'accès interdit
   */
  static forbidden(
    message: string = ErrorMessage.FORBIDDEN,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(ErrorCode.FORBIDDEN, message, 403, details, path, method);
  }

  /**
   * Crée une réponse d'autorisation requise
   */
  static unauthorized(
    message: string = ErrorMessage.UNAUTHORIZED,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.UNAUTHORIZED,
      message,
      401,
      details,
      path,
      method,
    );
  }

  /**
   * Crée une réponse de conflit
   */
  static conflict(
    message: string = ErrorMessage.CONFLICT,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(ErrorCode.CONFLICT, message, 409, details, path, method);
  }

  /**
   * Crée une réponse d'erreur serveur
   */
  static internalError(
    message: string = ErrorMessage.INTERNAL_SERVER_ERROR,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      500,
      details,
      path,
      method,
    );
  }

  /**
   * Crée une réponse de limite dépassée
   */
  static rateLimitExceeded(
    message: string = ErrorMessage.RATE_LIMIT_EXCEEDED,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      429,
      details,
      path,
      method,
    );
  }

  /**
   * Crée une réponse d'erreur métier
   */
  static businessError(
    message: string,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.BUSINESS_LOGIC_ERROR,
      message,
      400,
      details,
      path,
      method,
    );
  }

  /**
   * Crée une réponse pour jour férié/week-end
   */
  static holidayOrWeekend(
    message: string = ErrorMessage.HOLIDAY_OR_WEEKEND,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.BUSINESS_LOGIC_ERROR,
      message,
      400,
      undefined,
      path,
      method,
    );
  }

  /**
   * Crée une réponse pour créneau indisponible
   */
  static appointmentUnavailable(
    message: string = ErrorMessage.APPOINTMENT_UNAVAILABLE,
    details?: any,
    path?: string,
    method?: string,
  ): ErrorResponse {
    return this.error(
      ErrorCode.BUSINESS_LOGIC_ERROR,
      message,
      400,
      details,
      path,
      method,
    );
  }
}
