import { env } from '../config/env.js';

/**
 * Splits text into semantic chunks with sliding overlap
 */
export function chunkText(rawText, options = {}) {
  const chunkSize = options.chunkSize || env.CHUNK_SIZE || 800;
  const chunkOverlap = options.chunkOverlap !== undefined ? options.chunkOverlap : env.CHUNK_OVERLAP || 150;
  const metadata = options.metadata || {};

  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  // Normalize line endings and multiple spaces
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  if (text.length <= chunkSize) {
    return [{
      chunkIndex: 0,
      content: text,
      tokenCount: Math.ceil(text.length / 4),
      startChar: 0,
      endChar: text.length,
      metadata: { ...metadata, chunkIndex: 0 }
    }];
  }

  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex >= text.length) {
      endIndex = text.length;
    } else {
      // Look backward for a natural sentence or paragraph break
      const searchWindow = text.slice(startIndex + Math.floor(chunkSize * 0.7), endIndex);
      const lastParagraph = searchWindow.lastIndexOf('\n\n');
      const lastNewline = searchWindow.lastIndexOf('\n');
      const lastPeriod = searchWindow.lastIndexOf('. ');
      const lastQuestion = searchWindow.lastIndexOf('? ');
      const lastExclamation = searchWindow.lastIndexOf('! ');

      const bestBreak = Math.max(lastParagraph, lastNewline, lastPeriod, lastQuestion, lastExclamation);

      if (bestBreak !== -1) {
        endIndex = startIndex + Math.floor(chunkSize * 0.7) + bestBreak + 1;
      } else {
        // Fallback to breaking at a space to avoid splitting a word in half
        const lastSpace = searchWindow.lastIndexOf(' ');
        if (lastSpace !== -1) {
          endIndex = startIndex + Math.floor(chunkSize * 0.7) + lastSpace + 1;
        }
      }
    }

    const chunkContent = text.slice(startIndex, endIndex).trim();

    if (chunkContent.length > 20) {
      chunks.push({
        chunkIndex,
        content: chunkContent,
        tokenCount: Math.ceil(chunkContent.length / 4),
        startChar: startIndex,
        endChar: endIndex,
        metadata: {
          ...metadata,
          chunkIndex
        }
      });
      chunkIndex++;
    }

    if (endIndex >= text.length) {
      break;
    }

    // Advance by chunkSize - chunkOverlap
    startIndex = Math.max(startIndex + 1, endIndex - chunkOverlap);
  }

  return chunks;
}
