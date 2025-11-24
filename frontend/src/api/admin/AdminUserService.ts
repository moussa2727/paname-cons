// AdminUserService.ts
import { toast } from 'react-toastify';

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
  private token: string | null = null;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    this.initializeToken();
  }

  private initializeToken(): void {
    try {
      this.token = localStorage.getItem('token');
    } catch (error) {
      console.error('Erreur accès localStorage:', error);
    }
  }

  private async makeAuthenticatedRequest(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.token) {
      throw new Error('Token non disponible');
    }

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include' as RequestCredentials
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, requestOptions);

    if (response.status === 401) {
      const refreshed = await this.refreshToken();
      if (refreshed && this.token) {
        requestOptions.headers = {
          ...requestOptions.headers,
          'Authorization': `Bearer ${this.token}`
        };
        return fetch(`${this.baseURL}${endpoint}`, requestOptions);
      } else {
        throw new Error('Session expirée - Veuillez vous reconnecter');
      }
    }

    return response;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });

      if (!response.ok) return false;

      const data = await response.json();
      
      if (data.accessToken) {
        localStorage.setItem('token', data.accessToken);
        this.token = data.accessToken;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erreur rafraîchissement token:', error);
      return false;
    }
  }

  private getRefreshToken(): string | null {
    try {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('refresh_token='))
        ?.split('=')[1];
      
      if (cookieValue) return cookieValue;

      return localStorage.getItem('refresh_token');
    } catch (error) {
      console.error('Erreur récupération refresh token:', error);
      return null;
    }
  }

  // === MÉTHODES ADMIN UNIQUEMENT ===

  async getAllUsers(): Promise<User[]> {
    try {
      const response = await this.makeAuthenticatedRequest('/api/users');

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Vous n\'avez pas les permissions administrateur');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Erreur ${response.status} lors de la récupération des utilisateurs`
        );
      }

      const data = await response.json();
      return data.data || data || [];

    } catch (error) {
      console.error('Erreur getAllUsers:', error);
      throw error;
    }
  }

  async getUserStats(): Promise<UserStats> {
    try {
      const response = await this.makeAuthenticatedRequest('/api/users/stats');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la récupération des statistiques'
        );
      }

      return await response.json();

    } catch (error) {
      console.error('Erreur getUserStats:', error);
      throw error;
    }
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la création de l\'utilisateur'
        );
      }

      const data = await response.json();
      return data.data || data;

    } catch (error) {
      console.error('Erreur createUser:', error);
      throw error;
    }
  }

  async updateUser(userId: string, userData: UpdateUserDto): Promise<User> {
    try {
      console.log('🔄 Mise à jour utilisateur:', userId, userData);
      
      const response = await this.makeAuthenticatedRequest(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(userData),
      });

      console.log('📩 Réponse mise à jour:', response.status);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Utilisateur non trouvé');
        }
        
        let errorMessage = `Erreur ${response.status} lors de la mise à jour`;
        try {
          const errorData = await response.json();
          console.log('📋 Données d\'erreur:', errorData);
          
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          
          if (errorMessage.includes('déjà utilisé') || errorMessage.includes('duplicate')) {
            errorMessage = 'Cet email ou numéro de téléphone est déjà utilisé';
          } else if (errorMessage.includes('Format d\'email')) {
            errorMessage = 'Format d\'email invalide';
          } else if (errorMessage.includes('téléphone')) {
            errorMessage = 'Numéro de téléphone invalide';
          }
        } catch (parseError) {
          console.error('❌ Impossible de parser l\'erreur:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('✅ Utilisateur mis à jour avec succès:', data);
      return data;

    } catch (error) {
      console.error('❌ Erreur updateUser:', error);
      throw error;
    }
  }

  async adminResetPassword(
    userId: string, 
    passwordData: { newPassword: string; confirmNewPassword: string }
  ): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(`/api/users/${userId}/admin-reset-password`, {
        method: 'POST',
        body: JSON.stringify(passwordData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la réinitialisation du mot de passe'
        );
      }

      console.log('✅ Mot de passe réinitialisé avec succès');

    } catch (error) {
      console.error('❌ Erreur adminResetPassword:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const response = await this.makeAuthenticatedRequest(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Utilisateur non trouvé');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors de la suppression'
        );
      }

      console.log('✅ Utilisateur supprimé avec succès');

    } catch (error) {
      console.error('❌ Erreur deleteUser:', error);
      throw error;
    }
  }

  async toggleUserStatus(userId: string): Promise<User> {
    try {
      const response = await this.makeAuthenticatedRequest(`/api/users/${userId}/toggle-status`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Utilisateur non trouvé');
        }

        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 'Erreur lors du changement de statut'
        );
      }

      const data = await response.json();
      console.log('✅ Statut utilisateur modifié avec succès');
      return data;

    } catch (error) {
      console.error('❌ Erreur toggleUserStatus:', error);
      throw error;
    }
  }

  // === MÉTHODES UTILITAIRES ===

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.error('Erreur suppression token localStorage:', error);
    }
  }
}

// Hook personnalisé pour utiliser le service
export const useAdminUserService = () => {
  return new AdminUserService();
};

export default AdminUserService;