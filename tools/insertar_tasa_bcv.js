const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function insertarTasaBCV() {
  try {
    console.log('🔧 Insertando tasa BCV oficial...');
    
    // Tasa oficial del BCV: 405.351 BS/$
    const tasaData = {
      fecha: '2026-02-21',
      tasa_bcv: 405.351,
      fuente: 'BCV - Oficial'
    };
    
    console.log('📊 Datos a insertar:', tasaData);
    
    // Verificar si ya existe una tasa para hoy
    const existente = await pool.query(
      'SELECT id, tasa_bcv FROM tasas_cambio WHERE fecha = $1',
      [tasaData.fecha]
    );
    
    if (existente.rows.length > 0) {
      // Actualizar tasa existente
      await pool.query(
        'UPDATE tasas_cambio SET tasa_bcv = $1, fuente = $2, actualizado_en = NOW() WHERE fecha = $3',
        [tasaData.tasa_bcv, tasaData.fuente, tasaData.fecha]
      );
      console.log('✅ Tasa BCV actualizada para hoy:', tasaData.tasa_bcv);
    } else {
      // Insertar nueva tasa
      await pool.query(
        'INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente) VALUES ($1, $2, $3)',
        [tasaData.fecha, tasaData.tasa_bcv, tasaData.fuente]
      );
      console.log('✅ Nueva tasa BCV insertada para hoy:', tasaData.tasa_bcv);
    }
    
    // Verificar que se insertó correctamente
    const verificacion = await pool.query(
      'SELECT * FROM tasas_cambio WHERE fecha = $1',
      [tasaData.fecha]
    );
    
    console.log('🔍 Verificación:', verificacion.rows[0]);
    console.log('🎉 Tasa BCV oficial configurada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error insertando tasa BCV:', error.message);
  } finally {
    await pool.end();
  }
}

insertarTasaBCV();
