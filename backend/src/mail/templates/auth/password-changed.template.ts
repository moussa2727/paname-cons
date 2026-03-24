import { baseTemplate } from '../shared/base.template';

export interface PasswordChangedTemplateData {
  firstName: string;
}

export const passwordChangedTemplate = (
  data: PasswordChangedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre mot de passe a été modifié avec succès.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
        <p style="margin:0;">Si vous n'êtes pas à l'origine de cette modification, veuillez nous contacter immédiatement.</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Mot de passe modifié',
    content,
  });
};
