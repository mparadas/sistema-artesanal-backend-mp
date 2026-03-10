const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function borrarTasaIncorrecta() {
  try {
    console.log('🔍 Buscando registro con tasa 410.50...');
    
    // Buscar el registro específico
    const result = await pool.query(
      'SELECT * FROM tasas_cambio WHERE tasa_bcv = 410.5000'
    );
    
    if (result.rows.length === 0) {
      console.log('ℹ️ No se encontró registro con tasa 410.50');
      return;
    }
    
    console.log(`📊 Encontrados ${result.rows.length} registros con tasa 410.50:`);
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Fecha: ${row.fecha}, Tasa: ${row.tasa_bcv}`);
    });
    
    // Borrar los registros
    const deleteResult = await pool.query(
      'DELETE FROM tasas_cambio WHERE tasa_bcv = 410.5000'
    );
    
    console.log(`✅ Se eliminaron ${deleteResult.rowCount} registros con tasa 410.50`);
    
    // Insertar una tasa más realista para hoy
    const hoy = new Date().toISOString().split('T')[0];
    const tasaRealista = 36.50; // Tasa más realista
    
    await pool.query(`
      INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente, activa) 
      VALUES ($1, $2, $3, $4)
    `, [hoy, tasaRealista, 'BCV - Tasa Realista', true]);
    
    console.log(`✅ Se insertó nueva tasa realista: ${tasaRealista} BS/$ para hoy (${hoy})`);
    
    // Verificar el resultado
    const verificacion = await pool.query(
      'SELECT * FROM tasas_cambio ORDER BY fecha DESC'
    );
    
    console.log('\n📋 Estado actual de la tabla tasas_cambio:');
    console.log('ID\t|\tFECHA\t\t|\tTASA BCV\t|\tFUENTE\t\t|\tACTIVA');
    console.log('---\t|--------\t\t|\t---------\t|\t-------\t\t|\t-------');
    
    verificacion.rows.forEach(row => {
      console.log(
        `${row.id}\t|\t${row.fecha}\t|\t${row.tasa_bcv}\t|\t${row.fuente}\t|\t${row.activa}`
      );
    });
    
  } catch (error) {
    console.error('❌ Error al procesar tasas:', error.message);
  } finally {
    await pool.end();
  }
}

borrarTasaIncorrecta();
