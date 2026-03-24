import { baseTemplate } from '../shared/base.template';

export interface RendezvousReminderTemplateData {
  firstName: string;
  date: string;
  time: string;
  destination: string;
  rendezvousUrl: string;
}

export const rendezvousReminderTemplate = (
  data: RendezvousReminderTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Nous vous rappelons que vous avez un rendez-vous prévu :</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <p><strong>Date :</strong> ${data.date}</p>
        <p><strong>Heure :</strong> ${data.time}</p>
        <p><strong>Destination :</strong> ${data.destination}</p>
      </div>
      <p>Nous vous attendons avec impatience pour discuter de votre projet.</p>
    </div>
  `;

  return baseTemplate({
    title: 'Rappel : Votre rendez-vous approche',
    content,
    ctaText: 'Voir mon rendez-vous',
    ctaLink: data.rendezvousUrl,
  });
};
