// Diagnóstico del problema de "Cargando ventas..." en el frontend
console.log('🔍 Diagnosticando problema de carga en frontend...\n');

// Simular la llamada exacta que hace el frontend
const API_URL = 'https://agromae-b.onrender.com/api';

async function diagnosticarFrontendCall() {
  console.log('📡 Simulando llamada del frontend...');
  console.log('URL:', API_URL);
  console.log('');
  
  try {
    // Simular la llamada que hace el componente Ventas.jsx
    const endpoints = [
      { key: 'ventas', url: `${API_URL}/ventas` },
      { key: 'productos', url: `${API_URL}/productos` },
      { key: 'clientes', url: `${API_URL}/clientes` },
      { key: 'estadosVenta', url: `${API_URL}/estados-venta` }
    ];
    
    console.log('⏳ Iniciando Promise.allSettled (como en el frontend)...');
    
    const startTime = Date.now();
    
    const results = await Promise.allSettled(
      endpoints.map(async ({ key, url }) => {
        try {
          console.log(`📡 Llamando a ${key}: ${url}`);
          
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              // El frontend no envía headers adicionales
            }
          });
          
          console.log(`📊 ${key} response: ${res.status} ${res.statusText}`);
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          
          const data = await res.json();
          console.log(`✅ ${key}: ${Array.isArray(data) ? data.length : 'object'} items`);
          
          return { key, data: data?.data || data || [] };
          
        } catch (err) {
          console.log(`❌ ${key} error: ${err.message}`);
          throw err;
        }
      })
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n📊 Resultados de Promise.allSettled:');
    console.log('=====================================');
    
    const payload = {};
    let hasErrors = false;
    
    results.forEach((result, index) => {
      const endpoint = endpoints[index];
      
      if (result.status === 'fulfilled') {
        console.log(`✅ ${endpoint.key}: Success`);
        payload[endpoint.key] = result.value.data;
      } else {
        console.log(`❌ ${endpoint.key}: ${result.reason.message}`);
        hasErrors = true;
      }
    });
    
    console.log(`\n⏱️  Tiempo total: ${duration}ms`);
    console.log(`🔥 Hay errores: ${hasErrors ? 'SÍ' : 'NO'}`);
    
    if (!hasErrors) {
      console.log('\n🎉 ¡FRONTEND DEBERÍA FUNCIONAR!');
      console.log('✅ Todos los endpoints respondieron correctamente');
      console.log('✅ El loading debería desaparecer');
      console.log('✅ Las ventas deberían mostrarse');
    } else {
      console.log('\n❌ PROBLEMA ENCONTRADO:');
      console.log('• Algunos endpoints fallaron');
      console.log('• El frontend se quedará en "Cargando ventas..."');
      console.log('• O mostrará error si todos fallan');
    }
    
    console.log('\n🔍 Datos que recibiría el frontend:');
    console.log('===================================');
    Object.keys(payload).forEach(key => {
      const data = payload[key];
      console.log(`${key}: ${Array.isArray(data) ? `${data.length} items` : typeof data}`);
    });
    
    return { success: !hasErrors, duration, payload };
    
  } catch (error) {
    console.log(`💥 Error general: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// También verificar si hay problemas de CORS
async function verificarCORS() {
  console.log('\n🔍 Verificando problemas de CORS...');
  
  try {
    const response = await fetch(`${API_URL}/ventas`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://sistema-artesanal-frontend-mp.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`📊 OPTIONS response: ${response.status}`);
    console.log('📋 Headers CORS:');
    
    const corsHeaders = [
      'Access-Control-Allow-Origin',
      'Access-Control-Allow-Methods',
      'Access-Control-Allow-Headers',
      'Access-Control-Allow-Credentials'
    ];
    
    corsHeaders.forEach(header => {
      const value = response.headers.get(header);
      console.log(`   ${header}: ${value || '❌ No presente'}`);
    });
    
  } catch (error) {
    console.log(`❌ Error verificando CORS: ${error.message}`);
  }
}

// Ejecutar diagnóstico completo
async function main() {
  await diagnosticarFrontendCall();
  await verificarCORS();
  
  console.log('\n🎯 DIAGNÓSTICO FINAL:');
  console.log('====================');
  console.log('Si los endpoints funcionan pero el frontend sigue cargando:');
  console.log('1. Recarga la página con Ctrl+F5');
  console.log('2. Limpia el caché del navegador');
  console.log('3. Revisa la consola del navegador (F12)');
  console.log('4. Verifica que no haya errores de JavaScript');
  console.log('5. Confirma que la URL sea la correcta');
}

main();
