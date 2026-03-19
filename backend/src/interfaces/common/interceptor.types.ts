// =================================
// TYPES INTERCEPTORS (Gestion des interceptors)
// =================================

export interface InterceptorTiming {
  startTime: number;
  endTime: number;
  duration: number;
}

export interface InterceptorError {
  message: string;
  stack?: string;
  response?: any;
}
