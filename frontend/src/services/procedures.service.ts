// services/procedures.service.ts
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
  ExportFormat,
} from "../types/procedures.types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const JSON_HEADERS = { "Content-Type": "application/json" };

import { apiFetch } from "../context/AuthContext";

// ─── URLs API (basées sur le controller) ─────────────────────────────────────
const API = {
  // Routes Admin
  ADMIN_CREATE: "/admin/procedures/create",
  ADMIN_ALL: "/admin/procedures/all",
  ADMIN_STATISTICS: "/admin/procedures/statistics",
  ADMIN_STEP: (id: string, stepName: StepName) =>
    `/admin/procedures/${id}/steps/${stepName}`,
  ADMIN_ADD_STEP: (id: string, stepName: StepName) =>
    `/admin/procedures/${id}/steps/${stepName}`,
  ADMIN_DELETE: (id: string) => `/admin/procedures/${id}/delete`,
  ADMIN_EXPORT: "/admin/procedures/export",

  // Routes User + Mixed
  PROCEDURE_BY_EMAIL: (email: string) => `/procedures/by-email/${email}`,
  PROCEDURE_BY_RENDEZVOUS: (rendezVousId: string) =>
    `/procedures/by-rendezvous/${rendezVousId}`,
  PROCEDURE_DETAILS: (id: string) => `/procedures/${id}/details`,
  PROCEDURE_UPDATE: (id: string) => `/procedures/${id}/update`,
  PROCEDURE_CANCEL: (id: string) => `/procedures/${id}/cancel`,
};

// ─── Gestion des réponses ────────────────────────────────────────────────────
async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as unknown as T;

  let responseBody: unknown;
  try {
    responseBody = await res.json();
  } catch {
    responseBody = { message: `Erreur ${res.status}` };
  }

  if (!res.ok) {
    const error = responseBody as { message?: string };
    throw new Error(error.message || `Erreur ${res.status}`);
  }

  return responseBody as T;
}

// ─── Service ─────────────────────────────────────────────────────────────────
export const ProceduresService = {
  // ==================== ROUTES ADMIN ====================

  /**
   * POST /admin/procedures/create
   * Créer une procédure depuis un rendez-vous éligible
   */
  async create(data: CreateProcedureDto): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}${API.ADMIN_CREATE}`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProcedureResponseDto>(res);
    toast.success("Procédure créée avec succès");
    return result;
  },

  /**
   * GET /admin/procedures/all
   * Liste toutes les procédures (admin)
   */
  async findAll(
    query: ProcedureQueryDto = {},
  ): Promise<PaginatedProcedureResponseDto> {
    const params = new URLSearchParams();
    Object.entries({
      page: 1,
      limit: 10,
      sortBy: "createdAt",
      sortOrder: "desc",
      ...query,
    }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const res = await apiFetch(`${BASE_URL}${API.ADMIN_ALL}?${params}`);
    return handleResponse<PaginatedProcedureResponseDto>(res);
  },

  /**
   * GET /admin/procedures/statistics
   * Statistiques des procédures (Admin seulement)
   */
  async getStatistics(): Promise<ProcedureStatisticsDto> {
    const res = await apiFetch(`${BASE_URL}${API.ADMIN_STATISTICS}`);
    return handleResponse<ProcedureStatisticsDto>(res);
  },

  /**
   * PATCH /admin/procedures/:id/steps/:stepName
   * Mettre à jour une étape (Admin seulement)
   */
  async updateStep(
    id: string,
    stepName: StepName,
    data: UpdateStepDto,
  ): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}${API.ADMIN_STEP(id, stepName)}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProcedureResponseDto>(res);
    toast.success(`Étape ${stepName} mise à jour`);
    return result;
  },

  /**
   * POST /admin/procedures/:id/steps/:stepName
   * Ajouter une étape (Admin seulement)
   */
  async addStep(id: string, stepName: StepName): Promise<ProcedureResponseDto> {
    const res = await apiFetch(
      `${BASE_URL}${API.ADMIN_ADD_STEP(id, stepName)}`,
      {
        method: "POST",
      },
    );
    const result = await handleResponse<ProcedureResponseDto>(res);
    toast.success(`Étape ${stepName} ajoutée`);
    return result;
  },

  /**
   * DELETE /admin/procedures/:id/delete
   * Supprimer une procédure (soft delete)
   */
  async remove(id: string, reason = "Suppression manuelle"): Promise<void> {
    const res = await apiFetch(`${BASE_URL}${API.ADMIN_DELETE(id)}`, {
      method: "DELETE",
      headers: JSON_HEADERS,
      body: JSON.stringify({ reason }),
    });
    await handleResponse<void>(res);
    toast.success("Procédure supprimée");
  },

  /**
   * GET /admin/procedures/export
   * Exporter les procédures (CSV, Excel, PDF)
   */
  async exportProcedures(
    format: ExportFormat,
    query: ProcedureQueryDto = {},
  ): Promise<Blob> {
    const params = new URLSearchParams({ format });
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    const res = await apiFetch(`${BASE_URL}${API.ADMIN_EXPORT}?${params}`);
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    return res.blob();
  },

  // ==================== ROUTES USER + MIXED ====================

  /**
   * GET /procedures/by-email/:email
   * Trouver les procédures par email (utilisateur ou admin)
   */
  async findByEmail(email: string): Promise<ProcedureResponseDto[]> {
    const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_BY_EMAIL(email)}`);
    if (res.status === 204) return [];
    const data = await handleResponse<ProcedureResponseDto[]>(res);
    return Array.isArray(data) ? data : [];
  },

  /**
   * GET /procedures/by-rendezvous/:rendezVousId
   * Trouver une procédure par ID de rendez-vous
   */
  async findByRendezvousId(
    rendezVousId: string,
  ): Promise<ProcedureResponseDto | null> {
    const res = await apiFetch(
      `${BASE_URL}${API.PROCEDURE_BY_RENDEZVOUS(rendezVousId)}`,
    );
    if (res.status === 404) return null;
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * GET /procedures/:id/details
   * Détails d'une procédure
   */
  async findById(id: string): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_DETAILS(id)}`);
    return handleResponse<ProcedureResponseDto>(res);
  },

  /**
   * PATCH /procedures/:id/update
   * Mettre à jour une procédure
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
    const result = await handleResponse<ProcedureResponseDto>(res);
    toast.success("Procédure mise à jour");
    return result;
  },

  /**
   * PATCH /procedures/:id/cancel
   * Annuler une procédure (utilisateur connecté)
   */
  async cancel(id: string, reason?: string): Promise<ProcedureResponseDto> {
    const res = await apiFetch(`${BASE_URL}${API.PROCEDURE_CANCEL(id)}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        reason: reason || "Annulation par l'utilisateur",
      }),
    });
    const result = await handleResponse<ProcedureResponseDto>(res);
    toast.success("Procédure annulée");
    return result;
  },
};
