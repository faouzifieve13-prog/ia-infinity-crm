// Gmail integration using Replit connection
import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Gmail not connected');
  }
  return accessToken;
}

async function getUncachableGmailClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function createEmailMessage(to: string, subject: string, htmlBody: string): string {
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    htmlBody
  ];
  const message = messageParts.join('\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface InvitationEmailParams {
  to: string;
  inviteLink: string;
  role: string;
  space: string;
  expiresAt: Date;
  organizationName?: string;
}

function formatRole(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrateur',
    sales: 'Commercial',
    delivery: 'Delivery Manager',
    finance: 'Finance',
    client_admin: 'Administrateur Client',
    client_member: 'Membre Client',
    vendor: 'Prestataire'
  };
  return roleNames[role] || role;
}

function formatSpace(space: string): string {
  const spaceNames: Record<string, string> = {
    internal: 'Portail Admin',
    client: 'Portail Client',
    vendor: 'Portail Prestataire'
  };
  return spaceNames[space] || space;
}

function formatExpirationDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export async function sendInvitationEmail(params: InvitationEmailParams): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const orgName = params.organizationName || 'IA Infinity';
    const roleName = formatRole(params.role);
    const spaceName = formatSpace(params.space);
    const expirationDate = formatExpirationDate(params.expiresAt);
    
    const subject = `Invitation à rejoindre ${orgName}`;
    
    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${orgName}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Vous êtes invité(e) !
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Vous avez été invité(e) à rejoindre <strong>${orgName}</strong> en tant que <strong>${roleName}</strong> sur le <strong>${spaceName}</strong>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f4f4f5; border-radius: 6px; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Rôle</td>
                        <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${roleName}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Espace</td>
                        <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${spaceName}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px;">Expire le</td>
                        <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${expirationDate}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Accepter l'invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 24px 0; color: #3b82f6; font-size: 12px; word-break: break-all; background-color: #f4f4f5; padding: 12px; border-radius: 4px;">
                ${params.inviteLink}
              </p>
              
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.6;">
                Cette invitation expirera le ${expirationDate}. Si vous n'avez pas demandé cette invitation, vous pouvez ignorer cet email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} ${orgName}. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
    
    const encodedMessage = createEmailMessage(params.to, subject, htmlBody);
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log(`Invitation email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return false;
  }
}

export async function testGmailConnection(): Promise<{ connected: boolean; email?: string; error?: string }> {
  try {
    const gmail = await getUncachableGmailClient();
    const profile = await gmail.users.getProfile({ userId: 'me' });
    return { 
      connected: true, 
      email: profile.data.emailAddress || undefined 
    };
  } catch (error: any) {
    return { 
      connected: false, 
      error: error.message 
    };
  }
}

export interface ContractEmailParams {
  to: string;
  contractNumber: string;
  contractTitle: string;
  contractType: string;
  clientName: string;
  amount: string;
  currency: string;
  startDate?: string | null;
  endDate?: string | null;
  scope?: string | null;
  deliverables?: string[];
  paymentTerms?: string | null;
  signatureLink: string;
  organizationName?: string;
}

function formatContractType(type: string): string {
  const typeNames: Record<string, string> = {
    audit: "Contrat d'Audit",
    prestation: "Contrat de Prestation",
    formation: "Contrat de Formation",
    suivi: "Contrat de Suivi",
    sous_traitance: "Contrat de Sous-Traitance"
  };
  return typeNames[type] || type;
}

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(num);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return 'Non définie';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

export async function sendContractEmail(params: ContractEmailParams): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const orgName = params.organizationName || 'IA Infinity';
    const contractTypeName = formatContractType(params.contractType);
    const formattedAmount = formatCurrency(params.amount, params.currency);
    
    const subject = `${contractTypeName} - ${params.contractNumber} | ${orgName}`;
    
    const deliverablesHtml = params.deliverables && params.deliverables.length > 0
      ? `<ul style="margin: 8px 0; padding-left: 20px; color: #18181b;">
          ${params.deliverables.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')}
        </ul>`
      : '<p style="color: #71717a;">Non spécifiés</p>';
    
    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${orgName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${contractTypeName}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 8px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Bonjour ${params.clientName},
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Veuillez trouver ci-dessous les détails de votre contrat. Pour finaliser, veuillez le consulter et le signer électroniquement.
              </p>
              
              <!-- Contract Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #fafafa; padding: 16px; border-bottom: 1px solid #e4e4e7;">
                    <h3 style="margin: 0; color: #18181b; font-size: 16px; font-weight: 600;">
                      ${params.contractTitle}
                    </h3>
                    <p style="margin: 4px 0 0 0; color: #71717a; font-size: 14px;">
                      N° ${params.contractNumber}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 12px; width: 40%;">Montant</td>
                        <td style="color: #18181b; font-size: 14px; font-weight: 600; text-align: right; padding-bottom: 12px;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 12px;">Date de début</td>
                        <td style="color: #18181b; font-size: 14px; text-align: right; padding-bottom: 12px;">${formatDate(params.startDate)}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 12px;">Date de fin</td>
                        <td style="color: #18181b; font-size: 14px; text-align: right; padding-bottom: 12px;">${formatDate(params.endDate)}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px;">Conditions de paiement</td>
                        <td style="color: #18181b; font-size: 14px; text-align: right;">${params.paymentTerms || 'Standard'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${params.scope ? `
              <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px 0; color: #18181b; font-size: 14px; font-weight: 600;">Périmètre</h4>
                <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6;">${params.scope}</p>
              </div>
              ` : ''}

              <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px 0; color: #18181b; font-size: 14px; font-weight: 600;">Livrables</h4>
                ${deliverablesHtml}
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.signatureLink}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Consulter et Signer le Contrat
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 24px 0; color: #8b5cf6; font-size: 12px; word-break: break-all; background-color: #f4f4f5; padding: 12px; border-radius: 4px;">
                ${params.signatureLink}
              </p>
              
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.6;">
                Pour toute question, n'hésitez pas à nous contacter. Ce contrat nécessite votre signature électronique pour être validé.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                © ${new Date().getFullYear()} ${orgName}. Tous droits réservés.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
    
    const encodedMessage = createEmailMessage(params.to, subject, htmlBody);
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log(`Contract email sent successfully to ${params.to} for contract ${params.contractNumber}`);
    return true;
  } catch (error) {
    console.error('Failed to send contract email:', error);
    return false;
  }
}
