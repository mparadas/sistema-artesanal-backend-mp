const { Pool } = require('pg');
require('dotenv').config();
const cheerio = require('cheerio');
const axios = require('axios');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function extraerTasaBCVWeb() {
  try {
    console.log('🔍 Extrayendo tasa del dólar desde el sitio del BCV...');
    
    // URL del BCV
    const url = 'https://www.bcv.org.ve/';
    
    // Hacer la petición HTTP
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4474.183.110 Safari/537.36'
      }
    });
    
    // Parsear el HTML con Cheerio
    const $ = cheerio.load(response.data);
    
    // Buscar el div con id="dolar" y encontrar el valor
    const dolarDiv = $('#dolar .field-content .row .col-sm-6.col-xs-6.centrado strong');
    
    if (!dolarDiv || dolarDiv.length === 0) {
      console.log('❌ No se encontró el elemento del dólar en la página');
      return;
    }
    
    // Extraer el texto y limpiarlo
    let tasaTexto = dolarDiv.text().trim();
    console.log('📊 Texto encontrado:', tasaTexto);
    
    // Limpiar el texto: quitar espacios y caracteres especiales
    tasaTexto = tasaTexto.replace(/[^\d.,]/g, '');
    tasaTexto = tasaTexto.replace(',', '.'); // Reemplazar coma por punto
    
    const tasa = parseFloat(tasaTexto);
    
    if (isNaN(tasa) || tasa <= 0) {
      console.log('❌ No se pudo convertir el texto a número válido');
      return;
    }
    
    console.log('✅ Tasa del dólar extraída:', tasa, 'BS/$');
    
    // Obtener la fecha actual
    const hoy = new Date().toISOString().split('T')[0];
    
    // Verificar si ya existe una tasa para hoy
    const existente = await pool.query(
      'SELECT * FROM tasas_cambio WHERE fecha = $1',
      [hoy]
    );
    
    if (existente.rows.length > 0) {
      // Actualizar el registro existente
      await pool.query(`
        UPDATE tasas_cambio 
        SET tasa_bcv = $1, fuente = 'BCV - Web Scraping', actualizado_en = NOW()
        WHERE fecha = $2
      `, [tasa, hoy]);
      
      console.log('✅ Tasa actualizada para hoy:', tasa, 'BS/$');
    } else {
      // Insertar nuevo registro
      await pool.query(`
        INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente, activa) 
        VALUES ($1, $2, $3, $4)
      `, [hoy, tasa, 'BCV - Web Scraping', true]);
      
      console.log('✅ Nueva tasa insertada para hoy:', tasa, 'BS/$');
    }
    
    // Verificar el resultado
    const verificacion = await pool.query(
      'SELECT * FROM tasas_cambio ORDER BY fecha DESC LIMIT 5'
    );
    
    console.log('\n📋 Últimas tasas registradas:');
    console.log('ID\t|\tFECHA\t\t|\tTASA BCV\t|\tFUENTE\t\t|\tACTIVA');
    console.log('---\t|--------\t\t|\t---------\t|\t-------\t\t|\t-------');
    
    verificacion.rows.forEach(row => {
      console.log(
        `${row.id}\t|\t${row.fecha}\t|\t${row.tasa_bcv}\t|\t${row.fuente}\t|\t${row.activa}`
      );
    });
    
    return tasa;
    
  } catch (error) {
    console.error('❌ Error al extraer tasa del BCV:', error.message);
    
    // Si falla el web scraping, insertar una tasa por defecto
    console.log('💡 Insertando tasa por defecto debido al error...');
    const hoy = new Date().toISOString().split('T')[0];
    const tasaDefecto = 36.50;
    
    try {
      const existente = await pool.query(
        'SELECT * FROM tasas_cambio WHERE fecha = $1',
        [hoy]
      );
      
      if (existente.rows.length === 0) {
        await pool.query(`
          INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente, activa) 
          VALUES ($1, $2, $3, $4)
        `, [hoy, tasaDefecto, 'Tasa por Defecto - Error Web Scraping', true]);
        
        console.log('✅ Tasa por defecto insertada:', tasaDefecto, 'BS/$');
      }
    } catch (dbError) {
      console.error('❌ Error al insertar tasa por defecto:', dbError.message);
    }
    
  } finally {
    await pool.end();
  }
}

extraerTasaBCVWeb();
