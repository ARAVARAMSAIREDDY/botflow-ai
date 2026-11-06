import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseClient } from '../config/supabase.js';
import { isSupabaseConfigured } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const BUCKET_NAME = 'botflow-documents';

export const storageService = {
  /**
   * Uploads a document buffer to persistent storage (Supabase Storage in production, or local disk fallback)
   */
  async uploadDocument({ fileBuffer, filename, mimeType, chatbotId, userId = 'common' }) {
    const ext = path.extname(filename);
    const sanitizedBase = path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${userId}/${chatbotId}/${Date.now()}_${sanitizedBase}${ext}`;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            upsert: true
          });

        if (error) {
          logger.warn(`Supabase Storage upload warning (falling back to disk): ${error.message}`);
        } else {
          logger.success(`Document uploaded to Supabase Storage: ${BUCKET_NAME}/${storagePath}`);
          return {
            storageType: 'supabase',
            bucket: BUCKET_NAME,
            storagePath: data?.path || storagePath,
            fileUrl: `${BUCKET_NAME}/${storagePath}`
          };
        }
      } catch (err) {
        logger.warn(`Supabase Storage connection failed, falling back to disk: ${err.message}`);
      }
    }

    // Local persistent disk storage fallback
    const localFilename = `${Date.now()}_${sanitizedBase}${ext}`;
    const localFilePath = path.join(UPLOADS_DIR, localFilename);
    await fs.promises.writeFile(localFilePath, fileBuffer);

    return {
      storageType: 'local',
      bucket: 'local-uploads',
      storagePath: localFilePath,
      fileUrl: `/uploads/${localFilename}`
    };
  },

  /**
   * Retrieves a document buffer from storage
   */
  async getDocumentBuffer(storagePath, storageType = 'local') {
    if (storageType === 'supabase') {
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured()) {
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .download(storagePath);

        if (error) throw error;
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    }

    // Local file retrieval
    if (fs.existsSync(storagePath)) {
      return await fs.promises.readFile(storagePath);
    }
    throw new Error(`Document file not found at path: ${storagePath}`);
  },

  /**
   * Generates a temporary signed URL for client download (expires in 1 hour)
   */
  async getSignedUrl(storagePath, expiresInSeconds = 3600) {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    }
    return null;
  },

  /**
   * Deletes a document from storage
   */
  async deleteDocument(storagePath, storageType = 'local') {
    if (storageType === 'supabase') {
      const supabase = getSupabaseClient();
      if (supabase && isSupabaseConfigured()) {
        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);

        if (error) {
          logger.warn(`Failed to delete Supabase storage object ${storagePath}:`, error.message);
        }
        return true;
      }
    }

    // Local disk deletion
    try {
      if (fs.existsSync(storagePath)) {
        await fs.promises.unlink(storagePath);
      }
    } catch (err) {
      logger.warn(`Could not delete local file ${storagePath}:`, err.message);
    }
    return true;
  }
};
