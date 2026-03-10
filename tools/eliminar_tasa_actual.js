const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function eliminarTasaActual() {
  try {
    console.log('🔍 Buscando registro con tasa 36.50...');
    
    // Buscar el registro específico
    const result = await pool.query(
      'SELECT * FROM tasas_cambio WHERE tasa_bcv = 36.5000'
    );
    
    if (result.rows.length === 0) {
      console.log('ℹ️ No se encontró registro con tasa 36.50');
      return;
    }
    
    console.log(`📊 Encontrados ${result.rows.length} registros con tasa 36.50:`);
    result.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Fecha: ${row.fecha}, Tasa: ${row.tasa_bcv}`);
    });
    
    // Borrar los registros
    const deleteResult = await pool.query(
      'DELETE FROM tasas_cambio WHERE tasa_bcv = 36.5000'
    );
    
    console.log(`✅ Se eliminaron ${deleteResult.rowCount} registros con tasa 36.50`);
    
    // Verificar el estado final de la tabla
    const verificacion = await pool.query(
      'SELECT * FROM tasas_cambio ORDER BY fecha DESC'
    );
    
    if (verificacion.rows.length === 0) {
      console.log('⚠️ La tabla tasas_cambio está vacía');
      console.log('💡 Recomendación: Insertar una nueva tasa usando el endpoint POST /api/tasas-cambio');
    } else {
      console.log('\n📋 Estado actual de la tabla tasas_cambio:');
      console.log('ID\t|\tFECHA\t\t|\tTASA BCV\t|\tFUENTE\t\t|\tACTIVA');
      console.log('---\t|--------\t\t|\t---------\t|\t-------\t\t|\t-------');
      
      verificacion.rows.forEach(row => {
        console.log(
          `${row.id}\t|\t${row.fecha}\t|\t${row.tasa_bcv}\t|\t${row.fuente}\t|\t${row.activa}`
        );
      });
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar tasa:', error.message);
  } finally {
    await pool.end();
  }
}

eliminarTasaActual();
