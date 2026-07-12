import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProfile } from '../controllers/profileController.js';

const router = Router();

router.get('/', requireAuth, getProfile);

export default router;
