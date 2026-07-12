import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { redeemPromotion, listAvailablePromotions } from '../controllers/promotionsController.js';

const router = Router();

router.get('/available', requireAuth, listAvailablePromotions);
router.post('/redeem', requireAuth, redeemPromotion);

export default router;
