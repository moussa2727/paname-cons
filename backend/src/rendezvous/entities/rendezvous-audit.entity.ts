import { RendezvousEntity } from './rendezvous.entity';

/**
 * Entité pour l'audit des rendez-vous
 */
export class RendezvousAuditEntity {
  id: string;
  rendezvousId: string;
  action: 'CREATE' | 'UPDATE' | 'CANCEL' | 'COMPLETE' | 'RESCHEDULE';
  oldData: Partial<RendezvousEntity> | null;
  newData: Partial<RendezvousEntity> | null;
  changedBy: string; // userId
  changedByRole: 'ADMIN' | 'USER' | 'SYSTEM';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Entité pour l'historique des modifications
 */
export class RendezvousHistoryEntity {
  rendezvousId: string;
  history: {
    date: Date;
    action: string;
    changedBy: string;
    changes: {
      field: string;
      oldValue: any;
      newValue: any;
    }[];
  }[];
}
