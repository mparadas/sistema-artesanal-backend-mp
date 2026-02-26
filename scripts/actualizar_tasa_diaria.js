const { Pool } = require('pg');
const { obtenerTasaDiaria } = require('../services/tasa_bcv_service');

require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function actualizarTasaDiaria() {
  try {
    console.log('🔄 Iniciando actualización de tasa diaria...');
    
    // Obtener tasa actual
    const tasaData = await obtenerTasaDiaria();
    console.log('📊 Tasa obtenida:', tasaData);
    
    // Verificar si ya existe una tasa para hoy
    const fechaHoy = new Date().toISOString().split('T')[0];
    const existente = await pool.query(
      'SELECT id, tasa_bcv FROM tasas_cambio WHERE fecha = $1',
      [fechaHoy]
    );
    
    if (existente.rows.length > 0) {
      // Actualizar tasa existente
      await pool.query(
        'UPDATE tasas_cambio SET tasa_bcv = $1, fuente = $2, actualizado_en = NOW() WHERE fecha = $3',
        [tasaData.tasa, tasaData.fuente, fechaHoy]
      );
      console.log('✅ Tasa actualizada para hoy:', tasaData.tasa);
    } else {
      // Insertar nueva tasa
      await pool.query(
        'INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente) VALUES ($1, $2, $3)',
        [fechaHoy, tasaData.tasa, tasaData.fuente]
      );
      console.log('✅ Nueva tasa insertada para hoy:', tasaData.tasa);
    }
    
    console.log('🎉 Actualización completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error actualizando tasa diaria:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  actualizarTasaDiaria();
}

module.exports = { actualizarTasaDiaria };
