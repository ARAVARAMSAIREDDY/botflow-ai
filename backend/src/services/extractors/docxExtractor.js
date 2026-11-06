import mammoth from 'mammoth';
import { logger } from '../../utils/logger.js';

export async function extractDocxText(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value || '',
      messages: result.messages || []
    };
  } catch (err) {
    logger.error('DOCX text extraction error:', err.message);
    throw new Error(`Failed to parse DOCX document: ${err.message}`);
  }
}
