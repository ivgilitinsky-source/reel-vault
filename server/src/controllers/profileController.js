import pool from '../db.js';

export async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, email, balance, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      balance: Number(user.balance),
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    res.status(500).json({ error: 'Не удалось загрузить профиль' });
  }
}
