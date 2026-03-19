export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  telephone: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  tokenType: string | null;
}
