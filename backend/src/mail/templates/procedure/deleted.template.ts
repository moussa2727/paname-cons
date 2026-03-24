import { baseTemplate } from '../shared/base.template';

export interface ProcedureDeletedTemplateData {
  firstName: string;
  destination: string;
  reason: string;
}

export const procedureDeletedTemplate = (
  data: ProcedureDeletedTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre procédure a été supprimée.</p>
      <div style="background:#fef2f2;padding:25px;border-radius:8px;border-left:4px solid #ef4444;margin:25px 0;">
        <p><strong>Destination :</strong> ${data.destination}</p>
        <p><strong>Raison :</strong> ${data.reason}</p>
      </div>
      <p>Pour toute question, n'hésitez pas à nous contacter.</p>
    </div>
  `;

  return baseTemplate({
    title: 'Suppression de votre procédure',
    content,
  });
};
