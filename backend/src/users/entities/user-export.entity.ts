/**
 * Entité pour l'export des données utilisateur (RGPD)
 */
export class UserDataExportEntity {
  profile: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    telephone: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  statistics: {
    loginCount: number;
    lastLogin: Date | null;
    procedureCount: number;
    rendezvousCount: number;
    contactCount: number;
  };
  procedures: {
    id: string;
    destination: string;
    filiere: string;
    statut: string;
    createdAt: Date;
    steps: any[];
  }[];
  rendezvous: {
    id: string;
    date: string;
    time: string;
    destination: string;
    status: string;
    createdAt: Date;
  }[];
  contacts: {
    id: string;
    message: string;
    adminResponse: string | null;
    createdAt: Date;
  }[];
  sessions: {
    loginAt: Date;
    logoutAt: Date | null;
    ipAddress: string | null;
    userAgent: string | null;
  }[];
  exportDate: Date;
  format: 'json' | 'csv';
}
