import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getHistory } from '../controllers/historyController.js';

const router = Router();

router.get('/', requireAuth, getHistory);

export default router;
