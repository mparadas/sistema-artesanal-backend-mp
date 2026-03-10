const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function corregirTasas() {
  try {
    console.log('🔧 Corrigiendo tasas de cambio...');
    
    // Eliminar todas las tasas incorrectas
    await pool.query('DELETE FROM tasas_cambio WHERE tasa_bcv != 405.351');
    console.log('🗑️ Tasas incorrectas eliminadas');
    
    // Asegurarse que exista la tasa correcta
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    await pool.query(`
      INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente, activa) 
      VALUES ($1, 405.351, 'BCV - Oficial', true)
      ON CONFLICT (fecha) DO UPDATE SET 
        tasa_bcv = 405.351, 
        fuente = 'BCV - Oficial',
        activa = true,
        actualizado_en = NOW()
    `, [fechaHoy]);
    
    console.log('✅ Tasa correcta configurada: 405.351 BS/$');
    
    // Verificar resultado
    const result = await pool.query('SELECT * FROM tasas_cambio ORDER BY fecha DESC');
    console.log('📊 Tasas configuradas:');
    result.rows.forEach(tasa => {
      console.log(`   ${tasa.fecha}: ${tasa.tasa_bcv} BS/$ - ${tasa.fuente}`);
    });
    
    // Probar endpoint
    const response = await fetch('http://localhost:3000/api/tasas-cambio/actual');
    const data = await response.json();
    
    console.log('🔍 Verificación del endpoint:');
    console.log('   Tasa actual:', data.tasa_bcv, 'BS/$');
    console.log('   Fuente:', data.fuente);
    console.log('   Fecha:', data.fecha);
    console.log('   Es hoy:', data.es_hoy);
    
    console.log('🎉 Corrección completada correctamente!');
    
  } catch (error) {
    console.error('❌ Error corrigiendo tasas:', error.message);
  } finally {
    await pool.end();
  }
}

corregirTasas();
