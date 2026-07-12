import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createOperator,
  listOperators,
  deleteOperator,
  listPlayers,
  listPool,
  claimPlayer,
  listNotifications,
  markNotificationRead,
  adjustOperatorBalance,
  getStats,
  createPromotion,
  listPromotions,
  deactivatePromotion,
} from '../controllers/dealerController.js';
import { adjustBalance } from '../controllers/adminController.js';

const router = Router();

router.use(requireAuth, requireRole('dealer'));

router.post('/operators', createOperator);
router.get('/operators', listOperators);
router.delete('/operators/:id', deleteOperator);
router.post('/operators/:id/adjust-balance', adjustOperatorBalance);
router.get('/players', listPlayers);
router.get('/pool', listPool);
router.post('/players/:id/claim', claimPlayer);
router.post('/players/:id/adjust-balance', adjustBalance);
router.get('/notifications', listNotifications);
router.post('/notifications/:id/read', markNotificationRead);
router.get('/stats', getStats);
router.post('/promotions', createPromotion);
router.get('/promotions', listPromotions);
router.post('/promotions/:id/deactivate', deactivatePromotion);

export default router;
