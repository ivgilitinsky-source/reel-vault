import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import leaderboardRoutes from './routes/leaderboardRoutes.js';
import bookSlotRoutes from './routes/bookSlotRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dealerRoutes from './routes/dealerRoutes.js';
import operatorRoutes from './routes/operatorRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/slot', slotRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/book-slot', bookSlotRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dealer', dealerRoutes);
app.use('/api/operator', operatorRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🎰 Reel Vault API запущен на порту ${PORT}`);
});
