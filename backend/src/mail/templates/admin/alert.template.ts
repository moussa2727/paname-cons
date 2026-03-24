export interface AdminAlertTemplateData {
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  timestamp?: Date;
  source?: string;
  metadata?: Record<string, unknown>;
}

export const adminAlertTemplate = (data: AdminAlertTemplateData): string => {
  const levelColors = {
    info: '#0ea5e9',
    warning: '#f59e0b',
    error: '#ef4444',
  };

  const levelLabels = {
    info: 'Information',
    warning: 'Avertissement',
    error: 'Erreur critique',
  };

  const levelIcons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
  };

  const timestamp = data.timestamp || new Date();
  const source = data.source || 'Paname Consulting Backend';

  // Format metadata if present
  let metadataHtml = '';
  if (data.metadata && Object.keys(data.metadata).length > 0) {
    metadataHtml = `
      <div style="background:#f8fafc;padding:15px;border-radius:6px;margin:15px 0;">
        <p style="margin:0 0 10px 0;font-weight:600;color:#374151;">Métadonnées :</p>
        <pre style="margin:0;font-size:11px;color:#6b7280;white-space:pre-wrap;word-wrap:break-word;">${JSON.stringify(data.metadata, null, 2)}</pre>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paname Consulting - Alerte ${data.level}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">
  <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(14,165,233,0.1);border:1px solid #e0f2fe;">
    <div style="background:${levelColors[data.level]};color:white;padding:30px 20px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:600;">Paname Consulting</h1>
      <p style="margin:5px 0 0;font-size:14px;">${levelLabels[data.level]} ${levelIcons[data.level]}</p>
    </div>
    <div style="padding:30px 20px;background:white;">
      <h2 style="margin-top:0;color:#333;font-size:20px;">${data.title}</h2>
      <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid ${levelColors[data.level]};">
        <p style="margin:0;color:#374151;line-height:1.6;">${data.message}</p>
      </div>
      <div style="background:#f0f9ff;padding:15px;border-radius:6px;margin:20px 0;">
        <p style="margin:0;font-size:12px;color:#6b7280;">
          <strong>Détails techniques :</strong><br>
          Date : ${timestamp.toLocaleString('fr-FR')}<br>
          Niveau : ${data.level}<br>
          Source : ${source}
        </p>
      </div>
      ${metadataHtml}
      <p style="color:#666;font-size:14px;">Cette alerte a été générée automatiquement par le système.</p>
      <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e0f2fe;color:#666;font-size:12px;">
        <p style="margin:0;">Cordialement,<br><strong>L'équipe Paname Consulting</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`;
};
