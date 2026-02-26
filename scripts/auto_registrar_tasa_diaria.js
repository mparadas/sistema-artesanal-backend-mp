const db = require('../config/database');
const cron = require('node-cron');

// Función para registrar automáticamente la tasa del día
async function registrarTasaDelDia() {
  try {
    console.log('🔄 Registrando automáticamente la tasa del día...');
    
    const hoy = new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe una tasa para hoy
    const existing = await db.query(
      'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
      [hoy]
    );
    
    if (existing.rows.length > 0) {
      console.log('ℹ️ Ya existe una tasa de cambio para hoy');
      return existing.rows[0];
    }
    
    // Obtener la tasa actual de la tabla tasas_cambio
    const currentRate = await db.query(
      'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY id DESC LIMIT 1',
      [hoy]
    );
    
    if (currentRate.rows.length > 0) {
      const rate = currentRate.rows[0];
      const result = await db.query(`
        INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        hoy,
        rate.tasa_bcv || 0,
        rate.tasa_bcv || 0,
        'sistema_automatico',
        '127.0.0.1',
        'Node.js Cron Job'
      ]);
      
      console.log('✅ Tasa de cambio del día registrada automáticamente:', result.rows[0]);
      return result.rows[0];
    } else {
      // Insertar tasa por defecto si no hay tasa activa
      const result = await db.query(`
        INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [
        hoy,
        50.00,
        52.00,
        'sistema_automatico',
        '127.0.0.1',
        'Node.js Cron Job'
      ]);
      
      console.log('✅ Tasa de cambio por defecto registrada automáticamente:', result.rows[0]);
      return result.rows[0];
    }
    
  } catch (error) {
    console.error('❌ Error al registrar automáticamente tasa:', error.message);
    return null;
  }
}

// Programar la tarea para que se ejecute todos los días a las 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('🕐 Ejecutando tarea programada: Registrar tasa de cambio del día');
  await registrarTasaDelDia();
});

// También ejecutar al iniciar el script
console.log('🚀 Iniciando servicio de registro automático de tasas de cambio');
console.log('⏰ Programado para ejecutar todos los días a las 8:00 AM');

// Ejecutar inmediatamente si no hay tasa para hoy
registrarTasaDelDia().then(result => {
  if (result) {
    console.log('📊 Tasa registrada:', result);
  } else {
    console.log('ℹ️ No se pudo registrar la tasa');
  }
});

// Mantener el proceso corriendo
process.on('SIGINT', () => {
  console.log('🛑 Deteniendo servicio de registro automático');
  process.exit(0);
});

console.log('📝 Servicio de registro automático corriendo. Presiona Ctrl+C para detener.');
