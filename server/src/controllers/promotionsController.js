import pool from '../db.js';

export async function listAvailablePromotions(req, res) {
  try {
    const userResult = await pool.query('SELECT dealer_id, role FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];

    if (!user || user.role !== 'player' || !user.dealer_id) {
      return res.json({ promotions: [] });
    }

    const result = await pool.query(
      `SELECT p.id, p.code, p.bonus_amount, p.max_uses, p.uses_count, p.expires_at
       FROM promotions p
       WHERE p.dealer_id = $1
         AND p.is_active = true
         AND (p.expires_at IS NULL OR p.expires_at > NOW())
         AND (p.max_uses IS NULL OR p.uses_count < p.max_uses)
         AND NOT EXISTS (
           SELECT 1 FROM promotion_redemptions r WHERE r.promotion_id = p.id AND r.user_id = $2
         )
       ORDER BY p.created_at DESC`,
      [user.dealer_id, req.userId]
    );

    res.json({
      promotions: result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        bonusAmount: Number(r.bonus_amount),
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки доступных акций:', err);
    res.status(500).json({ error: 'Не удалось загрузить акции' });
  }
}

export async function redeemPromotion(req, res) {
  const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
  if (!code) {
    return res.status(400).json({ error: 'Введите код акции' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, balance, role, dealer_id FROM users WHERE id = $1 FOR UPDATE',
      [req.userId]
    );
    const user = userResult.rows[0];

    if (!user || user.role !== 'player') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Промокоды может активировать только игрок' });
    }
    if (!user.dealer_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'У вас нет привязанного дилера, акции недоступны' });
    }

    const promoResult = await client.query(
      `SELECT id, dealer_id, bonus_amount, max_uses, uses_count, expires_at, is_active
       FROM promotions WHERE code = $1 FOR UPDATE`,
      [code]
    );
    const promo = promoResult.rows[0];

    if (!promo || !promo.is_active) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Промокод не найден или уже неактивен' });
    }
    if (promo.dealer_id !== user.dealer_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Этот промокод не относится к вашему дилеру' });
    }
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Срок действия промокода истёк' });
    }
    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Промокод исчерпан' });
    }

    const alreadyUsed = await client.query(
      'SELECT id FROM promotion_redemptions WHERE promotion_id = $1 AND user_id = $2',
      [promo.id, req.userId]
    );
    if (alreadyUsed.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Вы уже активировали этот промокод' });
    }

    const bonusAmount = Number(promo.bonus_amount);
    const newBalance = Number(user.balance) + bonusAmount;

    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, req.userId]);
    await client.query('UPDATE promotions SET uses_count = uses_count + 1 WHERE id = $1', [promo.id]);
    await client.query(
      'INSERT INTO promotion_redemptions (promotion_id, user_id) VALUES ($1, $2)',
      [promo.id, req.userId]
    );
    await client.query(
      `INSERT INTO balance_adjustments (target_user_id, adjusted_by_user_id, amount, reason)
       VALUES ($1, $2, $3, $4)`,
      [req.userId, promo.dealer_id, bonusAmount, `Промокод ${code}`]
    );

    await client.query('COMMIT');

    res.json({ balance: newBalance, bonusAmount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка активации промокода:', err);
    res.status(500).json({ error: 'Не удалось активировать промокод' });
  } finally {
    client.release();
  }
}
