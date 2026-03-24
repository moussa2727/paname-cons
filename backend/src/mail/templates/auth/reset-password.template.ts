import { baseTemplate } from '../shared/base.template';

export interface ResetPasswordTemplateData {
  firstName: string;
  resetLink: string;
}

export const resetPasswordTemplate = (
  data: ResetPasswordTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
      <div style="background:#fff3e0;padding:25px;border-radius:8px;border-left:4px solid #f59e0b;margin:25px 0;">
        <p style="margin:0 0 15px 0;">Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        <div style="text-align:center;">
          <a href="${data.resetLink}" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">Réinitialiser mon mot de passe</a>
        </div>
      </div>
      <p>Ce lien est valable pendant 2 heures. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    </div>
  `;

  return baseTemplate({
    title: 'Réinitialisation de votre mot de passe',
    content,
  });
};
