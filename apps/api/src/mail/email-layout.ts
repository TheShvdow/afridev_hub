import { escapeHtml } from './escape-html';

// Mise en page commune des emails : tableaux et styles en ligne, seuls rendus
// de façon fiable par Gmail, Outlook et les clients mobiles.
const BRAND = '#0F9D58';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Enveloppe le contenu d'un email. Le sujet sert de texte d'aperçu dans la boîte de réception.
export function emailLayout(content: string, preheader: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(preheader)}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:0 0 16px;font-family:${FONT};font-size:20px;font-weight:700;color:${TEXT}">
        <span style="color:${BRAND}">AfriDev</span> Hub
      </td></tr>
      <tr><td style="background:#FFFFFF;border-radius:12px;border-top:4px solid ${BRAND};padding:32px 28px;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT}">
        ${content}
      </td></tr>
      <tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED};text-align:center">
        AfriDev Hub — la communauté des développeurs africains.<br>
        Cet email vous a été envoyé automatiquement, merci de ne pas y répondre.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function emailButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0">
  <tr><td style="border-radius:8px;background:${BRAND}">
    <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none">${escapeHtml(label)}</a>
  </td></tr>
</table>`;
}

export function emailCode(code: string): string {
  return `<div style="margin:24px 0;padding:16px;border-radius:8px;background:#ECFDF5;border:1px dashed ${BRAND};text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:${TEXT}">${escapeHtml(code)}</div>`;
}

// Mention secondaire en bas de carte (désinscription, justificatif…).
export function emailNote(text: string): string {
  return `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #E5E7EB;font-size:13px;color:${MUTED}">${escapeHtml(text)}</p>`;
}

// Lignes libellé / valeur, pour le reçu de paiement.
export function emailDetails(rows: Array<[string, string]>): string {
  const cells = rows
    .map(([label, value]) => `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;color:${MUTED}">${escapeHtml(label)}</td>
    <td style="padding:8px 0;border-bottom:1px solid #E5E7EB;text-align:right;font-weight:600">${escapeHtml(value)}</td>
  </tr>`)
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">${cells}</table>`;
}
