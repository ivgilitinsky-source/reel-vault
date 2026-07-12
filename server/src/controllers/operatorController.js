import pool from '../db.js';

export async function listPlayers(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, username, email, balance, created_at
       FROM users
       WHERE role = 'player' AND operator_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
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
    console.error('Ошибка загрузки игроков:', err);
    res.status(500).json({ error: 'Не удалось загрузить список игроков' });
  }
}

export async function listPool(req, res) {
  try {
    const selfResult = await pool.query('SELECT dealer_id FROM users WHERE id = $1', [req.userId]);
    const dealerId = selfResult.rows[0]?.dealer_id;

    if (!dealerId) {
      return res.json({ players: [] });
    }

    const result = await pool.query(
      `SELECT id, username, email, balance, created_at
       FROM users
       WHERE role = 'player' AND dealer_id = $1 AND operator_id IS NULL
       ORDER BY created_at DESC
       LIMIT 100`,
      [dealerId]
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
    console.error('Ошибка загрузки пула дилера:', err);
    res.status(500).json({ error: 'Не удалось загрузить пул игроков' });
  }
}

export async function claimPlayer(req, res) {
  const playerId = Number.parseInt(req.params.id, 10);
  try {
    const selfResult = await pool.query('SELECT dealer_id FROM users WHERE id = $1', [req.userId]);
    const dealerId = selfResult.rows[0]?.dealer_id;

    if (!dealerId) {
      return res.status(400).json({ error: 'У вас не назначен дилер' });
    }

    const result = await pool.query(
      `UPDATE users SET operator_id = $1
       WHERE id = $2 AND role = 'player' AND dealer_id = $3 AND operator_id IS NULL
       RETURNING id`,
      [req.userId, playerId, dealerId]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Игрок уже закреплён или не относится к вашему дилеру' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка закрепления игрока:', err);
    res.status(500).json({ error: 'Не удалось закрепить игрока' });
  }
}
