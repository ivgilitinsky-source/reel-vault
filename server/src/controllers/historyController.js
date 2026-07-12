import pool from '../db.js';

const HISTORY_LIMIT = 20;

export async function getHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, bet_amount, payout_amount, reels, created_at
       FROM spins
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.userId, HISTORY_LIMIT]
    );

    const spins = result.rows.map((row) => ({
      id: row.id,
      betAmount: Number(row.bet_amount),
      payoutAmount: Number(row.payout_amount),
      netChange: Number(row.payout_amount) - Number(row.bet_amount),
      reels: row.reels,
      createdAt: row.created_at,
    }));

    res.json({ spins });
  } catch (err) {
    console.error('Ошибка загрузки истории:', err);
    res.status(500).json({ error: 'Не удалось загрузить историю игр' });
  }
}
