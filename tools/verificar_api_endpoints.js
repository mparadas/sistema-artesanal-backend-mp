// Verificar endpoints con /api/
console.log('🔍 Verificando endpoints con /api/...\n');

const API_URL = 'https://agromae-b.onrender.com/api';

const endpoints = [
  { key: 'health', url: `${API_URL}/health` },
  { key: 'ventas', url: `${API_URL}/ventas` },
  { key: 'productos', url: `${API_URL}/productos` },
  { key: 'clientes', url: `${API_URL}/clientes` },
  { key: 'estados-venta', url: `${API_URL}/estados-venta` }
];

console.log('📡 Endpoints con /api/ a verificar:');
endpoints.forEach(({ key, url }) => {
  console.log(`   ${key}: ${url}`);
});

console.log('\n🚀 Probando cada endpoint...\n');

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
      console.log(`✅ ${key}: ${response.status} (${duration}ms) - ${Array.isArray(data) ? data.length : 'OK'} registros`);
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

async function testAllEndpoints() {
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.key, endpoint.url);
    results.push({ ...endpoint, ...result });
    console.log('');
  }
  
  console.log('📊 Resumen de resultados con /api/:');
  console.log('====================================');
  
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
  
  console.log('\n🎯 Análisis con /api/:');
  console.log(`   • Endpoints funcionando: ${successCount}/${results.length}`);
  console.log(`   • Tiempo total de carga: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
  console.log(`   • Total registros cargados: ${totalRecords}`);
  
  if (successCount === results.length) {
    console.log('\n🎉 ¡TODO FUNCIONA PERFECTAMENTE!');
    console.log('✅ El backend está corriendo correctamente');
    console.log('✅ El módulo de ventas debería cargar sin problemas');
  } else {
    console.log('\n❌ Aún hay problemas con algunos endpoints');
  }
}

testAllEndpoints().catch(console.error);
