// Gmail integration using Replit connection
import { google } from 'googleapis';

async function getAccessToken() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

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
    // Use labels.list instead of getProfile as we only have gmail.labels scope
    const labels = await gmail.users.labels.list({ userId: 'me' });
    // If we can list labels, the connection is working
    return { 
      connected: true,
      email: undefined // Cannot retrieve email without gmail.readonly scope
    };
  } catch (error: any) {
    return { 
      connected: false, 
      error: error.message 
    };
  }
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromName: string;
  to: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  labelIds: string[];
}

export async function getInboxEmails(maxResults: number = 20): Promise<EmailMessage[]> {
  try {
    const gmail = await getUncachableGmailClient();
    
    // List messages from inbox
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      labelIds: ['INBOX'],
    });
    
    const messages = response.data.messages || [];
    const emails: EmailMessage[] = [];
    
    // Fetch details for each message
    for (const msg of messages) {
      if (!msg.id) continue;
      
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date'],
        });
        
        const headers = detail.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
        
        const fromRaw = getHeader('From');
        const fromMatch = fromRaw.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]*)>?$/);
        const fromName = fromMatch?.[1]?.trim() || fromRaw.split('@')[0];
        const fromEmail = fromMatch?.[2] || fromRaw;
        
        emails.push({
          id: msg.id,
          threadId: msg.threadId || '',
          subject: getHeader('Subject') || '(Sans objet)',
          from: fromEmail,
          fromName: fromName,
          to: getHeader('To'),
          date: getHeader('Date'),
          snippet: detail.data.snippet || '',
          isUnread: detail.data.labelIds?.includes('UNREAD') || false,
          labelIds: detail.data.labelIds || [],
        });
      } catch (err) {
        console.error(`Failed to fetch email ${msg.id}:`, err);
      }
    }
    
    return emails;
  } catch (error: any) {
    console.error('Failed to fetch inbox emails:', error);
    throw new Error(`Failed to fetch emails: ${error.message}`);
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

export interface ClientWelcomeEmailParams {
  to: string;
  clientName: string;
  companyName: string;
  portalLink: string;
  organizationName?: string;
}

export async function sendClientWelcomeEmail(params: ClientWelcomeEmailParams): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const orgName = params.organizationName || 'IA Infinity';
    
    const subject = `Bienvenue chez ${orgName} - Accès à votre espace client`;
    
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
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ${orgName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Votre partenaire en Intelligence Artificielle
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 22px; font-weight: 600;">
                Bienvenue ${params.clientName} !
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Nous sommes ravis de vous compter parmi nos clients. Votre espace dédié <strong>${params.companyName}</strong> a été créé avec succès.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 8px; border: 1px solid #bae6fd;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #0369a1; font-size: 16px; font-weight: 600;">
                      Votre Portail Client
                    </h3>
                    <p style="margin: 0; color: #0c4a6e; font-size: 14px; line-height: 1.6;">
                      Accédez à votre espace personnel pour suivre vos projets, consulter vos documents et communiquer avec notre équipe.
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.portalLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);">
                      Accéder à mon espace client
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 24px 0; color: #3b82f6; font-size: 12px; word-break: break-all; background-color: #f4f4f5; padding: 12px; border-radius: 4px;">
                ${params.portalLink}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              
              <h4 style="margin: 0 0 12px 0; color: #18181b; font-size: 14px; font-weight: 600;">
                Prochaines étapes
              </h4>
              <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #52525b; font-size: 14px; line-height: 1.8;">
                <li>Explorez votre espace client</li>
                <li>Consultez vos documents et contrats</li>
                <li>Suivez l'avancement de vos projets</li>
                <li>Contactez notre équipe pour toute question</li>
              </ul>
              
              <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                Notre équipe reste à votre disposition pour vous accompagner dans votre transformation digitale.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 8px 0; color: #71717a; font-size: 14px; font-weight: 500;">
                L'équipe ${orgName}
              </p>
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
    
    console.log(`Welcome email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

export interface GenericEmailParams {
  to: string;
  subject: string;
  htmlBody: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  fromEmail?: string;
  error?: string;
}

export async function sendGenericEmail(params: GenericEmailParams): Promise<SendEmailResult> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const encodedMessage = createEmailMessage(params.to, params.subject, params.htmlBody);
    
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    console.log(`Email sent successfully to ${params.to}`);
    return {
      success: true,
      messageId: response.data.id || undefined,
      threadId: response.data.threadId || undefined,
      fromEmail: profile.data.emailAddress || undefined,
    };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

export async function syncGmailEmails(orgId: string, accountId?: string): Promise<SyncResult> {
  const result: SyncResult = { success: true, synced: 0, errors: [] };
  
  try {
    const gmail = await getUncachableGmailClient();
    const { storage } = await import('./storage');
    
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: 'in:inbox OR in:sent',
    });
    
    const messages = listResponse.data.messages || [];
    
    for (const msg of messages) {
      if (!msg.id) continue;
      
      try {
        const existing = await storage.getEmailByGmailId(msg.id, orgId);
        if (existing) continue;
        
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date'],
        });
        
        const headers = fullMessage.data.payload?.headers || [];
        const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
        
        const subject = getHeader('Subject');
        const from = getHeader('From');
        const to = getHeader('To');
        const dateStr = getHeader('Date');
        
        const fromMatch = from.match(/<(.+)>/) || [null, from];
        const fromEmail = fromMatch[1] || from;
        const fromName = from.replace(/<.+>/, '').trim() || fromEmail;
        
        const toEmails = to.split(',').map(e => {
          const match = e.match(/<(.+)>/);
          return match ? match[1] : e.trim();
        }).filter(Boolean);
        
        const labels = fullMessage.data.labelIds || [];
        const direction = labels.includes('SENT') ? 'outbound' : 'inbound';
        
        await storage.createEmail({
          orgId,
          accountId: accountId || null,
          dealId: null,
          contactId: null,
          gmailMessageId: msg.id,
          gmailThreadId: fullMessage.data.threadId || null,
          subject,
          snippet: fullMessage.data.snippet || null,
          fromEmail,
          fromName,
          toEmails,
          direction,
          receivedAt: dateStr ? new Date(dateStr) : new Date(),
          isRead: !labels.includes('UNREAD'),
          hasAttachment: (fullMessage.data.payload?.parts || []).some(p => p.filename && p.filename.length > 0),
          labels,
        });
        
        result.synced++;
      } catch (msgError: any) {
        result.errors.push(`Failed to sync message ${msg.id}: ${msgError.message}`);
      }
    }
    
    console.log(`Gmail sync completed: ${result.synced} emails synced`);
  } catch (error: any) {
    console.error('Gmail sync error:', error);
    result.success = false;
    result.errors.push(error.message);
  }
  
  return result;
}

// ============================================
// Meeting Message Functions
// ============================================

export interface MeetingMessageParams {
  to: string;
  recipientName: string;
  companyName?: string;
  eventTitle: string;
  eventDate: Date;
  eventTime: string;
  eventLocation?: string;
  meetLink?: string;
  messageType: 'preConfirmation' | 'reminder' | 'thankYou';
  customContext?: string;
}

const IA_INFINITY_SIGNATURE = `
--
Ismael Lepennec
IA Infinity
06 21 00 58 94
i-a-infinity.com`;

function getDefaultMeetingMessage(params: MeetingMessageParams): { subject: string; body: string } {
  const eventDateFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(params.eventDate);
  
  const locationInfo = params.meetLink 
    ? `Lien visio : ${params.meetLink}` 
    : params.eventLocation 
      ? `Lieu : ${params.eventLocation}` 
      : '';

  switch (params.messageType) {
    case 'preConfirmation':
      return {
        subject: `Confirmation de notre rendez-vous - ${params.eventTitle}`,
        body: `Bonjour ${params.recipientName},

Je vous confirme notre rendez-vous prévu le ${eventDateFormatted} à ${params.eventTime}.

${params.eventTitle}
${locationInfo}

N'hésitez pas à me contacter si vous avez des questions ou si vous souhaitez modifier ce rendez-vous.

Au plaisir de vous retrouver !
${IA_INFINITY_SIGNATURE}`
      };
      
    case 'reminder':
      return {
        subject: `Rappel : Notre rendez-vous demain - ${params.eventTitle}`,
        body: `Bonjour ${params.recipientName},

Je me permets de vous rappeler notre rendez-vous demain ${eventDateFormatted} à ${params.eventTime}.

${params.eventTitle}
${locationInfo}

À très bientôt !
${IA_INFINITY_SIGNATURE}`
      };
      
    case 'thankYou':
      return {
        subject: `Merci pour notre échange - ${params.eventTitle}`,
        body: `Bonjour ${params.recipientName},

Je tenais à vous remercier pour le temps que vous m'avez accordé lors de notre rendez-vous.

J'ai été ravi de pouvoir échanger avec vous. N'hésitez pas à me recontacter si vous avez des questions.

À bientôt,
${IA_INFINITY_SIGNATURE}`
      };
  }
}

export async function generateAIMeetingMessage(params: MeetingMessageParams): Promise<{ subject: string; body: string }> {
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    });
    
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      console.log('OpenAI API key not configured, using default message');
      return getDefaultMeetingMessage(params);
    }

    const eventDateFormatted = new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(params.eventDate);

    const messageTypeDescriptions = {
      preConfirmation: 'un email de confirmation de rendez-vous envoyé 48h avant',
      reminder: 'un email de rappel de rendez-vous envoyé 24h avant',
      thankYou: 'un email de remerciement après le rendez-vous',
    };

    const prompt = `Tu es un assistant commercial pour IA Infinity, une entreprise spécialisée en Intelligence Artificielle et automatisation.

Génère ${messageTypeDescriptions[params.messageType]} pour :
- Destinataire : ${params.recipientName}${params.companyName ? ` de ${params.companyName}` : ''}
- Événement : ${params.eventTitle}
- Date : ${eventDateFormatted} à ${params.eventTime}
${params.eventLocation ? `- Lieu : ${params.eventLocation}` : ''}
${params.meetLink ? `- Lien visio : ${params.meetLink}` : ''}
${params.customContext ? `- Contexte supplémentaire : ${params.customContext}` : ''}

Instructions :
- Ton professionnel mais chaleureux
- Message court et efficace (max 150 mots)
- Tutoiement autorisé si contexte décontracté
- Ne pas inclure la signature (elle sera ajoutée automatiquement)
- Retourne uniquement un JSON avec "subject" (objet de l'email) et "body" (corps du message)`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.log('Empty response from OpenAI, using default message');
      return getDefaultMeetingMessage(params);
    }

    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject || getDefaultMeetingMessage(params).subject,
      body: (parsed.body || getDefaultMeetingMessage(params).body) + IA_INFINITY_SIGNATURE,
    };
  } catch (error) {
    console.error('AI message generation failed:', error);
    return getDefaultMeetingMessage(params);
  }
}

export async function sendMeetingEmail(params: MeetingMessageParams, useAI: boolean = true): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const message = useAI 
      ? await generateAIMeetingMessage(params)
      : getDefaultMeetingMessage(params);
    
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
          <tr>
            <td style="padding: 40px;">
              <pre style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word; font-size: 15px; line-height: 1.6; color: #18181b;">
${message.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
              </pre>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
    
    const encodedMessage = createEmailMessage(params.to, message.subject, htmlBody);
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log(`Meeting ${params.messageType} email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error(`Failed to send meeting ${params.messageType} email:`, error);
    return false;
  }
}

export interface VendorProjectAssignmentEmailParams {
  to: string;
  vendorName: string;
  projectName: string;
  projectDescription?: string | null;
  clientName: string;
  startDate?: string | null;
  endDate?: string | null;
  organizationName?: string;
}

function formatProjectDate(date: string | null | undefined): string {
  if (!date) return 'Non définie';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(date));
}

export interface VendorWelcomeEmailParams {
  to: string;
  vendorName: string;
  portalLink: string;
  organizationName?: string;
}

export async function sendVendorWelcomeEmail(params: VendorWelcomeEmailParams): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const orgName = params.organizationName || 'IA Infinity';
    
    const subject = `Bienvenue chez ${orgName} - Accès à votre espace sous-traitant`;
    
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
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                ${orgName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Espace Sous-traitant
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 22px; font-weight: 600;">
                Bienvenue ${params.vendorName} !
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Nous sommes ravis de vous compter parmi nos sous-traitants. Votre accès au portail a été créé avec succès.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 8px; border: 1px solid #fed7aa;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 12px 0; color: #c2410c; font-size: 16px; font-weight: 600;">
                      Votre Portail Sous-traitant
                    </h3>
                    <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 1.6;">
                      Accédez à votre espace personnel pour consulter vos missions, suivre vos projets et accéder aux documents associés.
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${params.portalLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);">
                      Accéder à mon espace
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 16px 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 24px 0; color: #f97316; font-size: 12px; word-break: break-all; background-color: #f4f4f5; padding: 12px; border-radius: 4px;">
                ${params.portalLink}
              </p>
              
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.6;">
                Pour toute question, n'hésitez pas à nous contacter. Nous sommes impatients de collaborer avec vous !
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                &copy; ${new Date().getFullYear()} ${orgName}. Tous droits réservés.
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
    
    console.log(`Vendor welcome email sent to ${params.to}`);
    return true;
  } catch (error) {
    console.error('Failed to send vendor welcome email:', error);
    return false;
  }
}

export async function sendVendorProjectAssignmentEmail(params: VendorProjectAssignmentEmailParams): Promise<boolean> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const orgName = params.organizationName || 'IA Infinity';
    
    const subject = `Nouvelle mission : ${params.projectName} | ${orgName}`;
    
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
            <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${orgName}
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Nouvelle mission assignée
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Bonjour ${params.vendorName},
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                Une nouvelle mission vous a été assignée. Voici les détails du projet :
              </p>
              
              <!-- Project Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background-color: #fff7ed; padding: 16px; border-bottom: 1px solid #fed7aa;">
                    <h3 style="margin: 0; color: #c2410c; font-size: 18px; font-weight: 600;">
                      ${params.projectName}
                    </h3>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 12px; width: 40%;">Client</td>
                        <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 12px;">${params.clientName}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px; padding-bottom: 12px;">Date de début</td>
                        <td style="color: #18181b; font-size: 14px; text-align: right; padding-bottom: 12px;">${formatProjectDate(params.startDate)}</td>
                      </tr>
                      <tr>
                        <td style="color: #71717a; font-size: 14px;">Date de fin</td>
                        <td style="color: #18181b; font-size: 14px; text-align: right;">${formatProjectDate(params.endDate)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${params.projectDescription ? `
              <div style="margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px 0; color: #18181b; font-size: 14px; font-weight: 600;">Description</h4>
                <p style="margin: 0; color: #52525b; font-size: 14px; line-height: 1.6; background-color: #f4f4f5; padding: 12px; border-radius: 6px;">${params.projectDescription}</p>
              </div>
              ` : ''}
              
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.6;">
                Nous vous contacterons prochainement pour les détails de la mission. Pour toute question, n'hésitez pas à nous répondre directement à cet email.
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
    
    console.log(`Vendor project assignment email sent to ${params.to} for project ${params.projectName}`);
    return true;
  } catch (error) {
    console.error('Failed to send vendor project assignment email:', error);
    return false;
  }
}
