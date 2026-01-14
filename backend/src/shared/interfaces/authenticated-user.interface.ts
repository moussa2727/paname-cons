// src/shared/interfaces/authenticated-user.interface.ts
export interface AuthenticatedUser {
  id: string;           
  sub?: string;         
  userId?: string;     
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  telephone?: string;
  isActive?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}