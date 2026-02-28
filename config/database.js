const { Pool } = require('pg');
require('dotenv').config();

// Debug: Mostrar variables de entorno
console.log('🔍 Variables de entorno BD:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definida' : '❌ No definida');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? '✅ Definida' : '❌ No definida');
console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? '✅ Definida' : '❌ No definida');

// Forzar uso de Neon - prioridad absoluta a las variables de Neon
const neonUrl = process.env.DATABASE_URL || 
                process.env.POSTGRES_URL || 
                process.env.NEON_DATABASE_URL;

console.log('🔍 URL seleccionada:', neonUrl ? 'Neon URL' : '❌ No hay URL de Neon');

// Configuración forzada a Neon
const config = neonUrl 
  ? {
      connectionString: neonUrl,
      ssl: { rejectUnauthorized: false } // Obligatorio para Neon
    }
  : {
      // Solo como último recurso usar localhost
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
        console.log('🔍 Probando consulta de productos...');
        
        // Probar consulta para verificar qué BD estamos usando
        client.query('SELECT COUNT(*) FROM productos', (err, result) => {
            if (err) {
                console.error('❌ Error consultando productos:', err.message);
            } else {
                console.log('📊 Total productos en BD:', result.rows[0].count);
                if (parseInt(result.rows[0].count) === 0) {
                    console.log('📍 Conectado a NEON (tabla vacía)');
                } else {
                    console.log('📍 Conectado a LOCALHOST (con datos)');
                }
            }
            release();
        });
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
