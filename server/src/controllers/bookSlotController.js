import pool from '../db.js';

const REELS_COUNT = 5;
const ROWS_COUNT = 3;
const LINES_COUNT = 9;
const ALLOWED_LINE_COUNTS = [1, 3, 5, 7, 9];
const FREE_SPINS_AWARDED = 10;

const MIN_BET_PER_LINE = 1;
const MAX_BET_PER_LINE = 50;

const SYMBOL_WEIGHTS = [
  { symbol: 'TEN', weight: 20 },
  { symbol: 'JACK', weight: 18 },
  { symbol: 'QUEEN', weight: 16 },
  { symbol: 'KING', weight: 14 },
  { symbol: 'ACE', weight: 12 },
  { symbol: 'ANKH', weight: 8 },
  { symbol: 'EYE', weight: 6 },
  { symbol: 'SCARAB', weight: 4 },
  { symbol: 'PYRAMID', weight: 2 },
  { symbol: 'BOOK', weight: 3 },
];
const TOTAL_WEIGHT = SYMBOL_WEIGHTS.reduce((sum, s) => sum + s.weight, 0);

const LINE_PAYTABLE = {
  TEN: { 3: 5, 4: 10, 5: 25 },
  JACK: { 3: 5, 4: 15, 5: 30 },
  QUEEN: { 3: 10, 4: 20, 5: 40 },
  KING: { 3: 10, 4: 25, 5: 50 },
  ACE: { 3: 15, 4: 30, 5: 60 },
  ANKH: { 3: 20, 4: 50, 5: 100 },
  EYE: { 3: 25, 4: 75, 5: 150 },
  SCARAB: { 3: 30, 4: 100, 5: 250 },
  PYRAMID: { 3: 50, 4: 200, 5: 500 },
};

const SCATTER_PAYTABLE = { 3: 2, 4: 20, 5: 200 };

const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
];

function drawSymbol() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const { symbol, weight } of SYMBOL_WEIGHTS) {
    if (roll < weight) return symbol;
    roll -= weight;
  }
  return SYMBOL_WEIGHTS[SYMBOL_WEIGHTS.length - 1].symbol;
}

function generateGrid() {
  const grid = [];
  for (let reel = 0; reel < REELS_COUNT; reel++) {
    const column = [];
    for (let row = 0; row < ROWS_COUNT; row++) {
      column.push(drawSymbol());
    }
    grid.push(column);
  }
  return grid;
}

function evaluateLines(grid, betPerLine, luckySymbol, activeLines) {
  let totalLinePayout = 0;
  const winningLines = [];

  PAYLINES.slice(0, activeLines).forEach((line, lineIndex) => {
    const symbols = line.map((row, reel) => grid[reel][row]);
    const first = symbols[0];
    if (first === 'BOOK') return;

    const baseSymbol = first;
    let matchCount = 1;
    for (let i = 1; i < symbols.length; i++) {
      const sym = symbols[i];
      const matches = sym === baseSymbol || sym === luckySymbol;
      if (matches) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3 && LINE_PAYTABLE[baseSymbol]) {
      const multiplier = LINE_PAYTABLE[baseSymbol][matchCount] || 0;
      if (multiplier > 0) {
        const payout = multiplier * betPerLine;
        totalLinePayout += payout;
        winningLines.push({ lineIndex, symbol: baseSymbol, count: matchCount, payout });
      }
    }
  });

  return { totalLinePayout, winningLines };
}

function evaluateScatter(grid, totalBet) {
  let count = 0;
  grid.forEach((column) => {
    column.forEach((symbol) => {
      if (symbol === 'BOOK') count++;
    });
  });

  const cappedCount = Math.min(count, 5);
  const multiplier = SCATTER_PAYTABLE[cappedCount] || 0;
  const payout = multiplier * totalBet;
  const triggersBonus = count >= 3;

  return { count, payout, triggersBonus };
}

function pickLuckySymbol() {
  const candidates = Object.keys(LINE_PAYTABLE);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function getPaytable(req, res) {
  res.json({
    minBetPerLine: MIN_BET_PER_LINE,
    maxBetPerLine: MAX_BET_PER_LINE,
    lines: LINES_COUNT,
    allowedLineCounts: ALLOWED_LINE_COUNTS,
    linePaytable: LINE_PAYTABLE,
    scatterPaytable: SCATTER_PAYTABLE,
    freeSpinsAwarded: FREE_SPINS_AWARDED,
  });
}

export async function spin(req, res) {
  const betPerLine = Number.parseInt(req.body.betPerLine, 10);
  const isBonusSpin = Boolean(req.body.isBonusSpin);
  const requestedLucky = typeof req.body.luckySymbol === 'string' ? req.body.luckySymbol : null;
  const luckySymbol = isBonusSpin ? (requestedLucky || pickLuckySymbol()) : null;

  let activeLines = Number.parseInt(req.body.activeLines, 10);
  if (!ALLOWED_LINE_COUNTS.includes(activeLines)) {
    activeLines = LINES_COUNT;
  }

  if (!Number.isInteger(betPerLine) || betPerLine < MIN_BET_PER_LINE || betPerLine > MAX_BET_PER_LINE) {
    return res
      .status(400)
      .json({ error: `Ставка на линию должна быть от ${MIN_BET_PER_LINE} до ${MAX_BET_PER_LINE}` });
  }

  const totalBet = betPerLine * activeLines;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query('SELECT balance FROM users WHERE id = $1 FOR UPDATE', [req.userId]);
    const user = userResult.rows[0];

    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const currentBalance = Number(user.balance);

    if (!isBonusSpin && currentBalance < totalBet) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно жетонов для этой ставки' });
    }

    const grid = generateGrid();
    const { totalLinePayout, winningLines } = evaluateLines(grid, betPerLine, luckySymbol, activeLines);
    const scatterResult = evaluateScatter(grid, totalBet);

    const totalPayout = totalLinePayout + scatterResult.payout;
    const debit = isBonusSpin ? 0 : totalBet;
    const newBalance = currentBalance - debit + totalPayout;

    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, req.userId]);
    await client.query(
      `INSERT INTO book_spins (user_id, bet_per_line, total_bet, payout_amount, grid, is_bonus)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, betPerLine, debit, totalPayout, JSON.stringify(grid), isBonusSpin]
    );

    await client.query('COMMIT');

    res.json({
      grid,
      betPerLine,
      activeLines,
      totalBet: debit,
      linePayout: totalLinePayout,
      scatterPayout: scatterResult.payout,
      totalPayout,
      winningLines,
      scatter: scatterResult,
      luckySymbol,
      balance: newBalance,
      freeSpinsAwarded: scatterResult.triggersBonus ? FREE_SPINS_AWARDED : 0,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Ошибка спина (book-slot):', err);
    res.status(500).json({ error: 'Не удалось выполнить вращение, попробуйте позже' });
  } finally {
    client.release();
  }
}
