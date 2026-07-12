import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import { createOperator, listOperators, listPlayers, listPool, claimPlayer } from '../controllers/dealerController.js';
import { adjustBalance } from '../controllers/adminController.js';

const router = Router();

router.use(requireAuth, requireRole('dealer'));

router.post('/operators', createOperator);
router.get('/operators', listOperators);
router.get('/players', listPlayers);
router.get('/pool', listPool);
router.post('/players/:id/claim', claimPlayer);
router.post('/players/:id/adjust-balance', adjustBalance);

export default router;
