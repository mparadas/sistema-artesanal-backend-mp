const { Pool } = require('pg');
require('dotenv').config();

// Debug: Mostrar variables de entorno
console.log('🔍 Variables de entorno BD:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definida' : '❌ No definida');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? '✅ Definida' : '❌ No definida');
console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? '✅ Definida' : '❌ No definida');

// Configuración inteligente: usa Render si existe DATABASE_URL, sino usa local.
const config = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Obligatorio para Neon y Render
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'inventario_artesanal',
      password: process.env.DB_PASS || 'MAP24',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      ssl: false
    };

console.log('🔍 Configuración BD:', {
  connectionString: config.connectionString || 'localhost fallback',
  ssl: config.ssl
});

const pool = new Pool(config);

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL exitosamente');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
