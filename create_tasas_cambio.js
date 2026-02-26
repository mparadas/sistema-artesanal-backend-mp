const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function crearTablaTasasCambio() {
  try {
    console.log('🔧 Creando tabla tasas_cambio...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasas_cambio (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL UNIQUE,
        tasa_bcv DECIMAL(10,4) NOT NULL,
        fuente VARCHAR(100) DEFAULT 'BCV',
        activa BOOLEAN DEFAULT true,
        creado_en TIMESTAMP DEFAULT NOW(),
        actualizado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('✅ Tabla tasas_cambio creada exitosamente');
    
    // Insertar tasa por defecto si no hay datos
    const result = await pool.query('SELECT COUNT(*) as total FROM tasas_cambio');
    if (result.rows[0].total === 0) {
      const fechaHoy = new Date().toISOString().split('T')[0];
      await pool.query(
        'INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente) VALUES ($1, $2, $3)',
        [fechaHoy, 40.00, 'BCV - Valor por defecto']
      );
      console.log('📊 Tasa por defecto insertada: 40.00 BS/$ para hoy');
    }
    
    console.log('🎉 Configuración de tasas de cambio completada');
    
  } catch (error) {
    console.error('❌ Error creando tabla tasas_cambio:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar la función
crearTablaTasasCambio();
