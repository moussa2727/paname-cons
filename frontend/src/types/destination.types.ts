// Basé sur l'entité Destination du backend
export interface Destination {
  id: string;
  country: string; // Correspond à country String @unique
  text: string; // Correspond à text String
  imagePath: string; // Correspond à imagePath String
  createdAt: Date; // Date de création
  updatedAt: Date; // Date de mise à jour
  imageUrl?: string; // Ajouté par le controller (URL Cloudinary)
}

// Basé sur CreateDestinationDto du backend
export interface CreateDestinationData {
  country: string; // 2-100 chars, requis
  text: string; // 10-2000 chars, requis
  imagePath?: string; // optionnel
  image?: File; // Fichier image pour l'upload
}

// Basé sur UpdateDestinationDto du backend (PartialType)
export interface UpdateDestinationData {
  country?: string; // optionnel
  text?: string; // optionnel
  imagePath?: string; // optionnel
  image?: File; // Fichier image pour l'upload
}

// Réponse paginée (si nécessaire pour les destinations)
export interface PaginatedDestinationsResponse {
  data: Destination[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Types pour les formulaires
export interface DestinationFormData {
  country: string;
  text: string;
  image?: File;
  imagePath?: string;
}

// Types pour la recherche - correspond à la query param 'q'
export interface DestinationSearchParams {
  q: string; // Terme de recherche (backend: query param)
  limit?: number; // Optionnel pour limiter les résultats
}

// Types pour le nettoyage des images - correspond à la réponse du backend
export interface ImageCleanupResponse {
  message: string; // Message du backend
  deletedFiles: string[]; // Fichiers supprimés
}

// Réponse API standard
export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

// Types pour les filtres avancés
export interface DestinationFilters {
  country?: string;
  searchTerm?: string;
  hasImage?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Types pour les statistiques destinations (si nécessaire)
export interface DestinationStatistics {
  total: number;
  topCountries: { country: string; count: number }[];
  withImages: number;
  withoutImages: number;
  recentlyAdded: Destination[];
}
