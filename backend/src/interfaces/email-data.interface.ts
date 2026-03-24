export interface EmailData {
  to: string;
  from?: string;
  fromName?: string;
  subject: string;
  html: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface BaseEmailData {
  firstName: string;
  lastName?: string;
  email: string;
}
