import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { generateReferralCode } from '../utils/referral.js';
import { performBalanceAdjustment } from '../utils/balanceAdjustment.js';

export async function adjustOperatorBalance(req, res) {
  const targetId = Number.parseInt(req.params.id, 10);
  const amount = Number.parseInt(req.body.amount, 10);
  const reason = typeof req.body.reason === 'string' ? req.body.reason.slice(0, 200) : null;

  if (!Number.isInteger(targetId) || !Number.isInteger(amount) || amount === 0) {
    return res.status(400).json({ error: 'Некорректная сумма изменения баланса' });
  }

  try {
    const result = await performBalanceAdjustment({
      targetId,
      amount,
      reason,
      adjustedByUserId: req.userId,
      expectedRole: 'operator',
      ownershipCheck: (target) => target.dealer_id === req.userId,
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    res.json({ balance: result.balance });
  } catch (err) {
    console.error('Ошибка изменения баланса оператора:', err);
    res.status(500).json({ error: 'Не удалось изменить баланс' });
  }
}

export async function getStats(req, res) {
  const groupBy = req.query.groupBy === 'month' ? 'month' : 'day';
  const from = req.query.from || '2000-01-01';
  const to = req.query.to || '2100-01-01';

  try {
    const result = await pool.query(
      `SELECT
         DATE_TRUNC($4, combined.created_at) AS period,
         COUNT(DISTINCT combined.user_id) AS players_count,
         COALESCE(SUM(combined.bet_amount), 0) AS total_bet,
         COALESCE(SUM(combined.payout_amount), 0) AS total_payout
       FROM (
         SELECT s.user_id, s.bet_amount, s.payout_amount, s.created_at
         FROM spins s
         JOIN users p ON p.id = s.user_id
         WHERE p.dealer_id = $1
         UNION ALL
         SELECT bs.user_id, bs.total_bet AS bet_amount, bs.payout_amount, bs.created_at
         FROM book_spins bs
         JOIN users p ON p.id = bs.user_id
         WHERE p.dealer_id = $1
       ) combined
       WHERE combined.created_at >= $2 AND combined.created_at <= $3
       GROUP BY period
       ORDER BY period DESC
       LIMIT 90`,
      [req.userId, from, to, groupBy]
    );

    res.json({
      stats: result.rows.map((r) => ({
        period: r.period,
        playersCount: Number(r.players_count),
        totalBet: Number(r.total_bet),
        totalPayout: Number(r.total_payout),
        profit: Number(r.total_bet) - Number(r.total_payout),
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки статистики дилера:', err);
    res.status(500).json({ error: 'Не удалось загрузить статистику' });
  }
}

export async function createPromotion(req, res) {
  const { code, bonusAmount, maxUses, expiresAt } = req.body;
  const parsedBonus = Number.parseInt(bonusAmount, 10);

  if (!code || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Укажите код акции' });
  }
  if (!Number.isInteger(parsedBonus) || parsedBonus <= 0) {
    return res.status(400).json({ error: 'Бонус должен быть положительным числом' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO promotions (dealer_id, code, bonus_amount, max_uses, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, code, bonus_amount, max_uses, uses_count, expires_at, is_active, created_at`,
      [
        req.userId,
        code.trim().toUpperCase(),
        parsedBonus,
        maxUses ? Number.parseInt(maxUses, 10) : null,
        expiresAt || null,
      ]
    );

    res.status(201).json({ promotion: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Такой код акции уже существует' });
    }
    console.error('Ошибка создания акции:', err);
    res.status(500).json({ error: 'Не удалось создать акцию' });
  }
}

export async function listPromotions(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, code, bonus_amount, max_uses, uses_count, expires_at, is_active, created_at
       FROM promotions
       WHERE dealer_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json({
      promotions: result.rows.map((r) => ({
        id: r.id,
        code: r.code,
        bonusAmount: Number(r.bonus_amount),
        maxUses: r.max_uses,
        usesCount: r.uses_count,
        expiresAt: r.expires_at,
        isActive: r.is_active,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки акций:', err);
    res.status(500).json({ error: 'Не удалось загрузить список акций' });
  }
}

export async function deactivatePromotion(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      `UPDATE promotions SET is_active = false WHERE id = $1 AND dealer_id = $2 RETURNING id`,
      [id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Акция не найдена' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка деактивации акции:', err);
    res.status(500).json({ error: 'Не удалось деактивировать акцию' });
  }
}

export async function listNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT n.id, n.message, n.is_read, n.created_at, n.player_id, p.username AS player_username
       FROM notifications n
       LEFT JOIN users p ON p.id = n.player_id
       WHERE n.dealer_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.userId]
    );

    res.json({
      notifications: result.rows.map((r) => ({
        id: r.id,
        message: r.message,
        isRead: r.is_read,
        playerId: r.player_id,
        playerUsername: r.player_username,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки уведомлений:', err);
    res.status(500).json({ error: 'Не удалось загрузить уведомления' });
  }
}

export async function markNotificationRead(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND dealer_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка обновления уведомления:', err);
    res.status(500).json({ error: 'Не удалось обновить уведомление' });
  }
}

export async function createOperator(req, res) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Заполните логин, email и пароль' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR email = $2',
      [username.trim(), email.trim().toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Такой логин или email уже занят' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode();

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, balance, role, dealer_id, referral_code)
       VALUES ($1, $2, $3, 0, 'operator', $4, $5)
       RETURNING id, username, email, referral_code, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, req.userId, referralCode]
    );

    res.status(201).json({ operator: result.rows[0] });
  } catch (err) {
    console.error('Ошибка создания оператора:', err);
    res.status(500).json({ error: 'Не удалось создать оператора' });
  }
}

export async function listOperators(req, res) {
  try {
    const result = await pool.query(
      `SELECT o.id, o.username, o.email, o.referral_code, o.created_at,
              COUNT(p.id) AS players_count,
              COALESCE(SUM(p.balance), 0) AS total_balance
       FROM users o
       LEFT JOIN users p ON p.operator_id = o.id
       WHERE o.role = 'operator' AND o.dealer_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.userId]
    );

    res.json({
      operators: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        referralCode: r.referral_code,
        playersCount: Number(r.players_count),
        totalBalance: Number(r.total_balance),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки операторов:', err);
    res.status(500).json({ error: 'Не удалось загрузить список операторов' });
  }
}

export async function deleteOperator(req, res) {
  const operatorId = Number.parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'operator' AND dealer_id = $2 RETURNING id`,
      [operatorId, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Оператор не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления оператора:', err);
    res.status(500).json({ error: 'Не удалось удалить оператора' });
  }
}

export async function listPlayers(req, res) {
  try {
    const result = await pool.query(
      `SELECT p.id, p.username, p.email, p.balance, p.created_at, o.username AS operator_username
       FROM users p
       LEFT JOIN users o ON o.id = p.operator_id
       WHERE p.role = 'player' AND p.dealer_id = $1
       ORDER BY p.created_at DESC`,
      [req.userId]
    );

    res.json({
      players: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        balance: Number(r.balance),
        operatorUsername: r.operator_username,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки игроков:', err);
    res.status(500).json({ error: 'Не удалось загрузить список игроков' });
  }
}

export async function listPool(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, username, email, balance, created_at
       FROM users
       WHERE role = 'player' AND dealer_id IS NULL
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json({
      players: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        balance: Number(r.balance),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки общего пула:', err);
    res.status(500).json({ error: 'Не удалось загрузить пул игроков' });
  }
}

export async function claimPlayer(req, res) {
  const playerId = Number.parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      `UPDATE users SET dealer_id = $1
       WHERE id = $2 AND role = 'player' AND dealer_id IS NULL
       RETURNING id`,
      [req.userId, playerId]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Игрок уже закреплён за другим дилером или не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка закрепления игрока:', err);
    res.status(500).json({ error: 'Не удалось закрепить игрока' });
  }
}
