import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { spin, getPaytable } from '../controllers/bookSlotController.js';

const router = Router();

router.get('/paytable', getPaytable);
router.post('/spin', requireAuth, spin);

export default router;
