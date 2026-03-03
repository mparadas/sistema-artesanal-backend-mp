const { Pool } = require('pg');

const NODE_ENV = process.env.NODE_ENV || 'development';
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL ||
  '';

if (!connectionString) {
  throw new Error(
    'No hay configuración de base de datos. Define DATABASE_URL (o POSTGRES_URL/NEON_DATABASE_URL).'
  );
}

const pool = new Pool({
  connectionString,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (error) => {
  console.error('❌ Error inesperado en pool PostgreSQL:', error.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
