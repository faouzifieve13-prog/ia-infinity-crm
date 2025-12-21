// Document template generator using docxtemplater
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';

export interface ContractTemplateData {
  // Prestataire (IA Infinity)
  prestataireName: string;
  prestataireAddress: string;
  prestataireEmail: string;
  prestataireTelephone: string;
  prestataireSiret: string;
  
  // Client
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone?: string;
  clientSiret?: string;
  
  // Dates
  dateDebut: string;
  dateFin: string;
  dateContrat: string;
  lieu: string;
  
  // Financial
  prixHT: string;
  prixTTC: string;
  tva: string;
  
  // Specific to prestation
  dateRapportAudit?: string;
  outilPlateforme?: string;
  nombreSemaines?: string;
  nomPhase?: string;
  
  // Tribunal
  villeJuridiction: string;
}

export type ContractType = 'audit' | 'prestation';

const DEFAULT_PRESTATAIRE = {
  prestataireName: 'IA Infinity',
  prestataireAddress: '123 Avenue de l\'Innovation, 75008 Paris',
  prestataireEmail: 'contact@i-a-infinity.com',
  prestataireTelephone: '+33 1 23 45 67 89',
  prestataireSiret: '123 456 789 00012',
  villeJuridiction: 'Paris',
};

function formatPrice(amount: string | number): { ht: string; ttc: string } {
  const amountNum = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const ttc = amountNum * 1.2;
  return {
    ht: amountNum.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    ttc: ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function prepareContractData(
  contractType: ContractType,
  data: Partial<ContractTemplateData> & { amount?: string | number }
): ContractTemplateData {
  const prices = formatPrice(data.amount || 0);
  
  const today = new Date();
  const startDate = data.dateDebut ? new Date(data.dateDebut) : new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDate = data.dateFin ? new Date(data.dateFin) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  return {
    ...DEFAULT_PRESTATAIRE,
    clientName: data.clientName || '[Nom du Client]',
    clientCompany: data.clientCompany || '[Nom de l\'Entreprise]',
    clientAddress: data.clientAddress || '[Adresse de l\'Entreprise]',
    clientEmail: data.clientEmail || '[E-mail du Client]',
    clientPhone: data.clientPhone || '[Téléphone du Client]',
    clientSiret: data.clientSiret || '[SIRET du Client]',
    dateDebut: formatDate(startDate),
    dateFin: formatDate(endDate),
    dateContrat: formatDate(today),
    lieu: data.lieu || 'Paris',
    prixHT: prices.ht,
    prixTTC: prices.ttc,
    tva: '20',
    dateRapportAudit: data.dateRapportAudit || formatDate(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)),
    outilPlateforme: data.outilPlateforme || 'Make / n8n / Zapier',
    nombreSemaines: data.nombreSemaines || '4',
    nomPhase: data.nomPhase || 'Phase de test',
    ...data,
  };
}

export async function generateContractDocx(
  contractType: ContractType,
  templateData: ContractTemplateData
): Promise<Buffer> {
  const templatePath = path.join(
    process.cwd(),
    'server',
    'templates',
    contractType === 'audit' ? 'contrat_audit.docx' : 'contrat_prestation.docx'
  );
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}`);
  }
  
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    // Using single braces to match standard Word template format
    delimiters: { start: '{', end: '}' },
  });
  
  // Map template data to placeholder names used in the documents
  // Using {{ }} syntax for clarity (can be customized for actual template format)
  const placeholders: Record<string, string> = {
    // Prestataire
    prestataireName: templateData.prestataireName,
    prestataireAddress: templateData.prestataireAddress,
    prestataireEmail: templateData.prestataireEmail,
    prestataireTelephone: templateData.prestataireTelephone,
    prestataireSiret: templateData.prestataireSiret,
    villeJuridiction: templateData.villeJuridiction,
    
    // Client
    clientName: templateData.clientName,
    clientCompany: templateData.clientCompany,
    clientAddress: templateData.clientAddress,
    clientEmail: templateData.clientEmail,
    clientPhone: templateData.clientPhone || '',
    clientSiret: templateData.clientSiret || '',
    
    // Dates
    dateDebut: templateData.dateDebut,
    dateFin: templateData.dateFin,
    dateContrat: templateData.dateContrat,
    lieu: templateData.lieu,
    
    // Financial
    prixHT: templateData.prixHT,
    prixTTC: templateData.prixTTC,
    tva: templateData.tva,
    
    // Specific fields for prestation
    dateRapportAudit: templateData.dateRapportAudit || '',
    outilPlateforme: templateData.outilPlateforme || '',
    nombreSemaines: templateData.nombreSemaines || '',
    nomPhase: templateData.nomPhase || '',
  };
  
  try {
    doc.render(placeholders);
  } catch (error: any) {
    // If template rendering fails (placeholders not in the expected format),
    // log warning but continue - the original text will remain
    console.warn('Template rendering warning:', error.message);
  }
  
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });
  
  return buf;
}

export async function getContractTemplateInfo(contractType: ContractType): Promise<{
  name: string;
  description: string;
  editableFields: Array<{ key: string; label: string; type: 'text' | 'date' | 'number' | 'textarea' }>;
}> {
  const commonFields = [
    { key: 'clientName', label: 'Nom du client (Prénom Nom)', type: 'text' as const },
    { key: 'clientCompany', label: 'Nom de l\'entreprise', type: 'text' as const },
    { key: 'clientAddress', label: 'Adresse', type: 'textarea' as const },
    { key: 'clientEmail', label: 'Email', type: 'text' as const },
    { key: 'clientPhone', label: 'Téléphone', type: 'text' as const },
    { key: 'clientSiret', label: 'SIREN / SIRET', type: 'text' as const },
    { key: 'dateDebut', label: 'Date de début', type: 'date' as const },
    { key: 'dateFin', label: 'Date de fin', type: 'date' as const },
    { key: 'amount', label: 'Montant HT (€)', type: 'number' as const },
    { key: 'lieu', label: 'Lieu de signature', type: 'text' as const },
  ];
  
  if (contractType === 'audit') {
    return {
      name: 'Contrat d\'Audit Général',
      description: 'Contrat pour la réalisation d\'un audit général de la structure organisationnelle et des processus internes.',
      editableFields: commonFields,
    };
  }
  
  return {
    name: 'Contrat de Prestation d\'Automatisation',
    description: 'Contrat pour la mise en œuvre de solutions d\'automatisation suite à un audit.',
    editableFields: [
      ...commonFields,
      { key: 'dateRapportAudit', label: 'Date du rapport d\'audit', type: 'date' as const },
      { key: 'outilPlateforme', label: 'Outil/Plateforme', type: 'text' as const },
      { key: 'nombreSemaines', label: 'Durée (semaines)', type: 'number' as const },
      { key: 'nomPhase', label: 'Nom de la phase intermédiaire', type: 'text' as const },
    ],
  };
}
