import { baseTemplate } from '../shared/base.template';

export interface WelcomeTemplateData {
  firstName: string;
  dashboardUrl: string;
}

export const welcomeTemplate = (data: WelcomeTemplateData): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Bienvenue chez Paname Consulting !</p>
      <p>Nous sommes ravis de vous compter parmi nous. Votre inscription a été effectuée avec succès.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <h3 style="margin-top:0;color:#0ea5e9;">Pour commencer</h3>
        <ul style="margin:0;padding-left:20px;">
          <li>Prenez rendez-vous avec nos conseillers</li>
          <li>Suivez l'avancement de vos procédures</li>
        </ul>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Bienvenue chez Paname Consulting',
    content,
    ctaText: 'Accéder à mon espace',
    ctaLink: data.dashboardUrl,
  });
};
