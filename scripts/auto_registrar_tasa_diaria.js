const db = require('../config/database');
const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

// Función para hacer scraping de la página del BCV
async function obtenerTasaBCV() {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await axios.get('https://www.bcv.org.ve/', {
      httpsAgent: agent,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    // El texto se encuentra dentro de div#dolar > div.centrado > strong
    const dolarTexto = $('#dolar strong').text().trim();
    if (!dolarTexto) {
      throw new Error('No se pudo encontrar el valor del dólar en el DOM del BCV');
    }
    
    // Parsear el texto a número: '24,50' -> 24.50
    const tasa = parseFloat(dolarTexto.replace(',', '.'));
    if (isNaN(tasa)) {
       throw new Error(`Error al parsear la tasa: ${dolarTexto}`);
    }
    
    return tasa;
  } catch (error) {
    console.error('Error haciendo scraping al BCV:', error.message);
    return null;
  }
}

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
      console.log('ℹ️ Ya existe una tasa de cambio diaria para hoy:', existing.rows[0]);
      return existing.rows[0];
    }
    
    // Obtenemos la tasa oficial consultando la web del BCV
    console.log('🌐 Consultando tasa en el portal web de BCV...');
    let tasaBcvOficial = await obtenerTasaBCV();
    
    // Fallback: si falla el scraping, obtener la última tasa activa en nuestra base
    if (!tasaBcvOficial) {
      const currentRate = await db.query(
        'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY id DESC LIMIT 1'
      );
      tasaBcvOficial = currentRate.rows.length > 0 ? parseFloat(currentRate.rows[0].tasa_bcv) : 50.00;
      console.log(`⚠️ Scraping falló. Usando tasa de respaldo (${tasaBcvOficial}) de la base de datos local.`);
    } else {
      console.log(`✅ Scraping exitoso. Tasa BCV web leída: ${tasaBcvOficial}`);
    }
    
    const result = await db.query(`
      INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      hoy,
      tasaBcvOficial,
      tasaBcvOficial, // Asumiendo temporalmente paralelo igual que bcv para registro automático
      'sistema_automatico',
      '127.0.0.1',
      'Node.js Cron Job'
    ]);
    
    // Opcionalmente, agregarla a la tabla principal 'tasas_cambio'
    await db.query(
      'INSERT INTO tasas_cambio (tasa_bcv, tasa_paralelo, fecha, creada_por, activa) VALUES ($1, $2, CURRENT_DATE, $3, true)',
      [tasaBcvOficial, tasaBcvOficial, 'sistema']
    );
    
    console.log('✅ Tasa de cambio del día registrada en BD:', result.rows[0]);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error al registrar automáticamente tasa:', error.message);
    return null;
  }
}

// Programar la tarea para que se ejecute todos los días a las 2:30 PM (14:30)
cron.schedule('30 14 * * *', async () => {
  console.log('🕐 Ejecutando tarea programada (2:30 PM): Registrar tasa de cambio del día según BCV');
  await registrarTasaDelDia();
});

console.log('🚀 Iniciando servicio de registro automático de tasas de cambio');
console.log('⏰ Programado para ejecutar todos los días a las 2:30 PM (scraping BCV)');

// Ejecutar inmediatamente si no hay tasa para hoy
registrarTasaDelDia().then(result => {
  if (result) {
    console.log('📊 Verificación inicial de la tasa diaria completada.');
  }
});

// Llamada de prueba al iniciar (para verificar el DOM)
obtenerTasaBCV().then(t => console.log('Tasa de prueba leída al arrancar:', t));

// Mantener el proceso corriendo
process.on('SIGINT', () => {
  console.log('🛑 Deteniendo servicio de registro automático');
  process.exit(0);
});

console.log('📝 Servicio de registro automático corriendo. Presiona Ctrl+C para detener.');
