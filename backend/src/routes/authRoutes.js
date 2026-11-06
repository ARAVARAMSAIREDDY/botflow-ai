import { Router } from 'express';
import { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile, 
  changePassword, 
  forgotPassword, 
  deleteAccount 
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);

// Protected account management endpoints
router.get('/me', requireAuth, getProfile);
router.put('/profile', requireAuth, updateProfile);
router.put('/password', requireAuth, changePassword);
router.delete('/account', requireAuth, deleteAccount);

export default router;
