import pool from '../db.js';

const MIN_BET = 1;
const MAX_BET = 500;

const REEL_WEIGHTS = [
  { symbol: '7', weight: 1 },
  { symbol: 'BAR', weight: 3 },
  { symbol: 'BELL', weight: 6 },
  { symbol: 'CHERRY', weight: 10 },
];
const TOTAL_WEIGHT = REEL_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);

const PAYOUT_MULTIPLIERS = {
  7: 50,
  BAR: 15,
  BELL: 8,
  CHERRY: 4,
};

function spinReel() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const { symbol, weight } of REEL_WEIGHTS) {
    if (roll < weight) return symbol;
    roll -= weight;
  }
  return REEL_WEIGHTS[REEL_WEIGHTS.length - 1].symbol;
}

function calculatePayout(reels, betAmount) {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    const multiplier = PAYOUT_MULTIPLIERS[a] || 0;
    return multiplier * betAmount;
  }
  return 0;
}

export async function spin(req, res) {
  const betAmount = Number.parseInt(req.body.betAmount, 10);

  if (!Number.isInteger(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
    return res.status(400).json({ error: `Ставка должна быть от ${MIN_BET} до ${MAX_BET} жетонов` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [req.userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const currentBalance = Number(user.balance);
    if (currentBalance < betAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно жетонов для этой ставки' });
    }

    const reels = [spinReel(), spinReel(), spinReel()];
    const payout = calculatePayout(reels, betAmount);
    const newBalance = currentBalance - betAmount + payout;

    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, req.userId]);
    await client.query(
      'INSERT INTO spins (user_id, bet_amount, payout_amount, reels) VALUES ($1, $2, $3, $4)',
      [req.userId, betAmount, payout, reels]
    );

    await client.query('COMMIT');

    res.json({
      reels,
      betAmount,
      payout,
      netChange: payout - betAmount,
      balance: newBalance,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка спина:', err);
    res.status(500).json({ error: 'Не удалось выполнить спин, попробуйте позже' });
  } finally {
    client.release();
  }
}

export function getPaytable(req, res) {
  res.json({
    minBet: MIN_BET,
    maxBet: MAX_BET,
    payouts: PAYOUT_MULTIPLIERS,
  });
}
