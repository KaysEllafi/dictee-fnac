const nodemailer = require('nodemailer');
const bwipjs     = require('bwip-js');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Génère le code-barres en base64 et envoie l'e-mail de confirmation
 * @param {object} inscription — objet depuis la BDD
 */
async function envoyerEmail(inscription) {
  // Générer un code-barres (Code 128) directement en base64 pour l'intégrer dans le HTML.
  const barcodeBase64 = await bwipjs.toBuffer({
    bcid: 'code128',
    text: inscription.code,
    scale: 3,
    height: 10,
    includetext: false,
    backgroundcolor: 'FFFFFF',
    paddingwidth: 0,
    padding: 0,
  });

  const barcodeDataUrl = `data:image/png;base64,${barcodeBase64.toString('base64')}`;

  const html = buildEmailHTML(inscription, barcodeDataUrl);

  await transporter.sendMail({
    from:    process.env.MAIL_FROM || '"Fnac Tunisie" <noreply@fnac.com.tn>',
    to:      inscription.email,
    subject: `✅ Votre inscription à la Dictée Fnac — ${inscription.prenom} ${inscription.nom}`,
    html,
  });

  console.log(`📧 E-mail envoyé à ${inscription.email} (code: ${inscription.code})`);
}

function buildEmailHTML(inscription, barcodeDataUrl) {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation d'inscription</title>
</head>
<body style="margin:0; padding:0; background:#f5f5f0; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0; padding: 32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden;">
        
        <!-- Header Fnac (jaune + style logo) -->
        <tr>
          <td style="background:#ffcc00; padding: 24px 32px;">
            <p style="margin:0; color:#111111; font-size:26px; font-weight:bold; letter-spacing:-0.5px;">fnac</p>
            <p style="margin:4px 0 0; color:rgba(0,0,0,0.65); font-size:13px;">Dictée Fnac Tunisie 2026</p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding: 32px;">
            <p style="margin:0 0 8px; font-size:20px; font-weight:bold; color:#1a1a1a;">
              Bonjour ${inscription.prenom} ${inscription.nom} 👋
            </p>
            <p style="margin:0 0 24px; font-size:14px; color:#555; line-height:1.6;">
              Votre inscription à la <strong>Dictée Fnac Tunisie</strong> est confirmée.
              Présentez ce code-barres à l'entrée le jour de l'événement.
            </p>

            <!-- Billet -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border: 1.5px solid #e5e5e5; border-radius:10px; overflow:hidden;">
              <tr>
                <td style="background:#fafaf8; padding: 20px; text-align:center; border-bottom:1px dashed #e0e0e0;">
                  <p style="margin:0 0 4px; font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.08em;">
                    Code-barres d'entrée
                  </p>
                  <img src="${barcodeDataUrl}" width="320" height="90" alt="Code-barres ${inscription.code}"
                    style="display:block; margin:12px auto; max-width: 100%; height: auto;">
                  <p style="margin:8px 0 0; font-size:12px; color:#888; font-family:monospace; letter-spacing:0.1em;">
                    ${inscription.code}
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 16px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:12px; color:#888; padding:4px 0;">Participant</td>
                      <td style="font-size:13px; font-weight:bold; color:#1a1a1a; text-align:right; padding:4px 0;">
                        ${inscription.prenom} ${inscription.nom}
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:12px; color:#888; padding:4px 0;">Événement</td>
                      <td style="font-size:13px; color:#1a1a1a; text-align:right; padding:4px 0;">
                        Dictée Fnac Tunisie 2026
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size:12px; color:#888; padding:4px 0;">Lieu</td>
                      <td style="font-size:13px; color:#1a1a1a; text-align:right; padding:4px 0;">
                        Fnac — Centre commercial, Tunis
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0; font-size:13px; color:#888; line-height:1.6;">
              Ce billet est <strong>personnel et non transférable</strong>.<br>
              En cas de problème, contactez-nous à 
              <a href="mailto:evenements@fnac.com.tn" style="color:#e2001a;">evenements@fnac.com.tn</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f5f5f0; padding:16px 32px; text-align:center;">
            <p style="margin:0; font-size:11px; color:#aaa;">
              © 2026 Fnac Tunisie — Culturetech SA. Cet e-mail vous a été envoyé car vous avez complété le formulaire d'inscription.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { envoyerEmail };
