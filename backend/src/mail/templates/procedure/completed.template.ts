import { baseTemplate } from '../shared/base.template';

export interface ProcedureCompletedTemplateData {
  firstName: string;
  destination: string;
  filiere: string;
  procedureId: string;
  procedureUrl: string;
}

export const procedureCompletedTemplate = (
  data: ProcedureCompletedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Félicitations ! Votre procédure est maintenant terminée.</p>
      <div style="background:#f0fdf4;padding:25px;border-radius:8px;border-left:4px solid #10b981;margin:25px 0;">
        <h3 style="margin-top:0;color:#10b981;">Procédure terminée</h3>
        <p><strong>Destination :</strong> ${data.destination}</p>
        <p><strong>Filière :</strong> ${data.filiere}</p>
      </div>
      <p>Vous pouvez consulter les détails dans votre espace personnel.</p>
    </div>
  `;

  return baseTemplate({
    title: 'Procédure terminée',
    content,
    ctaText: 'Consulter ma procédure',
    ctaLink: data.procedureUrl,
  });
};
