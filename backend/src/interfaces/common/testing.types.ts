// =================================
// TYPES TESTING (Tests unitaires)
// =================================

export interface TestData {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestConfig {
  database: {
    url: string;
    synchronize: boolean;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
  logging: {
    level: string;
    console: boolean;
    file: boolean;
  };
}
