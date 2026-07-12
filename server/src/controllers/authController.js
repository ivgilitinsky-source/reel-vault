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
    createdAt: user.created_at,
  };
}

export async function register(req, res) {
  const { username, email, password } = req.body;
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

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, balance)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, balance, created_at`,
      [username.trim(), email.trim().toLowerCase(), passwordHash, STARTING_BALANCE]
    );

    const user = result.rows[0];
    const token = signToken({ sub: user.id });

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

    const token = signToken({ sub: user.id });

    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Не удалось выполнить вход, попробуйте позже' });
  }
}
