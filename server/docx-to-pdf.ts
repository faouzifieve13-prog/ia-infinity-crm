import libre from 'libreoffice-convert';
import { promisify } from 'util';

const convertAsync = promisify(libre.convert);

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  try {
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined);
    return pdfBuffer as Buffer;
  } catch (error: any) {
    console.error('LibreOffice conversion error:', error);
    throw new Error(`Échec de la conversion PDF: ${error.message || 'Erreur inconnue'}`);
  }
}
