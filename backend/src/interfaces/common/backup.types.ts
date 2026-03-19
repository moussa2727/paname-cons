// =================================
// TYPES BACKUP (Sauvegarde système)
// =================================

export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: string;
  compression: boolean;
  encryption: boolean;
  destination: string;
}

export interface BackupResult {
  success: boolean;
  timestamp: string;
  filename: string;
  size: number;
  duration: number;
  error?: string;
}
