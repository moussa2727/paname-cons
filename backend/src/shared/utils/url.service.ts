import { Injectable } from '@nestjs/common';

@Injectable()
export class UrlService {
  private readonly baseUrl: string;
  private readonly isVercel: boolean;
  private readonly isProduction: boolean;

  constructor() {
    this.isVercel = process.env.VERCEL === '1';
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // URL de base selon l'environnement
    if (this.isVercel) {
      this.baseUrl = 'https://paname-consulting.vercel.app';
    } else {
      this.baseUrl = process.env.BASE_URL || 'http://localhost:10000';
    }
  }

  /**
   * URL complète pour les images uploadées
   */
  getImageUrl(filename: string): string {
    if (!filename) {
      return this.getDefaultImageUrl();
    }

    // URLs déjà complètes
    if (filename.startsWith('http')) {
      return filename;
    }

    // Images par défaut du frontend
    if (filename.startsWith('/images/')) {
      return `${this.baseUrl}${filename}`;
    }

    // Images uploadées - utiliser l'endpoint API
    const cleanFilename = filename.replace(/^uploads\//, '');
    return `${this.baseUrl}/api/destinations/uploads/${cleanFilename}`;
  }

  /**
   * URL de l'image par défaut
   */
  getDefaultImageUrl(): string {
    return `${this.baseUrl}/images/paname-consulting.jpg`;
  }

  /**
   * URL de base de l'API
   */
  getApiBaseUrl(): string {
    return `${this.baseUrl}/api`;
  }

  /**
   * URL complète pour un endpoint API
   */
  getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.getApiBaseUrl()}/${cleanEndpoint}`;
  }

  /**
   * URL du frontend
   */
  getFrontendUrl(path?: string): string {
    if (this.isVercel) {
      return path ? `https://panameconsulting.vercel.app${path}` : 'https://panameconsulting.vercel.app';
    } else {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return path ? `${frontendUrl}${path}` : frontendUrl;
    }
  }

  /**
   * URL pour les assets statiques du frontend
   */
  getAssetUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}/${cleanPath}`;
  }

  /**
   * Vérifier si une URL est valide
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Nettoyer et normaliser un chemin de fichier
   */
  normalizeFilePath(path: string): string {
    if (!path) return '';
    
    // Supprimer les préfixes uploads/ s'ils existent
    let cleanPath = path.replace(/^uploads\//, '');
    
    // Supprimer les doubles slashes
    cleanPath = cleanPath.replace(/\/\//g, '/');
    
    // Supprimer le slash initial
    if (cleanPath.startsWith('/')) {
      cleanPath = cleanPath.slice(1);
    }
    
    return cleanPath;
  }
}
