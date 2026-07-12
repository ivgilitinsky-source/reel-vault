import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import pool from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  try {
    await pool.query(schema);
    console.log('✅ Схема базы данных применена успешно');
  } catch (err) {
    console.error('❌ Не удалось применить схему:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

init();
