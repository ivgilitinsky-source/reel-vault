import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getHistory, getStats } from '../controllers/historyController.js';

const router = Router();

router.get('/', requireAuth, getHistory);
router.get('/stats', requireAuth, getStats);

export default router;
