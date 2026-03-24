import { baseTemplate } from '../shared/base.template';
import { formatTimeSlot, statusLabels } from './time-slot.utils';

export interface RendezvousStatusUpdatedTemplateData {
  firstName: string;
  date: string;
  time: string;
  oldStatus: string;
  newStatus: string;
  rendezvousUrl: string;
}

export const rendezvousStatusUpdatedTemplate = (
  data: RendezvousStatusUpdatedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Le statut de votre rendez-vous du ${data.date} à ${formatTimeSlot(data.time)} a été mis à jour.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <p><strong>Ancien statut :</strong> ${statusLabels[data.oldStatus]}</p>
        <p><strong>Nouveau statut :</strong> ${statusLabels[data.newStatus]}</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Mise à jour de votre rendez-vous',
    content,
    ctaText: 'Voir mon rendez-vous',
    ctaLink: data.rendezvousUrl,
  });
};
