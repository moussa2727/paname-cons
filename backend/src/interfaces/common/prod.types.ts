// =================================
// TYPES PRODUCTION (Production)
// =================================

export interface ProdConfig {
  hotReload: false;
  debug: false;
  profiling: false;
  tracing: false;
  mockData: false;
  apiDocs: false;
  playground: false;
  security: {
    enabled: true;
    rateLimiting: true;
    cors: true;
    helmet: true;
  };
}
