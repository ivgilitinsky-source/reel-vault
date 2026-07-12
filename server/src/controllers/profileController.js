import pool from '../db.js';

export async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, username, email, balance, role, dealer_id, operator_id, referral_code, created_at FROM users WHERE id = $1',
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
      role: user.role,
      dealerId: user.dealer_id,
      operatorId: user.operator_id,
      referralCode: user.referral_code,
      createdAt: user.created_at,
    });
  } catch (err) {
    console.error('Ошибка загрузки профиля:', err);
    res.status(500).json({ error: 'Не удалось загрузить профиль' });
  }
}
