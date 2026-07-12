import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { generateReferralCode } from '../utils/referral.js';
import { performBalanceAdjustment } from '../utils/balanceAdjustment.js';

async function createStaffUser({ username, email, password, role, dealerId }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const referralCode = generateReferralCode();

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, balance, role, dealer_id, referral_code)
     VALUES ($1, $2, $3, 0, $4, $5, $6)
     RETURNING id, username, email, role, dealer_id, referral_code, created_at`,
    [username.trim(), email.trim().toLowerCase(), passwordHash, role, dealerId, referralCode]
  );
  return result.rows[0];
}

export async function createDealer(req, res) {
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

    const dealer = await createStaffUser({ username, email, password, role: 'dealer', dealerId: null });
    res.status(201).json({ dealer });
  } catch (err) {
    console.error('Ошибка создания дилера:', err);
    res.status(500).json({ error: 'Не удалось создать дилера' });
  }
}

export async function listDealers(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.id, d.username, d.email, d.referral_code, d.is_blocked, d.created_at,
              COUNT(DISTINCT o.id) AS operators_count,
              COUNT(DISTINCT p.id) AS players_count,
              COALESCE(SUM(p.balance), 0) AS total_balance
       FROM users d
       LEFT JOIN users o ON o.dealer_id = d.id AND o.role = 'operator'
       LEFT JOIN users p ON p.dealer_id = d.id AND p.role = 'player'
       WHERE d.role = 'dealer'
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    );

    res.json({
      dealers: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        referralCode: r.referral_code,
        isBlocked: r.is_blocked,
        operatorsCount: Number(r.operators_count),
        playersCount: Number(r.players_count),
        totalBalance: Number(r.total_balance),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки дилеров:', err);
    res.status(500).json({ error: 'Не удалось загрузить список дилеров' });
  }
}

export async function deleteDealer(req, res) {
  const dealerId = Number.parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE id = $1 AND role = 'dealer' RETURNING id`,
      [dealerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Дилер не найден' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления дилера:', err);
    res.status(500).json({ error: 'Не удалось удалить дилера' });
  }
}

export async function toggleBlockDealer(req, res) {
  const dealerId = Number.parseInt(req.params.id, 10);
  try {
    const result = await pool.query(
      `UPDATE users SET is_blocked = NOT is_blocked
       WHERE id = $1 AND role = 'dealer'
       RETURNING id, is_blocked`,
      [dealerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Дилер не найден' });
    }
    res.json({ isBlocked: result.rows[0].is_blocked });
  } catch (err) {
    console.error('Ошибка блокировки дилера:', err);
    res.status(500).json({ error: 'Не удалось изменить статус блокировки' });
  }
}

export async function listAllPlayers(req, res) {
  try {
    const result = await pool.query(
      `SELECT p.id, p.username, p.email, p.balance, p.created_at,
              d.username AS dealer_username, o.username AS operator_username
       FROM users p
       LEFT JOIN users d ON d.id = p.dealer_id
       LEFT JOIN users o ON o.id = p.operator_id
       WHERE p.role = 'player'
       ORDER BY p.created_at DESC
       LIMIT 200`
    );

    res.json({
      players: result.rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        balance: Number(r.balance),
        dealerUsername: r.dealer_username,
        operatorUsername: r.operator_username,
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    console.error('Ошибка загрузки игроков:', err);
    res.status(500).json({ error: 'Не удалось загрузить список игроков' });
  }
}

export async function adjustBalance(req, res) {
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
      expectedRole: 'player',
      ownershipCheck: (target) => {
        if (req.userRole === 'dealer') return target.dealer_id === req.userId;
        if (req.userRole === 'operator') return target.operator_id === req.userId;
        return true;
      },
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    res.json({ balance: result.balance });
  } catch (err) {
    console.error('Ошибка изменения баланса:', err);
    res.status(500).json({ error: 'Не удалось изменить баланс' });
  }
}

export async function adjustDealerBalance(req, res) {
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
      expectedRole: 'dealer',
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    res.json({ balance: result.balance });
  } catch (err) {
    console.error('Ошибка изменения баланса дилера:', err);
    res.status(500).json({ error: 'Не удалось изменить баланс' });
  }
}
