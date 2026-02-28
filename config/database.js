const { Pool } = require('pg');

// NO cargar dotenv - usar solo variables de entorno de Render
// require('dotenv').config(); // Comentado para evitar conflicto

// Debug: Mostrar variables de entorno
console.log('🔍 Variables de entorno BD (sin dotenv):');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Definida' : '❌ No definida');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? '✅ Definida' : '❌ No definida');
console.log('NEON_DATABASE_URL:', process.env.NEON_DATABASE_URL ? '✅ Definida' : '❌ No definida');

// Forzar uso de Neon - usar directamente la URL de Render
const neonUrl = process.env.DATABASE_URL;

console.log('🔍 URL directa de DATABASE_URL:', neonUrl ? neonUrl.substring(0, 50) + '...' : '❌ No definida');

// Configuración forzada a Neon
const config = neonUrl 
  ? {
      connectionString: neonUrl,
      ssl: { rejectUnauthorized: false }
    }
  : (() => {
      throw new Error('❌ DATABASE_URL no está definida. Configura la variable en Render.')
    })();

console.log('🔍 Configuración BD forzada a Neon');

const pool = new Pool(config);

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a Neon:', err.message);
    } else {
        console.log('✅ Conectado a Neon exitosamente');
        console.log('🔍 Probando consulta de productos...');
        
        // Probar consulta para verificar qué BD estamos usando
        client.query('SELECT COUNT(*) FROM productos', (err, result) => {
            if (err) {
                console.error('❌ Error consultando productos:', err.message);
            } else {
                console.log('📊 Total productos en BD:', result.rows[0].count);
                if (parseInt(result.rows[0].count) === 0) {
                    console.log('📍 Conectado a NEON (tabla vacía) ✅');
                } else {
                    console.log('📍 Conectado a LOCALHOST (con datos) ❌');
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
