import * as pdfModule from 'pdf-parse';
import { logger } from '../../utils/logger.js';

export async function extractPdfText(buffer) {
  try {
    // 1. Check for class-based PDFParse (v2.x+)
    if (pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      await parser.load();
      const textResult = await parser.getText();
      const text = typeof textResult === 'string' ? textResult : (textResult.text || '');
      const info = typeof parser.getInfo === 'function' ? await parser.getInfo() : {};
      
      return {
        text: text.trim(),
        pageCount: (info && info.pages) || 1,
        info
      };
    }

    // 2. Fallback to function-based pdfParse (v1.x)
    const fn = pdfModule.default || pdfModule;
    if (typeof fn === 'function') {
      const data = await fn(buffer);
      return {
        text: (data.text || '').trim(),
        pageCount: data.numpages || 1,
        info: data.info || {}
      };
    }

    throw new Error('No valid PDF parser found in pdf-parse module.');
  } catch (err) {
    logger.error('PDF text extraction error:', err.message);
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  }
}
