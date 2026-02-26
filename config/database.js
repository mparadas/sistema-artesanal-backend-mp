const { Pool } = require('pg');
require('dotenv').config();

// Configuración mediante variables de entorno. Coloca un archivo `backend/.env` con los valores.
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'inventario_artesanal',
    password: process.env.DB_PASS || 'MAP24',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    ssl: process.env.DB_SSL === 'true' || false
});

// Test de conexión
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
        console.log('');
        console.log('💡 Verifica que:');
        console.log('   1. PostgreSQL esté instalado');
        console.log('   2. El servicio esté corriendo (services.msc)');
        console.log('   3. La contraseña y variables en backend/.env sean correctas');
        console.log('   4. La base de datos "' + (process.env.DB_NAME || 'inventario_artesanal') + '" exista');
    } else {
        console.log('✅ Conectado a PostgreSQL (host=' + (process.env.DB_HOST || 'localhost') + ')');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};