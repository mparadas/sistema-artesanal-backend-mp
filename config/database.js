const { Pool } = require('pg');

// FORZADO ABSOLUTO - Hardcodear URL de Neon directamente
const NEON_URL = 'postgresql://neondb_owner:npg_J0riUelqOd3V@ep-misty-sunset-aikmuhdd-pooler.c-4.us-east-1.aws.neon.tech/sistema-artesanal?sslmode=require&channel_binding=require';

console.log('🔍 FORZADO - Usando URL de Neon hardcodeada:');
console.log('🔍 URL:', NEON_URL.substring(0, 50) + '...');

// Configuración hardcodeada a Neon
const config = {
  connectionString: NEON_URL,
  ssl: { rejectUnauthorized: false }
};

console.log('🔍 Configuración BD hardcodeada a Neon');

const pool = new Pool(config);

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a Neon:', err.message);
    } else {
        console.log('✅ Conectado a Neon exitosamente (HARDCODEADO)');
        console.log('🔍 Probando consulta de productos...');
        
        // Probar consulta para verificar qué BD estamos usando
        client.query('SELECT COUNT(*) FROM productos', (err, result) => {
            if (err) {
                console.error('❌ Error consultando productos:', err.message);
            } else {
                console.log('📊 Total productos en BD:', result.rows[0].count);
                if (parseInt(result.rows[0].count) === 0) {
                    console.log('📍 Conectado a NEON (tabla vacía) ✅✅✅');
                } else {
                    console.log('📍 Conectado a LOCALHOST (con datos) ❌❌❌');
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
