import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured } from '../config/env.js';
import { extractDocumentText } from './extractors/index.js';
import { scrapeWebsite } from './webScraperService.js';
import { chunkText } from './chunkingService.js';
import { generateBatchEmbeddings } from './embeddingService.js';
import { vectorStoreService } from './vectorStoreService.js';
import { chatbotService } from './chatbotService.js';
import { storageService } from './storageService.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const SOURCES_FILE = path.join(DATA_DIR, 'knowledge_sources.json');

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Loads persistent sources from disk
 */
async function loadLocalSources() {
  try {
    if (!fs.existsSync(SOURCES_FILE)) {
      await fs.promises.writeFile(SOURCES_FILE, JSON.stringify([]), 'utf-8');
      return [];
    }
    const data = await fs.promises.readFile(SOURCES_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    logger.error('Failed to load local knowledge sources:', err.message);
    return [];
  }
}

/**
 * Saves sources to disk
 */
async function saveLocalSources(sources) {
  try {
    await fs.promises.writeFile(SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to save knowledge sources to disk:', err.message);
    throw err;
  }
}

export const knowledgeService = {
  /**
   * Registers and ingests an uploaded file
   */
  async ingestUploadedFile({ chatbotId, fileBuffer, originalName, mimeType, fileSize }) {
    const chatbot = await chatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      throw new Error(`Chatbot with ID "${chatbotId}" not found.`);
    }

    const sourceId = crypto.randomUUID();
    const ext = path.extname(originalName);

    // Save persistent document file using storage service (Supabase Storage in prod, disk fallback)
    const storageResult = await storageService.uploadDocument({
      fileBuffer,
      filename: originalName,
      mimeType,
      chatbotId,
      userId: chatbot.user_id || 'common'
    });

    const sourceRecord = {
      id: sourceId,
      chatbot_id: chatbotId,
      title: originalName,
      source_type: ext.replace('.', '').toLowerCase(),
      source_url: null,
      file_path: storageResult.storagePath,
      storage_path: storageResult.storagePath,
      storage_type: storageResult.storageType,
      file_size_bytes: fileSize,
      chunk_count: 0,
      status: 'processing',
      raw_content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save initial record
    await this._saveSourceRecord(sourceRecord);

    // Run ingestion pipeline asynchronously in background
    this._processFileInBackground(sourceRecord, fileBuffer, originalName, mimeType).catch(err => {
      logger.error(`Background ingestion failed for ${originalName}:`, err.message);
    });

    return sourceRecord;
  },

  /**
   * Registers and ingests a website URL
   */
  async ingestWebsiteUrl({ chatbotId, url }) {
    const chatbot = await chatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      throw new Error(`Chatbot with ID "${chatbotId}" not found.`);
    }

    const sourceId = crypto.randomUUID();
    const sourceRecord = {
      id: sourceId,
      chatbot_id: chatbotId,
      title: url,
      source_type: 'url',
      source_url: url,
      file_path: null,
      file_size_bytes: 0,
      chunk_count: 0,
      status: 'processing',
      raw_content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Save initial record
    await this._saveSourceRecord(sourceRecord);

    // Run scraper and ingestion pipeline in background
    this._processUrlInBackground(sourceRecord, url).catch(err => {
      logger.error(`Background URL ingestion failed for ${url}:`, err.message);
    });

    return sourceRecord;
  },

  /**
   * Background task: extracts text from file, chunks, embeds, and stores in vector db
   */
  async _processFileInBackground(sourceRecord, buffer, originalName, mimeType) {
    try {
      logger.info(`Starting RAG text extraction for "${originalName}"...`);
      const extraction = await extractDocumentText(buffer, originalName, mimeType);
      const rawText = extraction.text || '';

      if (!rawText.trim()) {
        throw new Error('Document contained no extractable text content.');
      }

      // Chunk the text
      const chunks = chunkText(rawText, {
        metadata: {
          title: originalName,
          sourceType: extraction.sourceType,
          ...extraction.metadata
        }
      });

      logger.info(`Chunked "${originalName}" into ${chunks.length} semantic chunks. Generating embeddings...`);

      // Generate embeddings
      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await generateBatchEmbeddings(chunkTexts);

      const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx]
      }));

      // Store chunks in vector database
      await vectorStoreService.storeChunks(
        sourceRecord.id,
        sourceRecord.chatbot_id,
        chunksWithEmbeddings
      );

      // Update source record status to 'ready'
      sourceRecord.status = 'ready';
      sourceRecord.chunk_count = chunks.length;
      sourceRecord.raw_content = rawText.slice(0, 5000); // store preview
      sourceRecord.updated_at = new Date().toISOString();
      await this._saveSourceRecord(sourceRecord);

      logger.success(`RAG ingestion complete for "${originalName}": ${chunks.length} chunks indexed successfully!`);
    } catch (err) {
      logger.error(`Error processing file "${originalName}":`, err.message);
      sourceRecord.status = 'failed';
      sourceRecord.error_message = err.message;
      sourceRecord.updated_at = new Date().toISOString();
      await this._saveSourceRecord(sourceRecord);
    }
  },

  /**
   * Background task: scrapes website, chunks, embeds, and stores in vector db
   */
  async _processUrlInBackground(sourceRecord, url) {
    try {
      logger.info(`Scraping and processing website URL: ${url}`);
      const scraped = await scrapeWebsite(url);
      const rawText = scraped.text;

      sourceRecord.title = scraped.title || url;

      // Chunk text
      const chunks = chunkText(rawText, {
        metadata: {
          title: sourceRecord.title,
          sourceType: 'url',
          url: scraped.url,
          description: scraped.description
        }
      });

      logger.info(`Chunked web page "${sourceRecord.title}" into ${chunks.length} chunks. Generating embeddings...`);

      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await generateBatchEmbeddings(chunkTexts);

      const chunksWithEmbeddings = chunks.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx]
      }));

      // Store in vector db
      await vectorStoreService.storeChunks(
        sourceRecord.id,
        sourceRecord.chatbot_id,
        chunksWithEmbeddings
      );

      sourceRecord.status = 'ready';
      sourceRecord.chunk_count = chunks.length;
      sourceRecord.file_size_bytes = rawText.length;
      sourceRecord.raw_content = rawText.slice(0, 5000);
      sourceRecord.updated_at = new Date().toISOString();
      await this._saveSourceRecord(sourceRecord);

      logger.success(`Web page "${sourceRecord.title}" indexed: ${chunks.length} chunks ready for similarity search.`);
    } catch (err) {
      logger.error(`Error processing URL "${url}":`, err.message);
      sourceRecord.status = 'failed';
      sourceRecord.error_message = err.message;
      sourceRecord.updated_at = new Date().toISOString();
      await this._saveSourceRecord(sourceRecord);
    }
  },

  /**
   * Reindexes an existing knowledge source
   */
  async reindexSource(sourceId) {
    const source = await this.getSourceById(sourceId);
    if (!source) throw new Error(`Knowledge source with ID "${sourceId}" not found.`);

    source.status = 'processing';
    await this._saveSourceRecord(source);

    if (source.source_type === 'url' && source.source_url) {
      await this._processUrlInBackground(source, source.source_url);
    } else if (source.storage_path || source.file_path) {
      try {
        const buffer = await storageService.getDocumentBuffer(
          source.storage_path || source.file_path,
          source.storage_type || 'local'
        );
        await this._processFileInBackground(source, buffer, source.title, '');
      } catch (err) {
        source.status = 'failed';
        source.error_message = `Failed retrieving document from storage: ${err.message}`;
        await this._saveSourceRecord(source);
        throw err;
      }
    } else {
      source.status = 'failed';
      source.error_message = 'Source file is no longer available in storage for re-indexing.';
      await this._saveSourceRecord(source);
      throw new Error(source.error_message);
    }

    return source;
  },

  /**
   * Deletes a knowledge source and all its associated vector embeddings
   */
  async deleteSource(sourceId) {
    const source = await this.getSourceById(sourceId);
    if (!source) return false;

    // Delete stored file from persistent storage (Supabase or disk)
    if (source.storage_path || source.file_path) {
      await storageService.deleteDocument(
        source.storage_path || source.file_path,
        source.storage_type || 'local'
      );
    }

    // Delete vector chunks
    await vectorStoreService.deleteChunksBySourceId(sourceId);

    // Delete from Supabase or local persistent store
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      await supabase.from('knowledge_sources').delete().eq('id', sourceId);
    } else {
      const sources = await loadLocalSources();
      const filtered = sources.filter(s => s.id !== sourceId);
      await saveLocalSources(filtered);
    }

    logger.info(`Deleted knowledge source and vectors: ${sourceId} (${source.title})`);
    return true;
  },

  /**
   * Retrieves single source by ID
   */
  async getSourceById(sourceId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('id', sourceId)
        .single();
      return data || null;
    }

    const sources = await loadLocalSources();
    return sources.find(s => s.id === sourceId) || null;
  },

  /**
   * Retrieves all knowledge sources for a chatbot
   */
  async listSourcesByChatbotId(chatbotId) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('created_at', { ascending: false });
      return data || [];
    }

    const sources = await loadLocalSources();
    return sources
      .filter(s => s.chatbot_id === chatbotId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * Helper to persist a source record
   */
  async _saveSourceRecord(sourceRecord) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase
        .from('knowledge_sources')
        .upsert(sourceRecord);
      if (error) logger.error('Supabase upsert knowledge_sources error:', error.message);
      return;
    }

    const sources = await loadLocalSources();
    const idx = sources.findIndex(s => s.id === sourceRecord.id);
    if (idx !== -1) {
      sources[idx] = { ...sourceRecord };
    } else {
      sources.unshift({ ...sourceRecord });
    }
    await saveLocalSources(sources);
  }
};
