import { baseTemplate } from '../shared/base.template';

export interface ContactReplyTemplateData {
  firstName: string;
  lastName: string;
  response: string;
}

export const contactReplyTemplate = (
  data: ContactReplyTemplateData,
): string => {
  const fullName =
    `${data.firstName} ${data.lastName}`.trim() || 'Cher(e) client(e)';

  const content = `
    <p>Bonjour <strong>${fullName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Merci pour votre message. Notre équipe a pris le temps d'y répondre avec soin.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0284c7;margin:20px 0;">
        <h3 style="margin-top:0;color:#0284c7;">Notre réponse</h3>
        <div style="background:#f8fafc;padding:15px;border-radius:6px;color:#374151;line-height:1.7;">
          ${data.response}
        </div>
      </div>
      <p>Si vous avez d'autres questions, n'hésitez pas à nous contacter.</p>
    </div>
  `;

  return baseTemplate({
    title: 'Réponse à votre message',
    content,
  });
};
