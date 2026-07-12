import pool from '../db.js';

export async function performBalanceAdjustment({
  targetId,
  amount,
  reason,
  adjustedByUserId,
  expectedRole,
  ownershipCheck,
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetResult = await client.query(
      'SELECT id, balance, role, dealer_id, operator_id FROM users WHERE id = $1 FOR UPDATE',
      [targetId]
    );
    const target = targetResult.rows[0];

    if (!target || target.role !== expectedRole) {
      await client.query('ROLLBACK');
      return { error: { status: 404, message: 'Пользователь не найден' } };
    }

    if (ownershipCheck && !ownershipCheck(target)) {
      await client.query('ROLLBACK');
      return { error: { status: 403, message: 'Этот пользователь не в вашей структуре' } };
    }

    const newBalance = Number(target.balance) + amount;
    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return { error: { status: 400, message: 'Баланс не может стать отрицательным' } };
    }

    await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, targetId]);
    await client.query(
      `INSERT INTO balance_adjustments (target_user_id, adjusted_by_user_id, amount, reason)
       VALUES ($1, $2, $3, $4)`,
      [targetId, adjustedByUserId, amount, reason]
    );

    await client.query('COMMIT');
    return { balance: newBalance };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
