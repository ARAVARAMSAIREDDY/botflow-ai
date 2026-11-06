import { Router } from 'express';
import { 
  listChatbots, 
  getChatbot, 
  createChatbot, 
  deleteChatbot,
  updateCustomization,
  addDomain,
  removeDomain,
  toggleRestrictDomains,
  getAnalytics
} from '../controllers/chatbotController.js';
import { validateChatbotCreate } from '../middleware/validator.js';
import { optionalAuth, requireAuth, requireChatbotOwnership } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/chatbots - retrieve available chatbots (scoped to authenticated user if logged in)
router.get('/', optionalAuth, listChatbots);

// GET /api/chatbots/:id - retrieve chatbot details (validates tenant ownership)
router.get('/:id', optionalAuth, getChatbot);

// POST /api/chatbots - create a chatbot (associates with authenticated user)
router.post('/', optionalAuth, validateChatbotCreate, createChatbot);

// DELETE /api/chatbots/:id - delete a chatbot (strictly requires auth & ownership)
router.delete('/:id', requireAuth, requireChatbotOwnership, deleteChatbot);

// PUT /api/chatbots/:id/customization - update widget appearance & settings
router.put('/:id/customization', requireAuth, requireChatbotOwnership, updateCustomization);

// POST /api/chatbots/:id/domains - add allowed domain
router.post('/:id/domains', requireAuth, requireChatbotOwnership, addDomain);

// DELETE /api/chatbots/:id/domains/:domain - remove allowed domain
router.delete('/:id/domains/:domain', requireAuth, requireChatbotOwnership, removeDomain);

// POST /api/chatbots/:id/domains/restrict - toggle restrict_domains
router.post('/:id/domains/restrict', requireAuth, requireChatbotOwnership, toggleRestrictDomains);

// GET /api/chatbots/:id/analytics - retrieve widget engagement metrics
router.get('/:id/analytics', requireAuth, requireChatbotOwnership, getAnalytics);

export default router;
