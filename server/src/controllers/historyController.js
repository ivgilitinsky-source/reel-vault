import pool from '../db.js';

const HISTORY_LIMIT = 30;

export async function getHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM (
         SELECT 'classic' AS game, id, bet_amount, payout_amount, created_at
         FROM spins WHERE user_id = $1
         UNION ALL
         SELECT 'book' AS game, id, total_bet AS bet_amount, payout_amount, created_at
         FROM book_spins WHERE user_id = $1
       ) combined
       ORDER BY created_at DESC
       LIMIT $2`,
      [req.userId, HISTORY_LIMIT]
    );

    const spins = result.rows.map((row) => ({
      id: row.id,
      game: row.game,
      betAmount: Number(row.bet_amount),
      payoutAmount: Number(row.payout_amount),
      netChange: Number(row.payout_amount) - Number(row.bet_amount),
      createdAt: row.created_at,
    }));

    res.json({ spins });
  } catch (err) {
    console.error('Ошибка загрузки истории:', err);
    res.status(500).json({ error: 'Не удалось загрузить историю игр' });
  }
}

export async function getStats(req, res) {
  try {
    const result = await pool.query(
      `SELECT game, COUNT(*) AS spins_count,
              COALESCE(SUM(bet_amount), 0) AS total_bet,
              COALESCE(SUM(payout_amount), 0) AS total_payout
       FROM (
         SELECT 'classic' AS game, bet_amount, payout_amount FROM spins WHERE user_id = $1
         UNION ALL
         SELECT 'book' AS game, total_bet AS bet_amount, payout_amount FROM book_spins WHERE user_id = $1
       ) combined
       GROUP BY game`,
      [req.userId]
    );

    const stats = result.rows.map((r) => ({
      game: r.game,
      spinsCount: Number(r.spins_count),
      totalBet: Number(r.total_bet),
      totalPayout: Number(r.total_payout),
      net: Number(r.total_payout) - Number(r.total_bet),
    }));

    res.json({ stats });
  } catch (err) {
    console.error('Ошибка загрузки статистики:', err);
    res.status(500).json({ error: 'Не удалось загрузить статистику' });
  }
}
