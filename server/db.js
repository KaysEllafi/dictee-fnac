const { Pool } = require('pg');

const useSSL = process.env.DB_SSL === 'true';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'dictee_fnac',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl:      useSSL ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('Erreur connexion PostgreSQL :', err.message);
});

module.exports = pool;
