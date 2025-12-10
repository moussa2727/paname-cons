// AdminRendezVousService.ts
import { useAuth } from '../../context/AuthContext';
import { useRef, useCallback } from 'react';

export interface Rendezvous {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  date: string;
  time: string;
  status: 'En attente' | 'Confirmé' | 'Terminé' | 'Annulé';
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
  avisAdmin?: 'Favorable' | 'Défavorable';
  cancelledAt?: string;
  cancelledBy?: 'admin' | 'user';
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRendezVousData {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  date: string;
  time: string;
  destination: string;
  destinationAutre?: string;
  niveauEtude: string;
  filiere: string;
  filiereAutre?: string;
}

export interface RendezvousListResponse {
  data: Rendezvous[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ✅ CONSTANTES DE CONFIGURATION
const API_URL = import.meta.env.VITE_API_URL;

// ✅ CONFIGURATION DE RATE LIMITING
const RATE_LIMIT_CONFIG = {
  MIN_REQUEST_INTERVAL: 3000, // 3 secondes entre les requêtes
  MAX_CONCURRENT_REQUESTS: 3, // Maximum 3 requêtes simultanées
  REQUEST_TIMEOUT: 30000, // 30 secondes timeout
  RETRY_DELAY: 2000, // 2 secondes avant retry
  MAX_RETRIES: 2, // Maximum 2 retries
  BATCH_SIZE: 50, // Nombre max d'éléments par requête pour les listes
} as const;

// ✅ GESTIONNAIRE DE REQUÊTES AVEC RATE LIMITING
class RequestManager {
  private static instance: RequestManager;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestTimestamps: Map<string, number> = new Map();
  private concurrentRequests = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  // ✅ Générer un ID unique pour chaque requête
  private generateRequestId(endpoint: string, params?: any): string {
    const paramsHash = params ? JSON.stringify(params).slice(0, 100) : '';
    return `${endpoint}:${paramsHash}:${Date.now()}`;
  }

  // ✅ Vérifier si on peut faire une requête (rate limiting)
  private canMakeRequest(requestId: string): boolean {
    const lastRequestTime = this.requestTimestamps.get(requestId);
    if (!lastRequestTime) return true;

    const timeSinceLastRequest = Date.now() - lastRequestTime;
    return timeSinceLastRequest >= RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL;
  }

  // ✅ Gérer la file d'attente
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.concurrentRequests < RATE_LIMIT_CONFIG.MAX_CONCURRENT_REQUESTS) {
      const requestFn = this.requestQueue.shift();
      if (requestFn) {
        this.concurrentRequests++;
        requestFn().finally(() => {
          this.concurrentRequests--;
          if (this.requestQueue.length > 0) {
            this.processQueue();
          }
        });
      }
    }

    this.isProcessingQueue = false;
  }

  // ✅ Exécuter une requête avec rate limiting et retry
  async executeWithRateLimit<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    params?: any,
    retryCount = 0
  ): Promise<T> {
    const requestId = this.generateRequestId(endpoint, params);

    // ✅ Vérifier si une requête identique est déjà en cours
    if (this.pendingRequests.has(requestId)) {
      return this.pendingRequests.get(requestId) as Promise<T>;
    }

    // ✅ Créer une promesse pour cette requête
    const requestPromise = new Promise<T>(async (resolve, reject) => {
      try {
        // ✅ Vérifier le rate limiting
        if (!this.canMakeRequest(requestId)) {
          const delay = RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL;
          if (import.meta.env.DEV) {
            console.log(`⏳ Rate limiting: attente de ${delay}ms avant ${endpoint}`);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // ✅ Limiter les requêtes concurrentes
        if (this.concurrentRequests >= RATE_LIMIT_CONFIG.MAX_CONCURRENT_REQUESTS) {
          this.requestQueue.push(async () => {
            try {
              const result = await requestFn();
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });
          await this.processQueue();
          return;
        }

        // ✅ Enregistrer le timestamp
        this.requestTimestamps.set(requestId, Date.now());

        // ✅ Exécuter la requête avec timeout
        const timeoutPromise = new Promise<never>((_, rejectTimeout) => {
          setTimeout(() => {
            rejectTimeout(new Error(`Timeout après ${RATE_LIMIT_CONFIG.REQUEST_TIMEOUT}ms`));
          }, RATE_LIMIT_CONFIG.REQUEST_TIMEOUT);
        });

        this.concurrentRequests++;
        const result = await Promise.race([requestFn(), timeoutPromise]);
        this.concurrentRequests--;

        resolve(result);
      } catch (error: unknown) {
        // ✅ Gestion des retries
        if (retryCount < RATE_LIMIT_CONFIG.MAX_RETRIES) {
          if (import.meta.env.DEV) {
            console.warn(`🔄 Retry ${retryCount + 1} pour ${endpoint}:`, (error as Error).message);
          }
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.RETRY_DELAY * (retryCount + 1)));
          try {
            const retryResult = await this.executeWithRateLimit(endpoint, requestFn, params, retryCount + 1);
            resolve(retryResult);
          } catch (retryError) {
            reject(retryError);
          }
        } else {
          reject(error);
        }
      } finally {
        // ✅ Nettoyer
        this.pendingRequests.delete(requestId);
        setTimeout(() => {
          this.requestTimestamps.delete(requestId);
        }, RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL);
        
        if (this.requestQueue.length > 0) {
          this.processQueue();
        }
      }
    });

    // ✅ Stocker la promesse
    this.pendingRequests.set(requestId, requestPromise);
    
    return requestPromise;
  }

  // ✅ Annuler toutes les requêtes en cours
  cancelAllRequests(): void {
    this.pendingRequests.clear();
    this.requestQueue = [];
    this.concurrentRequests = 0;
    if (import.meta.env.DEV) {
      console.log('🚫 Toutes les requêtes ont été annulées');
    }
  }
}

// ✅ Constantes pour la cohérence avec le backend
export const RENDEZVOUS_STATUS = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
} as const;

export const ADMIN_OPINION = {
  FAVORABLE: 'Favorable',
  UNFAVORABLE: 'Défavorable',
} as const;

const EDUCATION_LEVELS = [
  'Bac',
  'Bac+1',
  'Bac+2',
  'Licence',
  'Master I',
  'Master II',
  'Doctorat',
] as const;

const TIME_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
] as const;

// ✅ Utilitaire pour créer une requête authentifiée
const createAuthenticatedFetch = (access_token: string | null) => {
  const requestManager = RequestManager.getInstance();

  return async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const requestFn = async (): Promise<T> => {
      if (import.meta.env.DEV) {
        console.log(`📡 Requête API: ${API_URL}${url}`);
      }

      if (!access_token) {
        console.error('❌ Token non disponible');
        throw new Error('Token non disponible. Veuillez vous reconnecter.');
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      };

      const fullUrl = `${API_URL}${url}`;

      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
        signal: AbortSignal.timeout(RATE_LIMIT_CONFIG.REQUEST_TIMEOUT),
      });

      // ✅ Gérer les erreurs HTTP
      if (response.status === 401) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      if (response.status === 403) {
        throw new Error('Accès non autorisé. Administrateur requis.');
      }

      if (response.status === 429) {
        throw new Error('Trop de requêtes. Veuillez patienter.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Erreur ${response.status}: ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Réponse invalide du serveur: ${responseText.substring(0, 100)}...`
        );
      }

      return data;
    };

    // ✅ Utiliser le gestionnaire de requêtes
    return requestManager.executeWithRateLimit(url, requestFn);
  };
};

// ✅ Service admin utilisant UNIQUEMENT les endpoints backend existants
export const createAdminRendezVousService = (access_token: string | null) => {
  const authenticatedFetch = createAuthenticatedFetch(access_token);
  const requestManager = RequestManager.getInstance();

  // ✅ Déclarer les méthodes principales d'abord pour les utiliser dans les autres méthodes
  const serviceMethods = {
    // ==================== ENDPOINTS ADMIN EXCLUSIFS ====================

    /**
     * 1. LISTER TOUS LES RENDEZ-VOUS (Admin seulement) avec pagination intelligente
     * GET /api/rendezvous?page=1&limit=10&status=Confirmé&date=2024-12-25&search=Dupont
     */
    fetchAllRendezvous: async (
      page: number = 1,
      limit: number = 10,
      filters?: {
        status?: string;
        date?: string;
        search?: string;
      }
    ): Promise<RendezvousListResponse> => {
      if (import.meta.env.DEV) {
        console.log('🔍 fetchAllRendezvous appelé:', { page, limit, filters });
      }

      // ✅ Limiter la taille de la requête
      const safeLimit = Math.min(limit, RATE_LIMIT_CONFIG.BATCH_SIZE);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', safeLimit.toString());

      if (filters?.status && filters.status !== 'tous') {
        params.append('status', filters.status);
      }

      if (filters?.date) {
        const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
        if (!dateRegex.test(filters.date)) {
          throw new Error('Format de date invalide (YYYY-MM-DD requis)');
        }
        params.append('date', filters.date);
      }

      if (filters?.search) {
        params.append('search', filters.search.trim().substring(0, 100)); // Limiter la recherche
      }

      const url = `/api/rendezvous?${params.toString()}`;
      
      if (import.meta.env.DEV) {
        console.log('🌐 URL de la requête:', url);
      }

      return authenticatedFetch<RendezvousListResponse>(url);
    },

    /**
     * 2. LISTER TOUS LES RENDEZ-VOUS AVEC FRAGMENTATION (pour les grosses listes)
     */
    fetchAllRendezvousBatched: async (
      totalItems: number,
      batchSize: number = RATE_LIMIT_CONFIG.BATCH_SIZE,
      filters?: {
        status?: string;
        date?: string;
        search?: string;
      }
    ): Promise<Rendezvous[]> => {
      const batches = Math.ceil(totalItems / batchSize);
      const allResults: Rendezvous[] = [];

      if (import.meta.env.DEV) {
        console.log(`📦 Chargement par batch: ${batches} batchs de ${batchSize} éléments`);
      }

      // ✅ Charger par batch avec délai entre chaque batch
      for (let batch = 0; batch < batches; batch++) {
        const page = batch + 1;
        if (import.meta.env.DEV) {
          console.log(`📦 Chargement batch ${page}/${batches}`);
        }

        try {
          // ✅ CORRECTION: Utiliser serviceMethods au lieu de this
          const response = await serviceMethods.fetchAllRendezvous(page, batchSize, filters);
          allResults.push(...response.data);

          // ✅ Attendre entre les batchs (sauf le dernier)
          if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL));
          }
        } catch (error: unknown) {
          console.error(`❌ Erreur lors du chargement du batch ${page}:`, (error as Error).message);
          // Continuer avec les batchs suivants
        }
      }

      return allResults;
    },

    /**
     * 3. METTRE À JOUR LE STATUT (Admin seulement)
     * PUT /api/rendezvous/:id/status
     */
    updateRendezvousStatus: async (
      id: string,
      status: string,
      avisAdmin?: string
    ): Promise<Rendezvous> => {
      if (!id || id.trim() === '') {
        throw new Error('ID de rendez-vous requis');
      }

      if (!status || status.trim() === '') {
        throw new Error('Le statut est requis');
      }

      if (!Object.values(RENDEZVOUS_STATUS).includes(status as any)) {
        throw new Error(
          `Statut invalide. Valeurs autorisées: ${Object.values(RENDEZVOUS_STATUS).join(', ')}`
        );
      }

      const url = `/api/rendezvous/${id}/status`;

      const bodyData: any = { status };

      if (status === RENDEZVOUS_STATUS.COMPLETED) {
        if (!avisAdmin || avisAdmin.trim() === '') {
          throw new Error(
            "L'avis admin est obligatoire pour terminer un rendez-vous"
          );
        }
        if (!Object.values(ADMIN_OPINION).includes(avisAdmin as any)) {
          throw new Error(
            'Avis admin invalide. Valeurs autorisées: Favorable ou Défavorable'
          );
        }
        bodyData.avisAdmin = avisAdmin;
      }

      if (import.meta.env.DEV) {
        console.log('🔄 Mise à jour statut:', { id, status, avisAdmin });
      }

      return authenticatedFetch<Rendezvous>(url, {
        method: 'PUT',
        body: JSON.stringify(bodyData),
      });
    },

    /**
     * 4. METTRE À JOUR PLUSIEURS STATUTS EN BATCH
     */
    updateMultipleRendezvousStatus: async (
      ids: string[],
      status: string,
      avisAdmin?: string
    ): Promise<Rendezvous[]> => {
      const results: Rendezvous[] = [];

      // ✅ Limiter le nombre de mises à jour simultanées
      const batchSize = 5;
      const batches = Math.ceil(ids.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batchIds = ids.slice(i * batchSize, (i + 1) * batchSize);
        const batchPromises = batchIds.map(id => 
          // ✅ CORRECTION: Utiliser serviceMethods au lieu de this
          serviceMethods.updateRendezvousStatus(id, status, avisAdmin)
            .catch((error: Error) => {
              console.error(`❌ Erreur mise à jour ${id}:`, error.message);
              return null;
            })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean) as Rendezvous[]);

        // ✅ Attendre entre les batchs
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL));
        }
      }

      return results;
    },

    /**
     * 5. ANNULER SANS RESTRICTION (Admin seulement)
     * DELETE /api/rendezvous/:id
     */
    cancelRendezvousAdmin: async (id: string): Promise<Rendezvous> => {
      if (!id || id.trim() === '') {
        throw new Error('ID de rendez-vous requis');
      }

      if (import.meta.env.DEV) {
        console.log('🗑️ Annulation admin pour:', id);
      }

      return authenticatedFetch<Rendezvous>(`/api/rendezvous/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * 6. ANNULER PLUSIEURS RENDEZ-VOUS EN BATCH
     */
    cancelMultipleRendezvousAdmin: async (ids: string[]): Promise<Rendezvous[]> => {
      const results: Rendezvous[] = [];

      const batchSize = 3;
      const batches = Math.ceil(ids.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const batchIds = ids.slice(i * batchSize, (i + 1) * batchSize);
        const batchPromises = batchIds.map(id =>
          // ✅ CORRECTION: Utiliser serviceMethods au lieu de this
          serviceMethods.cancelRendezvousAdmin(id)
            .catch((error: Error) => {
              console.error(`❌ Erreur annulation ${id}:`, error.message);
              return null;
            })
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean) as Rendezvous[]);

        // ✅ Attendre entre les batchs
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL * 2));
        }
      }

      return results;
    },

    // ==================== ENDPOINTS PARTAGÉS (EXISTANTS) ====================

    /**
     * CRÉER UN RENDEZ-VOUS (identique backend)
     * POST /api/rendezvous
     */
    createRendezvous: async (
      createData: CreateRendezVousData
    ): Promise<Rendezvous> => {
      // Validation stricte comme backend
      const errors: string[] = [];

      if (!createData.firstName?.trim()) errors.push('Le prénom est obligatoire');
      if (!createData.lastName?.trim()) errors.push('Le nom est obligatoire');
      if (!createData.email?.trim()) errors.push("L'email est obligatoire");
      if (!createData.telephone?.trim()) errors.push('Le téléphone est obligatoire');
      if (!createData.date?.trim()) errors.push('La date est obligatoire');
      if (!createData.time?.trim()) errors.push("L'heure est obligatoire");
      if (!createData.destination?.trim()) errors.push('La destination est obligatoire');
      if (!createData.niveauEtude?.trim()) errors.push("Le niveau d'étude est obligatoire");
      if (!createData.filiere?.trim()) errors.push('La filière est obligatoire');

      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(createData.email)) {
        throw new Error('Format email invalide');
      }

      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(createData.telephone.replace(/\s/g, ''))) {
        throw new Error('Format téléphone invalide');
      }

      const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
      if (!dateRegex.test(createData.date)) {
        throw new Error('Format de date invalide (YYYY-MM-DD requis)');
      }

      const timeRegex = /^(09|1[0-6]):(00|30)$/;
      if (!timeRegex.test(createData.time)) {
        throw new Error('Créneau horaire invalide (09:00-16:30, par pas de 30min)');
      }

      // Préparation des données - STRICTEMENT comme le backend
      const processedData: any = {
        firstName: createData.firstName.trim(),
        lastName: createData.lastName.trim(),
        email: createData.email.toLowerCase().trim(),
        telephone: createData.telephone.trim(),
        date: createData.date,
        time: createData.time,
        niveauEtude: createData.niveauEtude,
      };

      // Gestion des champs "Autre" - STRICTEMENT comme le backend
      if (createData.destination === 'Autre') {
        if (!createData.destinationAutre || createData.destinationAutre.trim() === '') {
          throw new Error('La destination "Autre" nécessite une précision');
        }
        processedData.destination = 'Autre';
        processedData.destinationAutre = createData.destinationAutre.trim();
      } else {
        processedData.destination = createData.destination;
      }

      if (createData.filiere === 'Autre') {
        if (!createData.filiereAutre || createData.filiereAutre.trim() === '') {
          throw new Error('La filière "Autre" nécessite une précision');
        }
        processedData.filiere = 'Autre';
        processedData.filiereAutre = createData.filiereAutre.trim();
      } else {
        processedData.filiere = createData.filiere;
      }

      if (import.meta.env.DEV) {
        console.log('📤 Création rendez-vous:', processedData);
      }

      return authenticatedFetch<Rendezvous>('/api/rendezvous', {
        method: 'POST',
        body: JSON.stringify(processedData),
      });
    },

    /**
     * RÉCUPÉRER UN RENDEZ-VOUS SPÉCIFIQUE
     * GET /api/rendezvous/:id
     */
    fetchRendezvousById: async (id: string): Promise<Rendezvous> => {
      if (!id || id.trim() === '') {
        throw new Error('ID de rendez-vous requis');
      }

      return authenticatedFetch<Rendezvous>(`/api/rendezvous/${id}`);
    },

    /**
     * METTRE À JOUR UN RENDEZ-VOUS
     * PUT /api/rendezvous/:id
     */
    updateRendezvous: async (
      id: string,
      updateData: Partial<CreateRendezVousData>
    ): Promise<Rendezvous> => {
      if (!id || id.trim() === '') {
        throw new Error('ID de rendez-vous requis');
      }

      return authenticatedFetch<Rendezvous>(`/api/rendezvous/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
    },

    /**
     * CONFIRMER UN RENDEZ-VOUS (Endpoint pour utilisateur)
     * PUT /api/rendezvous/:id/confirm
     */
    confirmRendezvous: async (id: string): Promise<Rendezvous> => {
      if (!id || id.trim() === '') {
        throw new Error('ID de rendez-vous requis');
      }

      return authenticatedFetch<Rendezvous>(`/api/rendezvous/${id}/confirm`, {
        method: 'PUT',
      });
    },

    /**
     * RENDEZ-VOUS PAR UTILISATEUR
     * GET /api/rendezvous/user?email=test@example.com&page=1&limit=10&status=En attente
     */
    fetchRendezvousByUser: async (
      email: string,
      page: number = 1,
      limit: number = 10,
      status?: string
    ): Promise<RendezvousListResponse> => {
      if (!email || email.trim() === '') {
        throw new Error('Email requis');
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Format email invalide');
      }

      const safeLimit = Math.min(limit, RATE_LIMIT_CONFIG.BATCH_SIZE);

      const params = new URLSearchParams();
      params.append('email', encodeURIComponent(email));
      params.append('page', page.toString());
      params.append('limit', safeLimit.toString());

      if (status && status !== 'tous') {
        params.append('status', status);
      }

      const url = `/api/rendezvous/user?${params.toString()}`;
      
      return authenticatedFetch<RendezvousListResponse>(url);
    },

    // ==================== FONCTIONNALITÉS DISPONIBILITÉ ====================

    /**
     * CRÉNEAUX DISPONIBLES POUR UNE DATE
     * GET /api/rendezvous/available-slots?date=2024-12-25
     */
    fetchAvailableSlots: async (date: string): Promise<string[]> => {
      if (!date || date.trim() === '') {
        throw new Error('La date est requise');
      }

      const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
      if (!dateRegex.test(date)) {
        throw new Error('Format de date invalide (YYYY-MM-DD requis)');
      }

      return authenticatedFetch<string[]>(
        `/api/rendezvous/available-slots?date=${encodeURIComponent(date)}`
      );
    },

    /**
     * DATES DISPONIBLES
     * GET /api/rendezvous/available-dates
     */
    fetchAvailableDates: async (): Promise<string[]> => {
      return authenticatedFetch<string[]>('/api/rendezvous/available-dates');
    },

    // ==================== UTILITAIRES DE GESTION ====================

    /**
     * ANNULER TOUTES LES REQUÊTES EN COURS
     */
    cancelAllRequests: (): void => {
      requestManager.cancelAllRequests();
    },

    /**
     * RÉINITIALISER LE SERVICE
     */
    reset: (): void => {
      requestManager.cancelAllRequests();
    },

    // ==================== CONSTANTES ET UTILITAIRES ====================

    /**
     * NIVEAUX D'ÉTUDE (constants)
     */
    getEducationLevels: (): string[] => {
      return [...EDUCATION_LEVELS];
    },

    /**
     * CRÉNEAUX HORAIRES (constants)
     */
    getTimeSlots: (): string[] => {
      return [...TIME_SLOTS];
    },

    /**
     * STATUTS DISPONIBLES (constants)
     */
    getStatusOptions: (): string[] => {
      return Object.values(RENDEZVOUS_STATUS);
    },

    /**
     * AVIS ADMIN (constants)
     */
    getAdminOpinionOptions: (): string[] => {
      return Object.values(ADMIN_OPINION);
    },

    /**
     * MASQUER L'EMAIL (pour l'affichage)
     */
    maskEmail: (email: string): string => {
      if (!email) return '';

      const [localPart, domain] = email.split('@');

      if (!localPart || !domain) {
        return 'email_non_disponible';
      }

      const maskedLocal =
        localPart.length <= 2
          ? localPart.charAt(0) + '*'
          : localPart.charAt(0) +
            '***' +
            localPart.charAt(localPart.length - 1);

      return `${maskedLocal}@${domain}`;
    },

    /**
     * VALIDER LES DONNÉES DE CRÉATION (comme backend)
     */
    validateCreateData: (data: CreateRendezVousData): string[] => {
      const errors: string[] = [];

      if (!data.firstName?.trim()) errors.push('Le prénom est obligatoire');
      if (!data.lastName?.trim()) errors.push('Le nom est obligatoire');
      if (!data.email?.trim()) errors.push("L'email est obligatoire");
      if (!data.telephone?.trim()) errors.push('Le téléphone est obligatoire');
      if (!data.date?.trim()) errors.push('La date est obligatoire');
      if (!data.time?.trim()) errors.push("L'heure est obligatoire");
      if (!data.destination?.trim()) errors.push('La destination est obligatoire');
      if (!data.niveauEtude?.trim()) errors.push("Le niveau d'étude est obligatoire");
      if (!data.filiere?.trim()) errors.push('La filière est obligatoire');

      if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
        errors.push('Format email invalide');
      }

      if (data.destination === 'Autre' && !data.destinationAutre?.trim()) {
        errors.push('La destination "Autre" nécessite une précision');
      }

      if (data.filiere === 'Autre' && !data.filiereAutre?.trim()) {
        errors.push('La filière "Autre" nécessite une précision');
      }

      return errors;
    },
  };

  return serviceMethods;
};

// ✅ Hook custom avec debouncing intégré
export const useAdminRendezVousService = () => {
  const { access_token } = useAuth();
  const serviceRef = useRef(createAdminRendezVousService(access_token));
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  // ✅ Mettre à jour le service quand le token change
  serviceRef.current = createAdminRendezVousService(access_token);

  // ✅ Debouncer pour éviter les requêtes multiples
  const debouncedFetch = useCallback(
    <T>(
      fetchFn: () => Promise<T>,
      key: string,
      delay: number = RATE_LIMIT_CONFIG.MIN_REQUEST_INTERVAL
    ): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        if (pendingRequestsRef.current.has(key)) {
          reject(new Error(`Requête en cours pour: ${key}`));
          return;
        }

        pendingRequestsRef.current.add(key);

        setTimeout(async () => {
          try {
            const result = await fetchFn();
            resolve(result);
          } catch (error: unknown) {
            reject(error as Error);
          } finally {
            pendingRequestsRef.current.delete(key);
          }
        }, delay);
      });
    },
    []
  );

  // ✅ Retourner le service avec debouncing
  return {
    ...serviceRef.current,
    
    // ✅ Version debounced des méthodes principales
    fetchAllRendezvousDebounced: async (
      page: number = 1,
      limit: number = 10,
      filters?: any
    ) => {
      const key = `fetchAllRendezvous:${page}:${limit}:${JSON.stringify(filters)}`;
      return debouncedFetch(
        () => serviceRef.current.fetchAllRendezvous(page, limit, filters),
        key
      );
    },

    updateRendezvousStatusDebounced: async (
      id: string,
      status: string,
      avisAdmin?: string
    ) => {
      const key = `updateStatus:${id}:${status}`;
      return debouncedFetch(
        () => serviceRef.current.updateRendezvousStatus(id, status, avisAdmin),
        key,
        1000 // Délai plus court pour les mises à jour
      );
    },

    cancelAllRequests: () => {
      serviceRef.current.cancelAllRequests();
      pendingRequestsRef.current.clear();
    },

    // ✅ Propriété pour vérifier l'état
    get isProcessing() {
      return pendingRequestsRef.current.size > 0;
    },
  };
};