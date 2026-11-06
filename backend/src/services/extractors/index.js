import path from 'path';
import { extractPdfText } from './pdfExtractor.js';
import { extractDocxText } from './docxExtractor.js';
import { extractCsvText } from './csvExtractor.js';
import { extractTxtText } from './txtExtractor.js';

export async function extractDocumentText(buffer, filename, mimetype = '') {
  const ext = path.extname(filename).toLowerCase().replace('.', '');

  switch (ext) {
    case 'pdf': {
      // Basic magic bytes check: %PDF
      if (buffer.length >= 4 && buffer.toString('utf-8', 0, 4) !== '%PDF') {
        throw new Error('File has .pdf extension but does not contain valid PDF header.');
      }
      const res = await extractPdfText(buffer);
      return {
        text: res.text,
        sourceType: 'pdf',
        metadata: { pageCount: res.pageCount }
      };
    }
    case 'docx': {
      // DOCX files are zip archives starting with PK (0x50, 0x4B)
      if (buffer.length >= 2 && !(buffer[0] === 0x50 && buffer[1] === 0x4b)) {
        throw new Error('File has .docx extension but does not contain valid Office XML archive header.');
      }
      const res = await extractDocxText(buffer);
      return {
        text: res.text,
        sourceType: 'docx',
        metadata: {}
      };
    }
    case 'csv': {
      const res = await extractCsvText(buffer);
      return {
        text: res.text,
        sourceType: 'csv',
        metadata: { rowCount: res.rowCount, headers: res.headers }
      };
    }
    case 'txt':
    case 'text':
    case 'md': {
      const res = await extractTxtText(buffer);
      return {
        text: res.text,
        sourceType: 'text',
        metadata: { charCount: res.charCount }
      };
    }
    default:
      throw new Error(`Unsupported document extension "${ext}". Supported formats: PDF, DOCX, CSV, TXT.`);
  }
}
