import { baseTemplate } from '../shared/base.template';

export interface RendezvousCancelledTemplateData {
  firstName: string;
  date: string;
  time: string;
  cancelledBy: 'USER' | 'ADMIN';
  newRendezvousUrl: string;
}

export const rendezvousCancelledTemplate = (
  data: RendezvousCancelledTemplateData,
): string => {
  const cancelledByText =
    data.cancelledBy === 'USER'
      ? 'vous avez annulé'
      : 'a été annulé par un administrateur';

  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre rendez-vous du ${data.date} à ${data.time} ${cancelledByText}.</p>
      <div style="background:#fef2f2;padding:25px;border-radius:8px;border-left:4px solid #ef4444;margin:25px 0;">
        <p style="margin:0;">Si vous souhaitez prendre un nouveau rendez-vous, connectez-vous à votre espace.</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Annulation de votre rendez-vous',
    content,
    ctaText: 'Prendre un nouveau rendez-vous',
    ctaLink: data.newRendezvousUrl,
  });
};
