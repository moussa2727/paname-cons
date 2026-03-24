export interface BaseTemplateData {
  title?: string;
  content: string;
  ctaText?: string;
  ctaLink?: string;
}

export const baseTemplate = (data: BaseTemplateData): string => {
  const ctaSection =
    data.ctaText && data.ctaLink
      ? `
    <div style="text-align:center;margin-top:30px;">
      <a href="${data.ctaLink}" style="display:inline-block;padding:14px 28px;background:#0ea5e9;color:white;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;">${data.ctaText}</a>
    </div>
  `
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title || 'Paname Consulting'}</title>
</head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#333;max-width:600px;margin:0 auto;padding:20px;background-color:#ffffff;">
  <div style="background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(14,165,233,0.1);border:1px solid #e0f2fe;">
    <div style="background:#0ea5e9;color:white;padding:30px 20px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:600;">Paname Consulting</h1>
    </div>
    <div style="padding:30px 20px;background:white;">
      ${data.content}
      ${ctaSection}
      <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid #e0f2fe;color:#666;font-size:12px;">
        <p style="margin:0;">Cordialement,<br><strong>L'équipe Paname Consulting</strong></p>
      </div>
    </div>
  </div>
</body>
</html>`;
};
