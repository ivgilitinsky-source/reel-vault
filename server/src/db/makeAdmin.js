import 'dotenv/config';
import pool from '../db.js';

async function run() {
  const username = process.argv[2];
  if (!username) {
    console.error('Использование: node src/db/makeAdmin.js <username>');
    process.exit(1);
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = 'admin' WHERE LOWER(username) = LOWER($1) RETURNING id, username`,
      [username]
    );

    if (result.rows.length === 0) {
      console.error(`❌ Пользователь "${username}" не найден`);
    } else {
      console.log(`✅ Пользователь "${result.rows[0].username}" (id=${result.rows[0].id}) назначен админом`);
    }
  } catch (err) {
    console.error('Ошибка:', err);
  } finally {
    await pool.end();
  }
}

run();
