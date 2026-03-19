// =================================
// TYPES CONTACTS (Gestion des contacts)
// =================================

export interface ContactJobData {
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    receivedAt: string;
  };
}

export interface ContactNotificationData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  id: string;
  receivedAt: string;
}

export interface ContactReplyData {
  firstName: string;
  lastName: string;
  message: string;
  adminResponse: string;
  id: string;
  respondedAt: string;
}
