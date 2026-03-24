import { baseTemplate } from '../shared/base.template';
import { ProcedureStatus } from '@prisma/client';

export interface ProcedureStatusUpdatedTemplateData {
  firstName: string;
  destination: string;
  filiere: string;
  oldStatus: ProcedureStatus;
  newStatus: ProcedureStatus;
  procedureId: string;
  procedureUrl: string;
}

const statusLabels: Record<ProcedureStatus, string> = {
  PENDING: 'en attente',
  IN_PROGRESS: 'en cours',
  COMPLETED: 'terminée',
  REJECTED: 'refusée',
  CANCELLED: 'annulée',
};

export const procedureStatusUpdatedTemplate = (
  data: ProcedureStatusUpdatedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Le statut de votre procédure a été mis à jour.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <p><strong>Destination :</strong> ${data.destination}</p>
        <p><strong>Filière :</strong> ${data.filiere}</p>
        <p><strong>Ancien statut :</strong> ${statusLabels[data.oldStatus]}</p>
        <p><strong>Nouveau statut :</strong> ${statusLabels[data.newStatus]}</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Mise à jour de votre procédure',
    content,
    ctaText: 'Suivre ma procédure',
    ctaLink: data.procedureUrl,
  });
};
