import { baseTemplate } from '../shared/base.template';

export interface ProcedureCreatedTemplateData {
  firstName: string;
  destination: string;
  filiere: string;
  procedureId: string;
  procedureUrl: string;
}

export const procedureCreatedTemplate = (
  data: ProcedureCreatedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre procédure a été créée avec succès.</p>
      <div style="background:#f0f9ff;padding:25px;border-radius:8px;border-left:4px solid #0ea5e9;margin:25px 0;">
        <h3 style="margin-top:0;color:#0ea5e9;">Détails de la procédure</h3>
        <p><strong>Destination :</strong> ${data.destination}</p>
        <p><strong>Filière :</strong> ${data.filiere}</p>
        <p><strong>Statut :</strong> En cours</p>
      </div>
    </div>
  `;

  return baseTemplate({
    title: 'Confirmation de votre procédure',
    content,
    ctaText: 'Suivre ma procédure',
    ctaLink: data.procedureUrl,
  });
};
