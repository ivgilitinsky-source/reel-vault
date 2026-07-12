import pool from '../db.js';

const LEADERBOARD_LIMIT = 20;

export async function getLeaderboard(req, res) {
  try {
    const result = await pool.query(
      `SELECT username, balance
       FROM users
       ORDER BY balance DESC
       LIMIT $1`,
      [LEADERBOARD_LIMIT]
    );

    const leaders = result.rows.map((row, index) => ({
      rank: index + 1,
      username: row.username,
      balance: Number(row.balance),
    }));

    res.json({ leaders });
  } catch (err) {
    console.error('Ошибка загрузки лидерборда:', err);
    res.status(500).json({ error: 'Не удалось загрузить таблицу лидеров' });
  }
}
