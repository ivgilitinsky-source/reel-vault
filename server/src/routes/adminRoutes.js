import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';
import {
  createDealer,
  listDealers,
  listAllPlayers,
  adjustBalance,
  deleteDealer,
  toggleBlockDealer,
  adjustDealerBalance,
} from '../controllers/adminController.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.post('/dealers', createDealer);
router.get('/dealers', listDealers);
router.delete('/dealers/:id', deleteDealer);
router.post('/dealers/:id/toggle-block', toggleBlockDealer);
router.post('/dealers/:id/adjust-balance', adjustDealerBalance);
router.get('/players', listAllPlayers);
router.post('/players/:id/adjust-balance', adjustBalance);

export default router;
