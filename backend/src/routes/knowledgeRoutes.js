import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { 
  uploadDocument, 
  ingestUrl, 
  getChatbotKnowledge, 
  getSourceDetails, 
  deleteSource, 
  reindexSource 
} from '../controllers/knowledgeController.js';
import { env } from '../config/env.js';
import { errorResponse } from '../utils/response.js';
import { optionalAuth, requireAuth, requireSourceOwnership } from '../middleware/authMiddleware.js';

const router = Router();

// Configure memory storage for direct buffer extraction and safety
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (env.UPLOAD_MAX_SIZE_MB || 15) * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowed = ['pdf', 'docx', 'csv', 'txt', 'text', 'md'];

    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type ".${ext}". Supported formats are: PDF, DOCX, CSV, TXT.`));
    }
  }
});

// Middleware wrapper for multer error handling
const handleUploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return errorResponse(res, `File exceeds maximum allowed size of ${env.UPLOAD_MAX_SIZE_MB || 15}MB.`, 400);
      }
      return errorResponse(res, `Upload error: ${err.message}`, 400);
    } else if (err) {
      return errorResponse(res, err.message, 400);
    }
    next();
  });
};

// Endpoints with tenant validation and authorization
router.post('/upload', requireAuth, handleUploadMiddleware, uploadDocument);
router.post('/url', requireAuth, ingestUrl);
router.get('/:chatbotId', optionalAuth, getChatbotKnowledge);
router.get('/source/:sourceId', optionalAuth, getSourceDetails);
router.delete('/source/:sourceId', requireAuth, deleteSource);
router.post('/source/:sourceId/reindex', requireAuth, reindexSource);

export default router;
