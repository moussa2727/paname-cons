// =================================
// TYPES PROCEDURES (Gestion des procédures)
// =================================

export interface ProcedureJobData {
  data: {
    procedureId: string;
    userId: string;
    action: string;
    details?: Record<string, unknown>;
  };
}
