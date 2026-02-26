const db = require('../config/database');

// Función para registrar automáticamente la tasa del día cuando se actualiza
async function registrarTasaDiariaAutomatica(tasa_bcv, usuario = 'sistema', ip_address = null, user_agent = null) {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe una tasa para hoy
    const existing = await db.query(
      'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
      [hoy]
    );
    
    if (existing.rows.length > 0) {
      // Actualizar la tasa existente
      const result = await db.query(`
        UPDATE tasas_cambio_diarias 
        SET tasa_bcv = $1, tasa_paralelo = $2, usuario = $3, ip_address = $4, user_agent = $5, actualizado_en = CURRENT_TIMESTAMP
        WHERE fecha = $6
        RETURNING *
      `, [tasa_bcv, tasa_bcv, usuario, ip_address, user_agent, hoy]);
      
      console.log('✅ Tasa de cambio diaria actualizada:', result.rows[0]);
      return result.rows[0];
    } else {
      // Crear nueva tasa
      const result = await db.query(`
        INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [hoy, tasa_bcv, tasa_bcv, usuario, ip_address, user_agent]);
      
      console.log('✅ Tasa de cambio diaria creada:', result.rows[0]);
      return result.rows[0];
    }
    
  } catch (error) {
    console.error('❌ Error al registrar tasa diaria automática:', error.message);
    return null;
  }
}

// Función para obtener la tasa del día actual
async function obtenerTasaDelDia() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    const result = await db.query(
      'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
      [hoy]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    } else {
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error al obtener tasa del día:', error.message);
    return null;
  }
}

// Función para verificar si se debe registrar la tasa del día
async function verificarYRegistrarTasaDiaria() {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe una tasa para hoy
    const existing = await db.query(
      'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
      [hoy]
    );
    
    if (existing.rows.length === 0) {
      console.log('🔍 No hay tasa registrada para hoy. Buscando en tabla principal...');
      
      // Obtener la tasa actual de la tabla tasas_cambio
      const currentRate = await db.query(
        'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY id DESC LIMIT 1',
        [hoy]
      );
      
      if (currentRate.rows.length > 0) {
        const rate = currentRate.rows[0];
        await registrarTasaDiariaAutomatica(rate.tasa_bcv, 'sistema_automatico');
      } else {
        console.log('⚠️ No hay tasa activa para hoy en la tabla principal');
      }
    } else {
      console.log('ℹ️ Ya existe una tasa registrada para hoy');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar y registrar tasa diaria:', error.message);
  }
}

module.exports = {
  registrarTasaDiariaAutomatica,
  obtenerTasaDelDia,
  verificarYRegistrarTasaDiaria
};
