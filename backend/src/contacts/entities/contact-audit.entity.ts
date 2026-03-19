import { ContactEntity } from './contact.entity';

/**
 * Entité pour l'audit des contacts
 */
export class ContactAuditEntity {
  id: string;
  contactId: string;
  action: 'CREATE' | 'READ' | 'RESPOND' | 'DELETE';
  performedBy: string; // userId
  performedByRole: 'ADMIN' | 'USER' | 'SYSTEM';
  oldData: Partial<ContactEntity> | null;
  newData: Partial<ContactEntity> | null;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Entité pour l'historique des réponses
 */
export class ContactResponseHistoryEntity {
  contactId: string;
  originalMessage: {
    content: string;
    sentAt: Date;
    sender: {
      name: string;
      email: string;
    };
  };
  responses: {
    content: string;
    respondedAt: Date;
    respondedBy: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}
