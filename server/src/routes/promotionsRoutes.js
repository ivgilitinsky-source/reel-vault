import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { redeemPromotion } from '../controllers/promotionsController.js';

const router = Router();

router.post('/redeem', requireAuth, redeemPromotion);

export default router;
