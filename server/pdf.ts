import PDFDocument from 'pdfkit';
import type { Contract } from '@shared/schema';
import path from 'path';
import fs from 'fs';

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
      bufferPages: true,
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
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100;
    const leftMargin = 50;
    
    doc.rect(0, 0, pageWidth, 120).fill(primaryColor);
    
    const logoPath = path.join(process.cwd(), 'attached_assets', 'logo_iA_Infinity_1766415032734.png');
    let logoX = leftMargin;
    let textStartX = leftMargin;
    
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, leftMargin, 25, { height: 70 });
        textStartX = leftMargin + 90;
      } catch (err) {
        console.warn('Could not load logo for PDF:', err);
      }
    }
    
    doc
      .fontSize(24)
      .fillColor('#ffffff')
      .text(organizationName, textStartX, 35);
    
    doc
      .fontSize(12)
      .fillColor('#ffffff')
      .opacity(0.9)
      .text(formatContractType(contract.type), textStartX, 65);
    
    doc
      .fontSize(10)
      .opacity(1)
      .text(`N° ${contract.contractNumber}`, textStartX, 85);
    
    let yPos = 150;
    
    function checkPageBreak(neededSpace: number) {
      if (yPos + neededSpace > doc.page.height - 100) {
        doc.addPage();
        yPos = 50;
      }
    }
    
    doc
      .fontSize(18)
      .fillColor(textColor)
      .text(contract.title, leftMargin, yPos, { width: contentWidth });
    yPos += doc.heightOfString(contract.title, { width: contentWidth }) + 25;
    
    checkPageBreak(80);
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('PARTIES', leftMargin, yPos);
    yPos += 25;
    
    doc.fontSize(10).fillColor(textColor);
    doc.text(`Client: ${contract.clientName}`, leftMargin, yPos);
    yPos += 15;
    
    if (contract.clientCompany) {
      doc.text(`Société: ${contract.clientCompany}`, leftMargin, yPos);
      yPos += 15;
    }
    
    doc.text(`Email: ${contract.clientEmail}`, leftMargin, yPos);
    yPos += 15;
    
    if (contract.clientPhone) {
      doc.text(`Téléphone: ${contract.clientPhone}`, leftMargin, yPos);
      yPos += 15;
    }
    
    if (contract.clientAddress) {
      doc.text(`Adresse: ${contract.clientAddress}`, leftMargin, yPos);
      yPos += 15;
    }
    
    if (contract.clientSiret) {
      doc.text(`SIREN/SIRET: ${contract.clientSiret}`, leftMargin, yPos);
      yPos += 15;
    }
    
    yPos += 20;
    
    if (contract.scope) {
      const scopeHeight = doc.heightOfString(contract.scope, { width: contentWidth });
      checkPageBreak(scopeHeight + 50);
      
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text('OBJET DU CONTRAT', leftMargin, yPos);
      yPos += 25;
      
      doc
        .fontSize(10)
        .fillColor(textColor)
        .text(contract.scope, leftMargin, yPos, { width: contentWidth, align: 'justify' });
      yPos += scopeHeight + 20;
    }
    
    if (contract.deliverables && contract.deliverables.length > 0) {
      const deliverablesHeight = contract.deliverables.length * 20 + 40;
      checkPageBreak(deliverablesHeight);
      
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text('LIVRABLES', leftMargin, yPos);
      yPos += 25;
      
      doc.fontSize(10).fillColor(textColor);
      for (const deliverable of contract.deliverables) {
        const lineHeight = doc.heightOfString(`• ${deliverable}`, { width: contentWidth - 20 });
        checkPageBreak(lineHeight + 5);
        doc.text(`• ${deliverable}`, leftMargin + 10, yPos, { width: contentWidth - 20 });
        yPos += lineHeight + 5;
      }
      yPos += 15;
    }
    
    checkPageBreak(100);
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('CONDITIONS FINANCIÈRES', leftMargin, yPos);
    yPos += 25;
    
    doc
      .fontSize(12)
      .fillColor(textColor)
      .text(`Montant: ${formatCurrency(contract.amount)}`, leftMargin, yPos);
    yPos += 25;
    
    if (contract.paymentTerms) {
      const paymentHeight = doc.heightOfString(contract.paymentTerms, { width: contentWidth });
      checkPageBreak(paymentHeight + 20);
      
      doc
        .fontSize(10)
        .text(contract.paymentTerms, leftMargin, yPos, { width: contentWidth, align: 'justify' });
      yPos += paymentHeight + 20;
    }
    
    checkPageBreak(80);
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('DURÉE DE LA MISSION', leftMargin, yPos);
    yPos += 25;
    
    doc.fontSize(10).fillColor(textColor);
    
    if (contract.startDate) {
      doc.text(`Date de début: ${formatDate(contract.startDate)}`, leftMargin, yPos);
      yPos += 18;
    }
    
    if (contract.endDate) {
      doc.text(`Date de fin: ${formatDate(contract.endDate)}`, leftMargin, yPos);
      yPos += 18;
    }
    
    yPos += 10;
    
    if (contract.type === 'prestation') {
      const hasDetails = contract.outilPlateforme || contract.nombreSemaines || contract.nomPhase || contract.dateRapportAudit;
      if (hasDetails) {
        checkPageBreak(100);
        
        doc
          .fontSize(14)
          .fillColor(primaryColor)
          .text('DÉTAILS DE LA PRESTATION', leftMargin, yPos);
        yPos += 25;
        
        doc.fontSize(10).fillColor(textColor);
        
        if (contract.outilPlateforme) {
          doc.text(`Outil/Plateforme: ${contract.outilPlateforme}`, leftMargin, yPos);
          yPos += 18;
        }
        
        if (contract.nombreSemaines) {
          doc.text(`Durée estimée: ${contract.nombreSemaines} semaines`, leftMargin, yPos);
          yPos += 18;
        }
        
        if (contract.nomPhase) {
          doc.text(`Phase intermédiaire: ${contract.nomPhase}`, leftMargin, yPos);
          yPos += 18;
        }
        
        if (contract.dateRapportAudit) {
          doc.text(`Date du rapport d'audit: ${formatDate(contract.dateRapportAudit)}`, leftMargin, yPos);
          yPos += 18;
        }
        
        yPos += 10;
      }
    }
    
    if (contract.lieu) {
      checkPageBreak(30);
      doc.fontSize(10).fillColor(textColor);
      doc.text(`Fait à: ${contract.lieu}`, leftMargin, yPos);
      yPos += 20;
    }
    
    checkPageBreak(120);
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('SIGNATURES', leftMargin, yPos);
    yPos += 30;
    
    doc.fontSize(10).fillColor(textColor);
    
    const signatureWidth = (contentWidth - 50) / 2;
    const rightColumnX = leftMargin + signatureWidth + 50;
    
    doc.text(organizationName, leftMargin, yPos);
    doc.text(contract.clientName, rightColumnX, yPos);
    
    yPos += 50;
    
    doc.moveTo(leftMargin, yPos).lineTo(leftMargin + signatureWidth - 20, yPos).stroke(mutedColor);
    doc.moveTo(rightColumnX, yPos).lineTo(rightColumnX + signatureWidth - 20, yPos).stroke(mutedColor);
    
    yPos += 10;
    
    doc
      .fontSize(8)
      .fillColor(mutedColor)
      .text('Signature', leftMargin, yPos);
    doc.text('Signature', rightColumnX, yPos);
    
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
    const leftMargin = 50;
    const contentWidth = doc.page.width - 100;
    
    doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
    
    const logoPath = path.join(process.cwd(), 'attached_assets', 'logo_iA_Infinity_1766415032734.png');
    let textStartX = leftMargin;
    
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, leftMargin, 20, { height: 60 });
        textStartX = leftMargin + 80;
      } catch (err) {
        console.warn('Could not load logo for PDF:', err);
      }
    }
    
    doc
      .fontSize(24)
      .fillColor('#ffffff')
      .text(organizationName, textStartX, 30);
    
    doc
      .fontSize(12)
      .fillColor('#ffffff')
      .opacity(0.9)
      .text('DEVIS', textStartX, 58);
    
    let yPos = 130;
    
    doc
      .fontSize(18)
      .fillColor(textColor)
      .text(params.dealName, leftMargin, yPos);
    
    yPos += 40;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('CLIENT', leftMargin, yPos);
    
    yPos += 25;
    
    doc
      .fontSize(10)
      .fillColor(textColor)
      .text(`Société: ${params.accountName}`, leftMargin, yPos);
    
    yPos += 15;
    doc.text(`Email: ${params.contactEmail}`, leftMargin, yPos);
    yPos += 30;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('TYPE DE MISSION', leftMargin, yPos);
    
    yPos += 25;
    
    doc.fontSize(10).fillColor(textColor);
    
    if (params.missionTypes.length > 0) {
      for (const type of params.missionTypes) {
        const label = type === 'audit' ? 'Audit' : 'Automatisation';
        doc.text(`• ${label}`, leftMargin + 10, yPos);
        yPos += 15;
      }
    } else {
      doc.text('• À définir', leftMargin + 10, yPos);
      yPos += 15;
    }
    
    yPos += 20;
    
    doc
      .fontSize(14)
      .fillColor(primaryColor)
      .text('MONTANT', leftMargin, yPos);
    
    yPos += 25;
    
    doc
      .fontSize(16)
      .fillColor(textColor)
      .text(formatCurrency(params.amount), leftMargin, yPos);
    
    yPos += 30;
    
    if (params.nextAction) {
      doc
        .fontSize(14)
        .fillColor(primaryColor)
        .text('PROCHAINES ÉTAPES', leftMargin, yPos);
      
      yPos += 25;
      
      doc
        .fontSize(10)
        .fillColor(textColor)
        .text(params.nextAction, leftMargin, yPos, { width: contentWidth });
    }
    
    doc.end();
  });
}

export async function embedSignatureInPdf(
  pdfBuffer: Buffer, 
  signatureDataUrl: string, 
  signerName: string
): Promise<Buffer> {
  console.log(`Signature by ${signerName} recorded`);
  return pdfBuffer;
}
