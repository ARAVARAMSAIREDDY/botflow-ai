import { getOpenAIClient } from '../config/openai.js';
import { env, isOpenAIConfigured } from '../config/env.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Computes cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generates deterministic 1536-dimensional pseudo-semantic embedding for offline/sandbox mode
 */
function generateDeterministicEmbedding(text) {
  const dimensions = 1536;
  const vector = new Float32Array(dimensions);
  const normalized = text.toLowerCase().trim();

  // Token-level features
  const words = normalized.split(/\W+/).filter(w => w.length > 1);
  for (const word of words) {
    // Generate two hash seeds per word
    const hash1 = crypto.createHash('md5').update(word).digest();
    const hash2 = crypto.createHash('sha256').update(word).digest();

    for (let i = 0; i < 16; i++) {
      const idx1 = (hash1[i] * 31 + i) % dimensions;
      const idx2 = (hash2[i] * 17 + i * 2) % dimensions;
      vector[idx1] += 1.0;
      vector[idx2] += 0.8;
    }
  }

  // Character 3-grams for subword matching (e.g., "admissions" vs "admission")
  for (let i = 0; i < normalized.length - 2; i++) {
    const gram = normalized.slice(i, i + 3);
    const hash = crypto.createHash('md5').update(gram).digest();
    const idx = (hash[0] * 256 + hash[1]) % dimensions;
    vector[idx] += 0.3;
  }

  // L2 Normalize vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return Array.from(vector);
}

/**
 * Generates an embedding for a single text string
 */
export async function generateEmbedding(text) {
  const client = getOpenAIClient();

  if (!client || !isOpenAIConfigured()) {
    return generateDeterministicEmbedding(text);
  }

  try {
    const response = await client.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: text
    });

    return response.data[0].embedding;
  } catch (err) {
    logger.warn(`OpenAI embedding failed (${err.message}). Using local deterministic embedding fallback.`);
    return generateDeterministicEmbedding(text);
  }
}

/**
 * Generates embeddings for an array of texts in batches
 */
export async function generateBatchEmbeddings(textArray) {
  const client = getOpenAIClient();

  if (!client || !isOpenAIConfigured()) {
    return textArray.map(t => generateDeterministicEmbedding(t));
  }

  try {
    // OpenAI supports batch embedding up to 2048 inputs per request
    const response = await client.embeddings.create({
      model: env.OPENAI_EMBEDDING_MODEL,
      input: textArray
    });

    return response.data.map(item => item.embedding);
  } catch (err) {
    logger.warn(`Batch embedding API call failed (${err.message}). Falling back to local embeddings.`);
    return textArray.map(t => generateDeterministicEmbedding(t));
  }
}
