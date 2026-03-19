// =================================
// TYPES USERS (Gestion des utilisateurs)
// =================================

export interface UserCacheData {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  emailVerified: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  tokenType: string | null;
}
