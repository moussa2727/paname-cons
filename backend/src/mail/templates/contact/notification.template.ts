import { baseTemplate } from '../shared/base.template';

export interface ContactNotificationTemplateData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  createdAt: Date;
  adminUrl: string;
}

export const contactNotificationTemplate = (
  data: ContactNotificationTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>Équipe</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Un nouveau message de contact a été reçu sur le site.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <h3 style="margin-top:0;color:#0ea5e9;">Informations du contact</h3>
        <p><strong>Nom :</strong> ${data.firstName} ${data.lastName}</p>
        <p><strong>Email :</strong> ${data.email}</p>
        <p><strong>Date :</strong> ${data.createdAt.toLocaleDateString('fr-FR')}</p>
      </div>
      <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #7c3aed;">
        <h4 style="margin-top:0;color:#7c3aed;">Message</h4>
        <div style="font-style:italic;color:#374151;line-height:1.7;">${data.message}</div>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Nouveau message de contact',
    content,
    ctaText: 'Répondre au message',
    ctaLink: data.adminUrl,
  });
};
