import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { generateReferralCode } from '../utils/referral.js';

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
