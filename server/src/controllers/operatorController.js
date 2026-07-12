import pool from '../db.js';

export async function flagPlayerRisk(req, res) {
  const playerId = Number.parseInt(req.params.id, 10);
  try {
    const playerResult = await pool.query(
      `SELECT id, username, dealer_id, operator_id FROM users WHERE id = $1 AND role = 'player'`,
      [playerId]
    );
    const player = playerResult.rows[0];

    if (!player || player.operator_id !== req.userId) {
      return res.status(403).json({ error: 'Этот игрок не в вашей структуре' });
    }
    if (!player.dealer_id) {
      return res.status(400).json({ error: 'У игрока не назначен дилер' });
    }

    const operatorResult = await pool.query('SELECT username FROM users WHERE id = $1', [req.userId]);
    const operatorUsername = operatorResult.rows[0]?.username || 'оператор';

    await pool.query(
      `INSERT INTO notifications (dealer_id, operator_id, player_id, message)
       VALUES ($1, $2, $3, $4)`,
      [
        player.dealer_id,
        req.userId,
        player.id,
        `Оператор ${operatorUsername} сообщает: игрок ${player.username} может уйти`,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка отправки уведомления:', err);
    res.status(500).json({ error: 'Не удалось отправить уведомление' });
  }
}

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
