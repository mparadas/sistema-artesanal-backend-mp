// Diagnóstico del problema de carga del módulo de ventas
console.log('🔍 Diagnosticando problema de carga en módulo de ventas...\n');

// Verificar endpoints que se están llamando
const API_URL = 'https://agromae-b.onrender.com'; // Backend URL

const endpoints = [
  { key: 'ventas', url: `${API_URL}/ventas` },
  { key: 'productos', url: `${API_URL}/productos` },
  { key: 'clientes', url: `${API_URL}/clientes` },
  { key: 'estadosVenta', url: `${API_URL}/estados-venta` }
];

console.log('📡 Endpoints a verificar:');
endpoints.forEach(({ key, url }) => {
  console.log(`   ${key}: ${url}`);
});

console.log('\n🚀 Probando cada endpoint...\n');

// Función para probar cada endpoint
async function testEndpoint(key, url) {
  const startTime = Date.now();
  try {
    console.log(`⏳ Probando ${key}...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${key}: ${response.status} (${duration}ms) - ${Array.isArray(data) ? data.length : 'N/A'} registros`);
      return { success: true, duration, records: Array.isArray(data) ? data.length : 0 };
    } else {
      console.log(`❌ ${key}: ${response.status} (${duration}ms) - Error`);
      return { success: false, duration, error: response.status };
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`💥 ${key}: Error (${duration}ms) - ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

// Probar todos los endpoints
async function testAllEndpoints() {
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.key, endpoint.url);
    results.push({ ...endpoint, ...result });
    console.log(''); // Espacio entre pruebas
  }
  
  console.log('📊 Resumen de resultados:');
  console.log('========================');
  
  let totalDuration = 0;
  let successCount = 0;
  let totalRecords = 0;
  
  results.forEach(({ key, success, duration, records, error }) => {
    const status = success ? '✅' : '❌';
    const recordCount = records || 0;
    const errorMsg = error || '';
    
    console.log(`${status} ${key}: ${duration}ms ${recordCount > 0 ? `(${recordCount} registros)` : ''} ${errorMsg}`);
    
    totalDuration += duration;
    if (success) {
      successCount++;
      totalRecords += recordCount;
    }
  });
  
  console.log('\n🎯 Análisis:');
  console.log(`   • Endpoints funcionando: ${successCount}/${results.length}`);
  console.log(`   • Tiempo total de carga: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
  console.log(`   • Total registros cargados: ${totalRecords}`);
  
  if (totalDuration > 10000) {
    console.log('⚠️  ADVERTENCIA: La carga está tardando más de 10 segundos');
  }
  
  if (successCount < results.length) {
    console.log('❌ PROBLEMA: Algunos endpoints no están respondiendo');
  }
  
  if (totalRecords === 0 && successCount > 0) {
    console.log('⚠️  ADVERTENCIA: Los endpoints responden pero no hay datos');
  }
  
  console.log('\n🔧 Soluciones recomendadas:');
  if (totalDuration > 10000) {
    console.log('   • Considerar agregar cache en el frontend');
    console.log('   • Optimizar queries en el backend');
    console.log('   • Agregar paginación para grandes volúmenes de datos');
  }
  
  if (successCount < results.length) {
    console.log('   • Verificar que el backend esté corriendo');
    console.log('   • Revisar configuración de CORS');
    console.log('   • Chequear rutas de los endpoints');
  }
  
  if (totalRecords === 0 && successCount > 0) {
    console.log('   • Verificar que haya datos en la base de datos');
    console.log('   • Revisar queries del backend');
  }
}

// Ejecutar diagnóstico
testAllEndpoints().catch(console.error);
