import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured, env } from '../config/env.js';
import { cosineSimilarity } from './embeddingService.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const CHUNKS_FILE = path.join(DATA_DIR, 'document_chunks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Loads persistent chunks from disk (for local persistent mode)
 */
async function loadLocalChunks() {
  try {
    if (!fs.existsSync(CHUNKS_FILE)) {
      await fs.promises.writeFile(CHUNKS_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(CHUNKS_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local document chunks:', err.message);
    return [];
  }
}

/**
 * Saves chunks to disk persistently
 */
async function saveLocalChunks(chunks) {
  try {
    await fs.promises.writeFile(CHUNKS_FILE, JSON.stringify(chunks, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save document chunks persistently:', err.message);
    throw err;
  }
}

export const vectorStoreService = {
  /**
   * Stores document chunks with their embeddings
   */
  async storeChunks(knowledgeSourceId, chatbotId, chunksWithEmbeddings) {
    const records = chunksWithEmbeddings.map((chunk) => ({
      id: crypto.randomUUID(),
      knowledge_source_id: knowledgeSourceId,
      chatbot_id: chatbotId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      token_count: chunk.tokenCount || Math.ceil(chunk.content.length / 4),
      embedding: chunk.embedding,
      metadata: chunk.metadata || {},
      created_at: new Date().toISOString()
    }));

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('document_chunks')
        .insert(records)
        .select('id, chunk_index');

      if (error) {
        logger.error('Supabase storeChunks error:', error.message);
        throw error;
      }
      return data;
    }

    // Local persistent storage
    const allChunks = await loadLocalChunks();
    // Remove existing chunks for this source if reindexing
    const filtered = allChunks.filter(c => c.knowledge_source_id !== knowledgeSourceId);
    filtered.push(...records);
    await saveLocalChunks(filtered);

    logger.info(`Persisted ${records.length} vector chunks to disk for source ${knowledgeSourceId}`);
    return records;
  },

  /**
   * Semantic vector search filtered strictly by chatbot_id
   */
  async searchSimilarChunks({
    chatbotId,
    queryEmbedding,
    topK = env.SIMILARITY_TOP_K || 4,
    threshold = env.SIMILARITY_MATCH_THRESHOLD || 0.35
  }) {
    const supabase = getSupabaseClient();

    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.rpc('match_document_chunks', {
          query_embedding: queryEmbedding,
          filter_chatbot_id: chatbotId,
          match_threshold: threshold,
          match_count: topK
        });

        if (error) {
          logger.error('Supabase match_document_chunks RPC error:', error.message);
          throw error;
        }

        return (data || []).map(item => ({
          id: item.id,
          sourceId: item.knowledge_source_id,
          chatbotId: item.chatbot_id,
          chunkIndex: item.chunk_index,
          content: item.content,
          metadata: item.metadata,
          similarity: parseFloat(item.similarity.toFixed(4))
        }));
      } catch (err) {
        logger.warn('Falling back to local persistent similarity search:', err.message);
      }
    }

    // Local persistent vector search
    const allChunks = await loadLocalChunks();
    // STRICT TENANT ISOLATION: filter only by chatbot_id
    const botChunks = allChunks.filter(c => c.chatbot_id === chatbotId);

    const scored = [];
    for (const chunk of botChunks) {
      if (!chunk.embedding || !Array.isArray(chunk.embedding)) continue;
      const sim = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (sim >= threshold) {
        scored.push({
          id: chunk.id,
          sourceId: chunk.knowledge_source_id,
          chatbotId: chunk.chatbot_id,
          chunkIndex: chunk.chunk_index,
          content: chunk.content,
          metadata: chunk.metadata,
          similarity: parseFloat(sim.toFixed(4))
        });
      }
    }

    // Sort by similarity descending and pick topK
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  },

  /**
   * Deletes all chunks associated with a knowledge source
   */
  async deleteChunksBySourceId(sourceId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .eq('knowledge_source_id', sourceId);

      if (error) logger.error('Supabase deleteChunksBySourceId error:', error.message);
      return;
    }

    const allChunks = await loadLocalChunks();
    const filtered = allChunks.filter(c => c.knowledge_source_id !== sourceId);
    await saveLocalChunks(filtered);
  },

  /**
   * Deletes all chunks associated with a chatbot
   */
  async deleteChunksByChatbotId(chatbotId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase
        .from('document_chunks')
        .delete()
        .eq('chatbot_id', chatbotId);
      return;
    }

    const allChunks = await loadLocalChunks();
    const filtered = allChunks.filter(c => c.chatbot_id !== chatbotId);
    await saveLocalChunks(filtered);
  },

  /**
   * Retrieves chunks for a specific source
   */
  async getChunksBySourceId(sourceId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('document_chunks')
        .select('id, chunk_index, content, token_count, metadata, created_at')
        .eq('knowledge_source_id', sourceId)
        .order('chunk_index', { ascending: true });

      return data || [];
    }

    const allChunks = await loadLocalChunks();
    return allChunks
      .filter(c => c.knowledge_source_id === sourceId)
      .map(({ embedding, ...rest }) => rest);
  },

  /**
   * Returns vector stats for a chatbot
   */
  async getChatbotStats(chatbotId) {
    const allChunks = await loadLocalChunks();
    const botChunks = allChunks.filter(c => c.chatbot_id === chatbotId);
    const uniqueSources = new Set(botChunks.map(c => c.knowledge_source_id));

    return {
      indexedSources: uniqueSources.size,
      indexedChunks: botChunks.length
    };
  }
};
