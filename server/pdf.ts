import PDFDocument from 'pdfkit';
import type { Contract } from '@shared/schema';

export interface ContractPDFParams {
  contract: Contract;
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

function formatDate(date: Date | string | null): string {
  if (!date) return 'Non définie';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(d);
}

function formatCurrency(amount: string): string {
  const num = parseFloat(amount);
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(num);
}

export async function generateContractPDF(params: ContractPDFParams): Promise<Buffer> {
  const { contract, organizationName = 'IA Infinity' } = params;
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: contract.title,
        Author: organizationName,
        Subject: `${formatContractType(contract.type)} - ${contract.contractNumber}`,
      }
    });
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    const primaryColor = '#3b82f6';
    const textColor = '#18181b';
    const mutedColor = '#71717a';
    
    doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
    
    doc
      .fontSize(24)
      .fillColor('#ffffff')
      .text(organizationName, 50, 40);
    
    doc
      .fontSize(12)
      .fillColor('#ffffff')
      .opacity(0.9)
      .text(formatContractType(contract.type), 50, 75);
    
    doc
      .fontSize(10)
      .opacity(1)
      .text(`N° ${contract.contractNumber}`, 50, 95);
    
    let yPos = 150;
    
    doc
      .fontSize(18)
      .fillColor(textColor)
      .text(contract.title, 50, yPos);
    
    yPos += 40;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('PARTIES', 50, yPos);
    
    yPos += 25;
    
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text(`Client: ${contract.clientName}`, 50, yPos);
    
    yPos += 15;
    if (contract.clientCompany) {
      doc.text(`Société: ${contract.clientCompany}`, 50, yPos);
      yPos += 15;
    }
    
    doc.text(`Email: ${contract.clientEmail}`, 50, yPos);
    yPos += 15;
    
    if (contract.clientAddress) {
      doc.text(`Adresse: ${contract.clientAddress}`, 50, yPos);
      yPos += 15;
    }
    
    if (contract.clientSiret) {
      doc.text(`SIRET: ${contract.clientSiret}`, 50, yPos);
      yPos += 15;
    }
    
    yPos += 20;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('OBJET DU CONTRAT', 50, yPos);
    
    yPos += 25;
    
    if (contract.scope) {
      doc
        .fontSize(10)
        .fillColor(textColor)
        .text(contract.scope, 50, yPos, { width: 495, align: 'justify' });
      yPos += doc.heightOfString(contract.scope, { width: 495 }) + 20;
    }
    
    if (contract.description) {
      doc.text(contract.description, 50, yPos, { width: 495, align: 'justify' });
      yPos += doc.heightOfString(contract.description, { width: 495 }) + 20;
    }
    
    if (contract.deliverables && contract.deliverables.length > 0) {
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text('LIVRABLES', 50, yPos);
      
      yPos += 25;
      
      doc.fontSize(10).fillColor(textColor);
      for (const deliverable of contract.deliverables) {
        doc.text(`• ${deliverable}`, 60, yPos);
        yPos += 15;
      }
      yPos += 10;
    }
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('CONDITIONS FINANCIÈRES', 50, yPos);
    
    yPos += 25;
    
    doc
      .fontSize(12)
      .fillColor(textColor)
      .text(`Montant: ${formatCurrency(contract.amount)}`, 50, yPos);
    
    yPos += 20;
    
    if (contract.paymentTerms) {
      doc
        .fontSize(10)
        .text(`Conditions de paiement: ${contract.paymentTerms}`, 50, yPos);
      yPos += 20;
    }
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('DURÉE', 50, yPos);
    
    yPos += 25;
    
    doc.fontSize(10).fillColor(textColor);
    
    if (contract.startDate) {
      doc.text(`Date de début: ${formatDate(contract.startDate)}`, 50, yPos);
      yPos += 15;
    }
    
    if (contract.endDate) {
      doc.text(`Date de fin: ${formatDate(contract.endDate)}`, 50, yPos);
      yPos += 15;
    }
    
    // Prestation-specific fields
    if (contract.type === 'prestation') {
      yPos += 20;
      
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text('DÉTAILS DE LA PRESTATION', 50, yPos);
      
      yPos += 25;
      
      doc.fontSize(10).fillColor(textColor);
      
      if (contract.outilPlateforme) {
        doc.text(`Outil/Plateforme: ${contract.outilPlateforme}`, 50, yPos);
        yPos += 15;
      }
      
      if (contract.nombreSemaines) {
        doc.text(`Durée estimée: ${contract.nombreSemaines} semaines`, 50, yPos);
        yPos += 15;
      }
      
      if (contract.nomPhase) {
        doc.text(`Phase intermédiaire: ${contract.nomPhase}`, 50, yPos);
        yPos += 15;
      }
      
      if (contract.dateRapportAudit) {
        doc.text(`Date du rapport d'audit: ${formatDate(contract.dateRapportAudit)}`, 50, yPos);
        yPos += 15;
      }
    }
    
    // Lieu de signature
    if (contract.lieu) {
      yPos += 10;
      doc.text(`Fait à: ${contract.lieu}`, 50, yPos);
      yPos += 15;
    }
    
    yPos = doc.page.height - 150;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('SIGNATURES', 50, yPos);
    
    yPos += 30;
    
    doc.fontSize(10).fillColor(textColor);
    
    doc.text(`${organizationName}`, 50, yPos);
    doc.text(`${contract.clientName}`, 300, yPos);
    
    yPos += 50;
    
    doc.moveTo(50, yPos).lineTo(200, yPos).stroke(mutedColor);
    doc.moveTo(300, yPos).lineTo(450, yPos).stroke(mutedColor);
    
    yPos += 10;
    
    doc
      .fontSize(8)
      .fillColor(mutedColor)
      .text('Signature', 50, yPos);
    doc.text('Signature', 300, yPos);
    
    doc.end();
  });
}

export interface QuotePDFParams {
  dealName: string;
  accountName: string;
  contactEmail: string;
  amount: string;
  probability: number;
  missionTypes: string[];
  nextAction?: string | null;
  organizationName?: string;
}

export async function generateQuotePDF(params: QuotePDFParams): Promise<Buffer> {
  const { organizationName = 'IA Infinity' } = params;
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 50,
      info: {
        Title: `Devis - ${params.dealName}`,
        Author: organizationName,
      }
    });
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    const primaryColor = '#3b82f6';
    const textColor = '#18181b';
    
    doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
    
    doc
      .fontSize(24)
      .fillColor('#ffffff')
      .text(organizationName, 50, 35);
    
    doc
      .fontSize(12)
      .fillColor('#ffffff')
      .opacity(0.9)
      .text('DEVIS', 50, 65);
    
    let yPos = 130;
    
    doc
      .fontSize(18)
      .fillColor(textColor)
      .text(params.dealName, 50, yPos);
    
    yPos += 40;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('CLIENT', 50, yPos);
    
    yPos += 25;
    
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text(`Société: ${params.accountName}`, 50, yPos);
    
    yPos += 15;
    doc.text(`Email: ${params.contactEmail}`, 50, yPos);
    yPos += 30;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('TYPE DE MISSION', 50, yPos);
    
    yPos += 25;
    
    doc.fontSize(10).fillColor(textColor);
    
    if (params.missionTypes.length > 0) {
      for (const type of params.missionTypes) {
        const label = type === 'audit' ? 'Audit' : 'Automatisation';
        doc.text(`• ${label}`, 60, yPos);
        yPos += 15;
      }
    } else {
      doc.text('• À définir', 60, yPos);
      yPos += 15;
    }
    
    yPos += 20;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('MONTANT', 50, yPos);
    
    yPos += 25;
    
    doc
      .fontSize(16)
      .fillColor(textColor)
      .text(formatCurrency(params.amount), 50, yPos);
    
    yPos += 30;
    
    if (params.nextAction) {
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text('PROCHAINES ÉTAPES', 50, yPos);
      
      yPos += 25;
      
      doc
        .fontSize(10)
        .fillColor(textColor)
        .text(params.nextAction, 50, yPos, { width: 495 });
    }
    
    doc.end();
  });
}
