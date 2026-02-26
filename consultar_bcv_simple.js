const https = require('https');

// Función para consultar BCV ignorando certificados SSL (solo para prueba)
async function consultarBCVIgnorandoSSL() {
  try {
    console.log('🔍 Consultando BCV (ignorando SSL)...');
    
    const options = {
      hostname: 'bcv.org.ve',
      path: '/api/tasas-informacion/tasas',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      // Ignorar verificación de certificados SSL
      rejectUnauthorized: false
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('📡 Status:', res.statusCode);
          console.log('📄 Longitud respuesta:', data.length);
          console.log('📄 Primeros 500 caracteres:', data.substring(0, 500));
          
          try {
            const jsonData = JSON.parse(data);
            resolve({
              exito: true,
              status: res.statusCode,
              datos: jsonData,
              longitud: data.length
            });
          } catch (error) {
            resolve({
              exito: false,
              error: 'Error parseando JSON: ' + error.message,
              respuesta_cruda: data.substring(0, 1000)
            });
          }
        });
      });
      
      req.on('error', (error) => {
        console.error('Error de conexión:', error);
        reject(error);
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    });
    
  } catch (error) {
    throw new Error('Error: ' + error.message);
  }
}

// Intentar diferentes endpoints del BCV
async function probarEndpointsBCV() {
  const endpoints = [
    '/api/tasas-informacion/tasas',
    '/api/tasas',
    '/tasas',
    '/api/tasa/dolar',
    '/api/exchange-rates'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Probando endpoint: ${endpoint}`);
      
      const options = {
        hostname: 'bcv.org.ve',
        path: endpoint,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/html'
        },
        rejectUnauthorized: false
      };

      const resultado = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              endpoint,
              status: res.statusCode,
              contentType: res.headers['content-type'],
              longitud: data.length,
              datos: data.substring(0, 200)
            });
          });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
        req.end();
      });
      
      console.log(`   Status: ${resultado.status}`);
      console.log(`   Content-Type: ${resultado.contentType}`);
      console.log(`   Longitud: ${resultado.longitud}`);
      console.log(`   Preview: ${resultado.datos}`);
      
      if (resultado.status === 200 && resultado.longitud > 0) {
        console.log(`   ✅ Endpoint responde correctamente`);
        return resultado;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  return null;
}

// Función principal
async function main() {
  console.log('🚀 Consultando directamente al Banco Central de Venezuela...\n');
  
  // Probar diferentes endpoints
  console.log('1️⃣ Probando diferentes endpoints del BCV...');
  const resultadoEndpoints = await probarEndpointsBCV();
  
  if (resultadoEndpoints) {
    console.log('\n✅ Se encontró un endpoint funcional:', resultadoEndpoints.endpoint);
    
    // Intentar parsear como JSON si es posible
    if (resultadoEndpoints.contentType?.includes('json')) {
      try {
        const response = await consultarBCVIgnorandoSSL();
        if (response.exito) {
          console.log('\n📊 Datos obtenidos del BCV:');
          console.log(JSON.stringify(response.datos, null, 2));
          return response;
        }
      } catch (error) {
        console.log('Error parseando respuesta:', error.message);
      }
    }
  }
  
  console.log('\n❌ No se pudo obtener información del BCV');
  console.log('\n💡 Recomendaciones:');
  console.log('   1. Verificar la URL correcta del API del BCV');
  console.log('   2. Consultar documentación oficial del BCV');
  console.log('   3. Ingresar tasa manualmente: 405.351 BS/$ (tasa actual)');
  
  return {
    exito: false,
    recomendacion: 'Ingresar tasa manualmente en el sistema'
  };
}

main().then(resultado => {
  console.log('\n🎯 Resultado final:', resultado);
}).catch(error => {
  console.error('\n💥 Error fatal:', error);
});
