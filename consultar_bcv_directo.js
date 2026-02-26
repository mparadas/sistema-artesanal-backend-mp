const https = require('https');

// Función para consultar directamente el BCV
async function consultarBCVDirecto() {
  try {
    console.log('🔍 Consultando directamente al Banco Central de Venezuela...');
    
    // Intentar con el endpoint oficial del BCV
    const options = {
      hostname: 'bcv.org.ve',
      path: '/api/tasas-informacion/tasas',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-VE,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
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
            console.log('📡 Respuesta recibida del BCV');
            console.log('Status:', res.statusCode);
            console.log('Headers:', res.headers);
            
            const jsonData = JSON.parse(data);
            console.log('📊 Datos parseados:', jsonData);
            
            // Buscar diferentes posibles estructuras de respuesta
            let tasaDolar = null;
            
            // Opción 1: Array de tasas
            if (Array.isArray(jsonData)) {
              tasaDolar = jsonData.find(t => 
                t.codigo === 'USD' || 
                t.nombre === 'Dólar estadounidense' ||
                t.nombre === 'Dólar' ||
                t.descripcion?.includes('dólar') ||
                t.descripcion?.includes('Dólar') ||
                t.moneda === 'USD'
              );
            }
            
            // Opción 2: Objeto con propiedades
            if (!tasaDolar && typeof jsonData === 'object') {
              // Buscar en diferentes propiedades posibles
              const posiblesKeys = ['dolar', 'usd', 'dolar_today', 'dolar_oficial', 'tasas', 'data'];
              for (const key of posiblesKeys) {
                if (jsonData[key]) {
                  if (typeof jsonData[key] === 'object' && jsonData[key].valor) {
                    tasaDolar = jsonData[key];
                    break;
                  } else if (typeof jsonData[key] === 'number') {
                    tasaDolar = { valor: jsonData[key], nombre: 'Dólar' };
                    break;
                  }
                }
              }
            }
            
            if (tasaDolar && tasaDolar.valor) {
              resolve({
                exito: true,
                tasa: parseFloat(tasaDolar.valor),
                fecha: new Date().toISOString().split('T')[0],
                fuente: 'BCV - API Oficial',
                datos_completos: jsonData,
                nota: 'Tasa obtenida directamente del BCV'
              });
            } else {
              resolve({
                exito: false,
                error: 'No se encontró la tasa del dólar en la respuesta',
                datos_recibidos: jsonData
              });
            }
          } catch (error) {
            console.error('Error parseando respuesta BCV:', error);
            resolve({
              exito: false,
              error: 'Error parseando respuesta: ' + error.message,
              respuesta_cruda: data.substring(0, 500)
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Error de conexión con BCV:', error);
        reject(new Error('Error conectando con BCV: ' + error.message));
      });
      
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Timeout al conectar con BCV (15s)'));
      });
      
      req.end();
    });
    
  } catch (error) {
    throw new Error('Error consultando BCV: ' + error.message);
  }
}

// Función para consultar fuentes alternativas
async function consultarFuentesAlternativas() {
  const fuentes = [
    {
      nombre: 'DolarToday',
      hostname: 'api.dolartoday.com',
      path: '/api/v1/dollar'
    },
    {
      nombre: 'MonitorDolar',
      hostname: 'api.monitordolar.net',
      path: '/api/v1/dollar'
    }
  ];
  
  for (const fuente of fuentes) {
    try {
      console.log(`🔍 Intentando con ${fuente.nombre}...`);
      
      const options = {
        hostname: fuente.hostname,
        path: fuente.path,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      };

      const resultado = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const jsonData = JSON.parse(data);
              resolve({
                exito: true,
                fuente: fuente.nombre,
                datos: jsonData
              });
            } catch (error) {
              resolve({
                exito: false,
                error: 'Error parseando respuesta',
                datos: data.substring(0, 200)
              });
            }
          });
        });
        
        req.on('error', (error) => reject(error));
        req.setTimeout(10000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });
      
      if (resultado.exito) {
        console.log(`✅ Éxito con ${fuente.nombre}`);
        return resultado;
      }
    } catch (error) {
      console.log(`❌ Error con ${fuente.nombre}:`, error.message);
    }
  }
  
  return { exito: false, error: 'Todas las fuentes alternativas fallaron' };
}

// Función principal
async function main() {
  console.log('🚀 Iniciando consulta directa al BCV y fuentes alternativas...\n');
  
  // Intentar con BCV primero
  console.log('1️⃣ Consultando BCV oficial...');
  try {
    const resultadoBCV = await consultarBCVDirecto();
    if (resultadoBCV.exito) {
      console.log('\n✅ ÉXITO - Tasa del BCV:');
      console.log('   Tasa:', resultadoBCV.tasa, 'BS/$');
      console.log('   Fecha:', resultadoBCV.fecha);
      console.log('   Fuente:', resultadoBCV.fuente);
      console.log('   Nota:', resultadoBCV.nota);
      return resultadoBCV;
    } else {
      console.log('\n❌ BCV falló:', resultadoBCV.error);
      console.log('   Datos recibidos:', resultadoBCV.datos_recibidos || resultadoBCV.respuesta_cruda);
    }
  } catch (error) {
    console.log('\n❌ Error BCV:', error.message);
  }
  
  // Intentar con fuentes alternativas
  console.log('\n2️⃣ Consultando fuentes alternativas...');
  try {
    const resultadoAlternativas = await consultarFuentesAlternativas();
    if (resultadoAlternativas.exito) {
      console.log('\n✅ ÉXITO - Fuente alternativa:');
      console.log('   Fuente:', resultadoAlternativas.fuente);
      console.log('   Datos:', resultadoAlternativas.datos);
      return resultadoAlternativas;
    } else {
      console.log('\n❌ Fuentes alternativas fallaron:', resultadoAlternativas.error);
    }
  } catch (error) {
    console.log('\n❌ Error fuentes alternativas:', error.message);
  }
  
  console.log('\n📄 Resumen:');
  console.log('   ❌ No se pudo obtener tasa de ninguna fuente');
  console.log('   💡 Recomendación: Ingresar tasa manualmente');
  
  return {
    exito: false,
    error: 'No se pudo obtener tasa de ninguna fuente',
    recomendacion: 'Ingresar tasa manualmente en el sistema'
  };
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().then(resultado => {
    console.log('\n🎯 Resultado final:', resultado);
  }).catch(error => {
    console.error('\n💥 Error fatal:', error);
  });
}

module.exports = { consultarBCVDirecto, consultarFuentesAlternativas };
