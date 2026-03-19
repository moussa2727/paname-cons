// =================================
// TYPES QUEUE (Gestion des files d'attente)
// =================================

export interface QueueJobData {
  name: string;
  data: any;
  opts?: {
    attempts?: number;
    delay?: number;
    priority?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  };
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}
