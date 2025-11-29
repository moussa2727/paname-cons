// AdminUserService.ts - VERSION CORRIGÉE
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  logoutUntil?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  adminUsers: number;
  regularUsers: number;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  password: string;
  role: 'admin' | 'user';
}

export interface UpdateUserDto {
  email?: string;
  telephone?: string;
}

class AdminUserService {
  private baseURL: string;

  constructor() {
    this.baseURL =
      import.meta.env.VITE_API_URL || 'https://panameconsulting.up.railway.app';
  }

  private async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const requestOptions: RequestInit = {
      ...options,
      credentials: 'include' as RequestCredentials,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);

    if (!response.ok) {
      await this.handleAdminError(response);
    }

    return response;
  }

  private async handleAdminError(response: Response): Promise<never> {
    // ✅ MASQUAGE DES DONNÉES SENSIBLES DANS LES LOGS
    const errorData = await response.json().catch(() => ({}));
    const safeMessage = errorData.message
      ? errorData.message.replace(/[a-f0-9]{24,}/gi, 'id_****')
      : `Erreur ${response.status}`;

    switch (response.status) {
      case 400:
        throw new Error(safeMessage);
      case 401:
        throw new Error('Session expirée - Veuillez vous reconnecter');
      case 403:
        throw new Error('Accès refusé - Droits administrateur requis');
      case 404:
        throw new Error('Utilisateur non trouvé');
      default:
        throw new Error(safeMessage);
    }
  }

  // ✅ MÉTHODES CONFORMES AU BACKEND
  async getAllUsers(): Promise<User[]> {
    const response = await this.makeAuthenticatedRequest('/api/users');
    const data = await response.json();
    return data || [];
  }

  async getUserStats(): Promise<UserStats> {
    const response = await this.makeAuthenticatedRequest('/api/users/stats');
    return await response.json();
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const cleanedData = {
      ...userData,
      email: userData.email.toLowerCase().trim(),
      telephone: userData.telephone.trim(),
    };

    const response = await this.makeAuthenticatedRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(cleanedData),
    });

    return await response.json();
  }

  async updateUser(userId: string, userData: UpdateUserDto): Promise<User> {
    const allowedUpdate: UpdateUserDto = {};

    if (userData.email !== undefined) {
      allowedUpdate.email = userData.email.toLowerCase().trim();
    }

    if (userData.telephone !== undefined) {
      allowedUpdate.telephone = userData.telephone.trim();
    }

    if (Object.keys(allowedUpdate).length === 0) {
      throw new Error('Aucune donnée valide à mettre à jour');
    }

    const response = await this.makeAuthenticatedRequest(
      `/api/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(allowedUpdate),
      }
    );

    return await response.json();
  }

  async deleteUser(userId: string): Promise<void> {
    await this.makeAuthenticatedRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async toggleUserStatus(userId: string): Promise<User> {
    const response = await this.makeAuthenticatedRequest(
      `/api/users/${userId}/toggle-status`,
      {
        method: 'PATCH',
      }
    );

    return await response.json();
  }

  async adminResetPassword(
    userId: string,
    passwordData: { newPassword: string; confirmNewPassword: string }
  ): Promise<void> {
    const response = await this.makeAuthenticatedRequest(
      `/api/users/${userId}/admin-reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({
          newPassword: passwordData.newPassword,
          confirmNewPassword: passwordData.confirmNewPassword,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Erreur lors de la réinitialisation du mot de passe');
    }
  }

  // ✅ DÉLÉGATION TOTALE AU CONTEXTE - PAS DE GESTION D'AUTH ICI
  async checkAdminAccess(): Promise<boolean> {
    try {
      await this.getUserStats();
      return true;
    } catch (error: unknown) {
      return false;
    }
  }
}

export const adminUserService = new AdminUserService();
export default AdminUserService;
