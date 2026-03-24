import { baseTemplate } from '../shared/base.template';

export interface RendezvousConfirmationTemplateData {
  firstName: string;
  date: string;
  time: string;
  destination: string;
  rendezvousId: string;
  rendezvousUrl: string;
}

export const rendezvousConfirmationTemplate = (
  data: RendezvousConfirmationTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre rendez-vous a été confirmé avec succès.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <h3 style="margin-top:0;color:#0ea5e9;">Détails du rendez-vous</h3>
        <p><strong>Date :</strong> ${data.date}</p>
        <p><strong>Heure :</strong> ${data.time}</p>
        <p><strong>Destination :</strong> ${data.destination}</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Confirmation de votre rendez-vous',
    content,
    ctaText: 'Voir mon rendez-vous',
    ctaLink: data.rendezvousUrl,
  });
};
