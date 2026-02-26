const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function testFinDeSemana() {
  try {
    console.log('🧪 Probando lógica de fin de semana...');
    
    // Insertar una tasa para el viernes pasado
    const viernes = new Date();
    viernes.setDate(viernes.getDate() - (viernes.getDay() + 2) % 7); // Viernes más reciente
    
    const tasaViernes = {
      fecha: viernes.toISOString().split('T')[0],
      tasa_bcv: 410.75,
      fuente: 'BCV - Prueba Viernes'
    };
    
    console.log('📅 Insertando tasa para el viernes:', tasaViernes.fecha);
    
    await pool.query(
      'INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente) VALUES ($1, $2, $3) ON CONFLICT (fecha) DO UPDATE SET tasa_bcv = $2, fuente = $3',
      [tasaViernes.fecha, tasaViernes.tasa_bcv, tasaViernes.fuente]
    );
    
    console.log('✅ Tasa de viernes insertada');
    
    // Probar endpoint actual
    const response = await fetch('http://localhost:3000/api/tasas-cambio/actual');
    const data = await response.json();
    
    console.log('🔍 Respuesta del endpoint:');
    console.log('   Tasa:', data.tasa_bcv);
    console.log('   Fecha de la tasa:', data.fecha);
    console.log('   Fuente:', data.fuente);
    console.log('   Es hoy:', data.es_hoy);
    console.log('   Es viernes aplicable:', data.es_viernes_aplicable);
    console.log('   Fecha aplicable:', data.fecha_aplicable);
    
    console.log('🎉 Prueba completada!');
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
  } finally {
    await pool.end();
  }
}

testFinDeSemana();
