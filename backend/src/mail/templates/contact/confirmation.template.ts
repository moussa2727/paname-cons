import { baseTemplate } from '../shared/base.template';

export interface ContactConfirmationTemplateData {
  firstName: string;
  lastName: string;
  message: string;
}

export const contactConfirmationTemplate = (
  data: ContactConfirmationTemplateData,
): string => {
  const fullName =
    `${data.firstName} ${data.lastName}`.trim() || 'Cher(e) client(e)';

  const content = `
    <p>Bonjour <strong>${fullName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Nous avons bien reçu votre message et nous vous en remercions sincèrement.</p>
      <p>Notre équipe va l'examiner avec attention et vous répondra dans les <strong>48 heures ouvrables</strong>.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
        <h3 style="margin-top:0;color:#10b981;">Votre message</h3>
        <div style="background:#f8fafc;padding:15px;border-radius:6px;font-style:italic;color:#374151;line-height:1.7;">
          ${data.message}
        </div>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Confirmation de réception',
    content,
  });
};
