// services/procedures.service.ts
// STRICTEMENT CALQUÉ sur procedures.controller.ts (backend)

import { toast } from "react-hot-toast";
import type {
  ProcedureResponseDto,
  PaginatedProcedureResponseDto,
  ProcedureStatisticsDto,
  CreateProcedureDto,
  UpdateProcedureDto,
  UpdateStepDto,
  ProcedureQueryDto,
  StepName,
  ApiError,
  ExportFormat,
} from "../types/procedures.types";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const JSON_HEADERS = { "Content-Type": "application/json" };

// ─── Types d'erreur ──────────────────────────────────────────────────────────

class ProcedureServiceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public apiError?: ApiError,
  ) {
    super(message);
    this.name = "ProcedureServiceError";
  }
}

// ─── Gestion des réponses ─────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  let responseBody: unknown;
  try {
    responseBody = await res.json();
  } catch {
    responseBody = { message: `Erreur ${res.status}` };
  }

  if (!res.ok) {
    const apiError = responseBody as ApiError;
    throw new ProcedureServiceError(
      apiError.message || `Erreur ${res.status}`,
      res.status,
      apiError,
    );
  }

  // Le backend retourne directement la structure attendue
  // Si la réponse a une propriété 'data', on l'utilise, sinon on utilise le corps directement
  const responseBodyObj = responseBody as Record<string, unknown>;
  const result = responseBodyObj.data !== undefined ? responseBodyObj.data as T : responseBody as T;
  return result;
}

// ─── Fetch authentifié ────────────────────────────────────────────────────────
import { apiFetch } from "../context/AuthContext";

// ─── URLs constants (miroir des routes controller) ────────────────────────────

const API = {
  // Routes admin
  ADMIN_CREATE: "/admin/procedures/create",
  ADMIN_ALL: "/admin/procedures/all",
  ADMIN_STATISTICS: "/admin/procedures/statistics",
  ADMIN_STEP: (id: string, stepName: StepName) => `/admin/procedures/${id}/steps/${stepName}`,
  ADMIN_DELETE: (id: string) => `/admin/procedures/${id}/delete`,
  ADMIN_COMPLETE: (id: string) => `/admin/procedures/${id}/complete`,
  ADMIN_EXPORT: "/admin/procedures/export",
  
  // Routes utilisateur
  PROCEDURE_CREATE: "/procedures/create",
  PROCEDURE_ALL: "/procedures",
  PROCEDURE_BY_EMAIL: (email: string) => `/procedures/by-email/${email}`,
  PROCEDURE_BY_RENDEZVOUS: (rendezVousId: string) =>
    `/procedures/by-rendezvous/${rendezVousId}`,
  PROCEDURE_DETAILS: (id: string) => `/procedures/${id}/details`,
  PROCEDURE_UPDATE: (id: string) => `/procedures/${id}/update`,
  PROCEDURE_CANCEL: (id: string) => `/procedures/${id}/cancel`,
};

// ─── Helpers de validation (exportés séparément) ─────────────────────────────

export const ProcedureValidation = {
  /**
   * Valide les données côté client
   */
  validate(data: Partial<CreateProcedureDto>): Record<string, string> {
    const errors: Record<string, string> = {};
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const NAME_RE = /^[a-zA-ZÀ-ÿ\s\-']+$/;
    const PHONE_RE = /^\+?[1-9][\d\s.-]{8,14}$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if ("rendezVousId" in data) {
      if (!data.rendezVousId)
        errors.rendezVousId = "L'ID du rendez-vous est requis";
      else if (!UUID_RE.test(data.rendezVousId))
        errors.rendezVousId = "UUID invalide";
    }
    if ("prenom" in data) {
      if (!data.prenom || data.prenom.trim().length < 2)
        errors.prenom = "Min 2 caractères";
      else if (data.prenom.length > 50) errors.prenom = "Max 50 caractères";
      else if (!NAME_RE.test(data.prenom))
        errors.prenom = "Caractères invalides";
    }
    if ("nom" in data) {
      if (!data.nom || data.nom.trim().length < 2)
        errors.nom = "Min 2 caractères";
      else if (data.nom.length > 50) errors.nom = "Max 50 caractères";
      else if (!NAME_RE.test(data.nom)) errors.nom = "Caractères invalides";
    }
    if ("email" in data) {
      if (!data.email) errors.email = "L'email est requis";
      else if (!EMAIL_RE.test(data.email))
        errors.email = "Format d'email invalide";
    }
    if ("telephone" in data) {
      if (!data.telephone) errors.telephone = "Le téléphone est requis";
      else if (!PHONE_RE.test(data.telephone))
        errors.telephone = "Format international requis";
    }
    if (
      "destination" in data &&
      (!data.destination || data.destination.trim().length < 2)
    )
      errors.destination = "Destination requise (min 2 caractères)";
    if ("filiere" in data && (!data.filiere || data.filiere.trim().length < 2))
      errors.filiere = "Filière requise (min 2 caractères)";
    if ("niveauEtude" in data && !data.niveauEtude?.trim())
      errors.niveauEtude = "Niveau d'étude requis";

    return errors;
  },

  /**
   * Vérifie si les données sont valides
   */
  isValid(data: Partial<CreateProcedureDto>): boolean {
    return Object.keys(this.validate(data)).length === 0;
  },
};

// ─── Service principal ────────────────────────────────────────────────────────

export const ProceduresService = {
  // ─────────────────────────────────────────────────────────────────────────
  // Routes ADMIN (procédures.controller.ts)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * POST /admin/procedures/create
   * @see ProceduresController.createFromRendezvous()
   */
  async create(data: CreateProcedureDto): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.ADMIN_CREATE}`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      });
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success("Procédure créée avec succès");
      return result;
    } catch (error) {
      toast.error("Erreur lors de la création de la procédure");
      throw error;
    }
  },

  /**
   * GET /admin/procedures/all
   * @see ProceduresController.findAll()
   */
  async findAll(
    query: ProcedureQueryDto = {},
  ): Promise<PaginatedProcedureResponseDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const url = `${BASE_URL}${API.ADMIN_ALL}${params.toString() ? `?${params}` : ""}`;

    try {
      const res = await apiFetch(url, { method: "GET" });
      return await handleResponse<PaginatedProcedureResponseDto>(res);
    } catch (error) {
      console.error("[ProceduresService] findAll error:", error);
      throw error;
    }
  },

  /**
   * GET /admin/procedures/statistics
   * @see ProceduresController.getStatistics()
   */
  async getStatistics(): Promise<ProcedureStatisticsDto> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.ADMIN_STATISTICS}`, {
        method: "GET",
      });
      return await handleResponse<ProcedureStatisticsDto>(res);
    } catch (error) {
      toast.error("Erreur lors du chargement des statistiques");
      throw error;
    }
  },

  /**
   * PATCH /admin/procedures/:id/complete
   * @see ProceduresController.completeProcedure()
   */
  async completeProcedure(id: string): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.ADMIN_COMPLETE(id)}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({}),
      });
      return await handleResponse<ProcedureResponseDto>(res);
    } catch (error) {
      toast.error("Erreur lors de la complétion de la procédure");
      throw error;
    }
  },

  /**
   * PATCH /admin/procedures/:id/steps/:stepName
   * @see ProceduresController.updateStep()
   */
  async updateStep(
    id: string,
    stepName: StepName,
    data: UpdateStepDto,
  ): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.ADMIN_STEP(id, stepName)}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify(data),
      });
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success(`Étape ${stepName} mise à jour avec succès`);
      return result;
    } catch (error) {
      toast.error(`Erreur lors de la mise à jour de l'étape ${stepName}`);
      throw error;
    }
  },

   /**
   * GET /admin/procedures/export
   * @see ProceduresController.exportProcedures()
   */
  async exportProcedures(
    format: ExportFormat,
    query: ProcedureQueryDto = {},
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      params.set('format', format);
      
      // Ajouter tous les paramètres de query
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      }
      
      const url = `${BASE_URL}${API.ADMIN_EXPORT}?${params}`;
      
      const res = await apiFetch(url, { 
        method: "GET",
        // Pas de headers JSON car on attend un blob
      });

      if (!res.ok) {
        throw new Error(`Erreur ${res.status} lors de l'export`);
      }

      return await res.blob();
    } catch (error) {
      toast.error("Erreur lors de l'export des données");
      throw error;
    }
  },

  /**
   * POST /admin/procedures/:id/steps/:stepName
   * @see ProceduresController.addStep()
   */
  async addStep(id: string, stepName: StepName): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.ADMIN_STEP(id, stepName)}`, {
        method: "POST",
      });
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success(`Étape ${stepName} ajoutée avec succès`);
      return result;
    } catch (error) {
      toast.error(`Erreur lors de l'ajout de l'étape ${stepName}`);
      throw error;
    }
  },

  /**
   * DELETE /admin/procedures/:id/delete
   * @see ProceduresController.remove()
   * Retourne 204 No Content
   */
  async remove(id: string, reason = "Suppression manuelle"): Promise<void> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.ADMIN_DELETE(id)}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: JSON.stringify({ reason }),
      });
      await handleResponse<void>(res);
      toast.success("Procédure supprimée avec succès");
    } catch (error) {
      toast.error("Erreur lors de la suppression de la procédure");
      throw error;
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Routes mixtes (admin + utilisateur connecté)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /procedures/by-email/:email
   * @see ProceduresController.findByUserEmail()
   */
  async findByEmail(email: string): Promise<ProcedureResponseDto[]> {
    const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_BY_EMAIL(email)}`, {
      method: "GET",
    });

    // 204 = pas de contenu mais pas d'erreur
    if (res.status === 204) return [];

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return [];
    }

    if (!res.ok) {
      const err = new ProcedureServiceError(
        (body as { message?: string })?.message ?? `Erreur ${res.status}`,
        res.status,
        body as ApiError,
      );
      throw err;
    }

    // Le backend retourne un tableau directement
    if (Array.isArray(body)) return body as ProcedureResponseDto[];
    return [];
  },

  /**
   * GET /procedures/by-rendezvous/:rendezVousId
   * @see ProceduresController.findByRendezvousId()
   */
  async findByRendezvousId(
    rendezVousId: string,
  ): Promise<ProcedureResponseDto | null> {
    const res = await apiFetch(
      `${BASE_URL}${API.PROCEDURE_BY_RENDEZVOUS(rendezVousId)}`,
      { method: "GET" },
    );
    if (res.status === 404) return null;
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * GET /procedures/:id/details
   * @see ProceduresController.findOne()
   */
  async findById(id: string): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_DETAILS(id)}`, {
      method: "GET",
    });
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * PATCH /procedures/:id/update
   * @see ProceduresController.update()
   */
  async update(
    id: string,
    data: UpdateProcedureDto,
  ): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_UPDATE(id)}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    });
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * PATCH /procedures/:id/cancel
   * @see ProceduresController.cancel()
   */
  async cancel(
    id: string,
    reason = "Annulation par l'utilisateur",
  ): Promise<ProcedureResponseDto> {
    try {
      const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_CANCEL(id)}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ reason }),
      });
      const result = await handleResponse<ProcedureResponseDto>(res);
      toast.success("Procédure annulée avec succès");
      return result;
    } catch (error) {
      toast.error("Erreur lors de l'annulation de la procédure");
      throw error;
    }
  },
};