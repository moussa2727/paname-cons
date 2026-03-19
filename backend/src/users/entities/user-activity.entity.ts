/**
 * Entité pour l'activité récente d'un utilisateur
 */
export class UserActivityEntity {
  userId: string;
  lastLogin: Date | null;
  lastLogout: Date | null;
  lastProcedure: {
    id: string;
    date: Date;
    status: string;
  } | null;
  lastRendezvous: {
    id: string;
    date: string;
    time: string;
    status: string;
  } | null;
  lastContact: {
    id: string;
    date: Date;
    subject: string;
  } | null;
  activitySummary: {
    proceduresCreated: number;
    rendezvousCreated: number;
    contactsSent: number;
    logins: number;
  };
}

/**
 * Entité pour les actions récentes
 */
export class UserRecentActionEntity {
  id: string;
  userId: string;
  actionType:
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE_PROCEDURE'
    | 'UPDATE_PROCEDURE'
    | 'CREATE_RENDEZVOUS'
    | 'CANCEL_RENDEZVOUS'
    | 'SEND_CONTACT';
  description: string;
  entityId: string | null;
  entityType: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
