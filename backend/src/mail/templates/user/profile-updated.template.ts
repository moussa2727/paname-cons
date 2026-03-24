import { baseTemplate } from '../shared/base.template';

export interface ProfileUpdatedTemplateData {
  firstName: string;
  dashboardUrl: string;
}

export const profileUpdatedTemplate = (
  data: ProfileUpdatedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre profil a été mis à jour avec succès.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
        <p style="margin:0;">Les modifications de votre profil ont été enregistrées.</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Profil mis à jour',
    content,
    ctaText: 'Voir mon profil',
    ctaLink: data.dashboardUrl,
  });
};
