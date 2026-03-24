import { baseTemplate } from '../shared/base.template';

export interface ProcedureCancelledTemplateData {
  firstName: string;
  destination: string;
  reason: string;
}

export const procedureCancelledTemplate = (
  data: ProcedureCancelledTemplateData,
): string => {
  const content = `
    <p>Bonjour <strong>${data.firstName}</strong>,</p>
    <div style="margin:25px 0;line-height:1.8;">
      <p>Votre procédure a été annulée.</p>
      <div style="background:#fef2f2;padding:25px;border-radius:8px;border-left:4px solid #f59e0b;margin:25px 0;">
        <p><strong>Destination :</strong> ${data.destination}</p>
        <p><strong>Raison :</strong> ${data.reason}</p>
      </div>
      <p>Si vous souhaitez relancer une procédure, n'hésitez pas à nous contacter.</p>
    </div>
  `;

  return baseTemplate({
    title: 'Annulation de votre procédure',
    content,
  });
};
