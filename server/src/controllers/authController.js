import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { signToken } from '../utils/jwt.js';
import { validateRegisterInput, validateLoginInput } from '../utils/validators.js';

const STARTING_BALANCE = 1000;

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: Number(user.balance),
    role: user.role,
    dealerId: user.dealer_id,
    operatorId: user.operator_id,
    referralCode: user.referral_code,
    createdAt: user.created_at,
  };
}

export async function register(req, res) {
  const { username, email, password, ref } = req.body;
  const errors = validateRegisterInput({ username, email, password });

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR email = $2',
      [username.trim(), email.trim().toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Пользователь с таким именем или email уже существует' });
    }

    let dealerId = null;
    let operatorId = null;

    if (typeof ref === 'string' && ref.trim()) {
      const refResult = await pool.query(
        'SELECT id, role, dealer_id FROM users WHERE referral_code = $1',
        [ref.trim()]
      );
      const referrer = refResult.rows[0];
      if (referrer) {
        if (referrer.role === 'dealer') {
          dealerId = referrer.id;
        } else if (referrer.role === 'operator') {
          dealerId = referrer.dealer_id;
          operatorId = referrer.id;
        }
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, balance, role, dealer_id, operator_id)
       VALUES ($1, $2, $3, $4, 'player', $5, $6)
       RETURNING id, username, email, balance, role, dealer_id, operator_id, referral_code, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, STARTING_BALANCE, dealerId, operatorId]
    );

    const user = result.rows[0];
    const token = signToken({ sub: user.id, role: user.role });

    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Не удалось создать аккаунт, попробуйте позже' });
  }
}

export async function login(req, res) {
  const { identifier, password } = req.body;
  const errors = validateLoginInput({ identifier, password });

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const normalizedIdentifier = identifier.trim().toLowerCase();

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = $1 OR email = $1',
      [normalizedIdentifier]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Учётная запись заблокирована' });
    }

    const token = signToken({ sub: user.id, role: user.role });

    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Не удалось выполнить вход, попробуйте позже' });
  }
}
