const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function verTasasCambio() {
  try {
    console.log('🔍 Consultando tabla tasas_cambio...\n');
    
    // Consultar todas las tasas
    const result = await pool.query('SELECT * FROM tasas_cambio ORDER BY fecha DESC');
    
    if (result.rows.length === 0) {
      console.log('❌ No hay registros en la tabla tasas_cambio');
      return;
    }
    
    console.log(`📊 Encontrados ${result.rows.length} registros en tasas_cambio:\n`);
    console.log('ID\t|\tFECHA\t\t|\tTASA BCV\t|\tFUENTE\t\t|\tACTIVA\t|\tCREADO EN');
    console.log('---\t|--------\t\t|\t---------\t|\t-------\t\t|\t-------\t|\t-----------');
    
    result.rows.forEach(row => {
      console.log(
        `${row.id}\t|\t${row.fecha}\t|\t${row.tasa_bcv}\t\t|\t${row.fuente}\t|\t${row.activa}\t|\t${row.creado_en}`
      );
    });
    
    console.log('\n🎯 Última tasa activa:');
    const ultimaActiva = await pool.query(
      'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC LIMIT 1'
    );
    
    if (ultimaActiva.rows.length > 0) {
      const tasa = ultimaActiva.rows[0];
      console.log(`📈 Tasa: ${tasa.tasa_bcv} BS/$`);
      console.log(`📅 Fecha: ${tasa.fecha}`);
      console.log(`🏢 Fuente: ${tasa.fuente}`);
      console.log(`✅ Activa: ${tasa.activa}`);
      console.log(`⏰ Creada: ${tasa.creado_en}`);
    } else {
      console.log('❌ No hay tasas activas');
    }
    
  } catch (error) {
    console.error('❌ Error al consultar tasas_cambio:', error.message);
  } finally {
    await pool.end();
  }
}

verTasasCambio();
