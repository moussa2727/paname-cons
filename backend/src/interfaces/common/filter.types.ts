// =================================
// TYPES FILTERS (Gestion des erreurs)
// =================================

export interface HttpErrorMetadata {
  message: string;
  status: number;
  path: string;
  method: string;
  stack?: string;
}

export interface PrismaErrorMetadata {
  message: string;
  stack?: string;
  path: string;
  method: string;
  errorCode?: string;
  validationError?: string;
}

export interface JsonErrorMetadata {
  message: string;
  name: string;
  stack?: string;
}
