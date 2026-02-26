const db = require('../config/database');

async function crearTablaTasasCambioDiarias() {
  try {
    console.log('🔍 Creando tabla de tasas de cambio diarias...');
    
    // Crear la tabla
    await db.query(`
      CREATE TABLE IF NOT EXISTS tasas_cambio_diarias (
        id SERIAL PRIMARY KEY,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        tasa_bcv DECIMAL(10, 2) NOT NULL,
        tasa_paralelo DECIMAL(10, 2) NOT NULL,
        usuario VARCHAR(100) DEFAULT 'sistema',
        ip_address VARCHAR(45),
        user_agent TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla tasas_cambio_diarias creada');
    
    // Crear índices
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha ON tasas_cambio_diarias(fecha)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tasas_cambio_usuario ON tasas_cambio_diarias(usuario)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha_usuario ON tasas_cambio_diarias(fecha, usuario)`);
    console.log('✅ Índices creados');
    
    // Verificar si ya hay una tasa para hoy
    const hoy = new Date().toISOString().split('T')[0];
    const existingRate = await db.query(
      'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
      [hoy]
    );
    
    if (existingRate.rows.length === 0) {
      // Obtener la tasa actual de la tabla tasas_cambio
      const currentRate = await db.query(
        'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY id DESC LIMIT 1',
        [hoy]
      );
      
      if (currentRate.rows.length > 0) {
        const rate = currentRate.rows[0];
        await db.query(`
          INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          hoy,
          rate.tasa_bcv || 0,
          rate.tasa_bcv || 0, // Usamos la misma tasa para paralelo por ahora
          'sistema',
          '127.0.0.1',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]);
        console.log('✅ Tasa de cambio del día actual registrada:', rate.tasa_bcv);
      } else {
        console.log('ℹ️ No hay tasa de cambio activa para hoy. Insertando tasa por defecto...');
        // Insertar una tasa por defecto para hoy
        await db.query(`
          INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          hoy,
          50.00, // Tasa por defecto
          52.00, // Tasa paralelo por defecto
          'sistema',
          '127.0.0.1',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]);
        console.log('✅ Tasa de cambio por defecto registrada');
      }
    } else {
      console.log('ℹ️ Ya existe una tasa de cambio para hoy');
    }
    
    console.log('🎉 Tabla de tasas de cambio diarias configurada exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error al crear tabla:', error.message);
    process.exit(1);
  }
}

crearTablaTasasCambioDiarias();
