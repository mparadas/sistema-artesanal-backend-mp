const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');

function parsearTasaDesdeTexto(valorTexto) {
  if (!valorTexto || typeof valorTexto !== 'string') return null;
  let limpio = valorTexto.replace(/[^\d.,]/g, '').trim();
  if (!limpio) return null;
  const tienePunto = limpio.includes('.');
  const tieneComa = limpio.includes(',');
  if (tienePunto && tieneComa) {
    // Formato típico es-VE: 1.234,56
    limpio = limpio.replace(/\./g, '').replace(',', '.');
  } else if (tieneComa) {
    // Formato con coma decimal: 1234,56
    limpio = limpio.replace(',', '.');
  } else {
    // Formato con punto decimal: 1234.56
    limpio = limpio;
  }
  const tasa = parseFloat(limpio);
  return Number.isFinite(tasa) && tasa > 0 ? tasa : null;
}

// Extrae la tasa del dólar desde el HTML público del BCV
async function obtenerTasaBCVWeb() {
  try {
    let response;
    try {
      response = await axios.get('https://www.bcv.org.ve/', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
    } catch (errorInicial) {
      // Entornos Windows/Node pueden fallar por certificados intermedios del BCV.
      // Reintento controlado para no romper la actualización automática.
      response = await axios.get('https://www.bcv.org.ve/', {
        timeout: 15000,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
    }

    const $ = cheerio.load(response.data);
    const posiblesSelectores = [
      '#dolar .field-content .row .col-sm-6.col-xs-6.centrado strong',
      '#dolar strong',
      '#dolar .centrado strong',
      '[id*="dolar"] strong'
    ];

    let texto = '';
    for (const selector of posiblesSelectores) {
      const candidato = $(selector).first().text().trim();
      if (candidato) {
        texto = candidato;
        break;
      }
    }

    const tasa = parsearTasaDesdeTexto(texto);
    if (!tasa) {
      throw new Error('No se pudo extraer una tasa válida desde el HTML del BCV');
    }

    return {
      tasa,
      fecha: new Date().toISOString().split('T')[0],
      fuente: 'BCV - Web Scraping'
    };
  } catch (error) {
    throw new Error('Error extrayendo tasa BCV web: ' + error.message);
  }
}

// Función para obtener la tasa del BCV desde su API oficial
async function obtenerTasaBCV() {
  try {
    // API del BCV - Endpoint para tasa de cambio del dólar
    const options = {
      hostname: 'bcv.org.ve',
      path: '/api/tasas-informacion/tasas',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            // Buscar la tasa del dólar en la respuesta
            const tasas = jsonData?.data || [];
            const tasaDolar = tasas.find(t => 
              t.codigo === 'USD' || 
              t.nombre === 'Dólar estadounidense' ||
              t.descripcion?.includes('dólar')
            );
            
            if (tasaDolar && tasaDolar.valor) {
              resolve({
                tasa: parseFloat(tasaDolar.valor),
                fecha: new Date().toISOString().split('T')[0],
                fuente: 'BCV - API Oficial'
              });
            } else {
              reject(new Error('No se encontró la tasa del dólar en la respuesta del BCV'));
            }
          } catch (error) {
            reject(new Error('Error parsing BCV response: ' + error.message));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error('Error conectando con BCV: ' + error.message));
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout al conectar con BCV'));
      });
      
      req.end();
    });
    
  } catch (error) {
    throw new Error('Error obteniendo tasa BCV: ' + error.message);
  }
}

// Función para obtener tasa desde fuentes alternativas
async function obtenerTasaAlternativa() {
  try {
    // Intentar con DolarToday (como alternativa)
    const options = {
      hostname: 'api.dolartoday.com',
      path: '/api/v1/dollar',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            
            if (jsonData && jsonData.usd && jsonData.usd.promedio_real) {
              resolve({
                tasa: parseFloat(jsonData.usd.promedio_real),
                fecha: new Date().toISOString().split('T')[0],
                fuente: 'DolarToday - API'
              });
            } else {
              reject(new Error('Formato de respuesta inválido de DolarToday'));
            }
          } catch (error) {
            reject(new Error('Error parsing DolarToday response: ' + error.message));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(new Error('Error conectando con DolarToday: ' + error.message));
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout al conectar con DolarToday'));
      });
      
      req.end();
    });
    
  } catch (error) {
    throw new Error('Error obteniendo tasa alternativa: ' + error.message);
  }
}

// Función principal que intenta obtener la tasa de múltiples fuentes
async function obtenerTasaDiaria() {
  console.log('🔍 Obteniendo tasa de cambio diaria...');

  // 1) Intentar primero con scraping web del BCV (texto plano)
  try {
    const tasaWeb = await obtenerTasaBCVWeb();
    console.log('✅ Tasa BCV web obtenida:', tasaWeb);
    return tasaWeb;
  } catch (errorWeb) {
    console.warn('⚠️ Error con BCV web scraping:', errorWeb.message);
  }

  // 2) Fallback: API oficial BCV
  try {
    const tasaBCV = await obtenerTasaBCV();
    console.log('✅ Tasa BCV obtenida:', tasaBCV);
    return tasaBCV;
  } catch (errorBCV) {
    console.warn('⚠️ Error con BCV:', errorBCV.message);
    
    // 3) Fallback: fuente alternativa
    try {
      const tasaAlternativa = await obtenerTasaAlternativa();
      console.log('✅ Tasa alternativa obtenida:', tasaAlternativa);
      return tasaAlternativa;
    } catch (errorAlternativa) {
      console.warn('⚠️ Error con fuente alternativa:', errorAlternativa.message);
      
      // Si todo falla, retornar tasa por defecto
      console.log('📊 Usando tasa por defecto: 40.00');
      return {
        tasa: 40.00,
        fecha: new Date().toISOString().split('T')[0],
        fuente: 'Valor por defecto - Error en APIs'
      };
    }
  }
}

module.exports = {
  obtenerTasaDiaria,
  obtenerTasaBCVWeb,
  obtenerTasaBCV,
  obtenerTasaAlternativa
};
