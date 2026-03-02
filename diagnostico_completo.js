// Diagnóstico completo - PC Local, Render y Vercel
console.log('🔍 DIAGNÓSTICO COMPLETO - PC Local, Render y Vercel');
console.log('=============================================\n');

// Configuraciones
const configs = {
  local: {
    name: 'PC Local',
    url: 'http://localhost:3000/api',
    description: 'Backend local corriendo en tu máquina'
  },
  render: {
    name: 'Render Backend',
    url: 'https://agromae-b.onrender.com/api',
    description: 'Backend en producción (Render)'
  },
  vercel: {
    name: 'Vercel Frontend',
    url: 'https://sistema-artesanal-frontend-mp.vercel.app',
    description: 'Frontend en producción (Vercel)'
  }
};

// Función para probar endpoints
async function probarBackend(config) {
  console.log(`\n📡 Probando ${config.name}:`);
  console.log(`📍 URL: ${config.url}`);
  console.log(`📝 ${config.description}`);
  console.log(''.padEnd(50, '-'));
  
  const endpoints = [
    { key: 'health', path: '/health' },
    { key: 'ventas', path: '/ventas' },
    { key: 'productos', path: '/productos' },
    { key: 'clientes', path: '/clientes' },
    { key: 'estados-venta', path: '/estados-venta' }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const url = config.url + endpoint.path;
      console.log(`⏳ ${endpoint.key}: ${url}`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.ok) {
        const data = await response.json();
        const count = Array.isArray(data) ? data.length : (data?.data?.length || 'OK');
        console.log(`   ✅ ${response.status} (${duration}ms) - ${count} items`);
        results.push({ endpoint: endpoint.key, success: true, status: response.status, duration, count });
      } else {
        console.log(`   ❌ ${response.status} (${duration}ms) - Error`);
        results.push({ endpoint: endpoint.key, success: false, status: response.status, duration, error: 'HTTP Error' });
      }
    } catch (error) {
      console.log(`   💥 Error - ${error.message}`);
      results.push({ endpoint: endpoint.key, success: false, error: error.message });
    }
  }
  
  // Resumen
  const success = results.filter(r => r.success).length;
  const total = results.length;
  const avgDuration = results.filter(r => r.duration).reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.duration).length;
  
  console.log(`\n📊 Resumen ${config.name}:`);
  console.log(`   ✅ Endpoints funcionando: ${success}/${total}`);
  console.log(`   ⏱️  Tiempo promedio: ${avgDuration.toFixed(0)}ms`);
  console.log(`   🎯 Estado: ${success === total ? 'PERFECTO' : success > 0 ? 'PARCIAL' : 'CAÍDO'}`);
  
  return { config: config.name, results, success, total, avgDuration };
}

// Función para probar frontend Vercel
async function probarFrontendVercel() {
  console.log(`\n🌐 Probando Frontend Vercel:`);
  console.log(`📍 URL: ${configs.vercel.url}`);
  console.log(''.padEnd(50, '-'));
  
  try {
    console.log('⏳ Verificando página principal...');
    
    const startTime = Date.now();
    const response = await fetch(configs.vercel.url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Diagnostic Bot)' }
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`📊 Página principal: ${response.status} (${duration}ms)`);
    
    if (response.ok) {
      const text = await response.text();
      const hasReact = text.includes('react') || text.includes('React');
      const hasVite = text.includes('vite') || text.includes('Vite');
      
      console.log(`   ✅ Frontend responde (${text.length} caracteres)`);
      console.log(`   📱 Contiene React: ${hasReact ? 'SÍ' : 'NO'}`);
      console.log(`   ⚡ Contiene Vite: ${hasVite ? 'SÍ' : 'NO'}`);
      
      // Probar si puede hacer llamadas API
      console.log('\n⏳ Verificando si frontend puede llamar a su API...');
      
      try {
        const apiResponse = await fetch(`${configs.vercel.url}/api/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`📊 API desde frontend: ${apiResponse.status}`);
        
        if (apiResponse.ok) {
          console.log(`   ✅ Frontend puede comunicarse con su backend`);
        } else {
          console.log(`   ❌ Frontend no puede comunicarse con backend`);
        }
      } catch (apiError) {
        console.log(`   💥 Error API desde frontend: ${apiError.message}`);
      }
      
      return { success: true, status: response.status, duration, hasReact, hasVite };
    } else {
      console.log(`   ❌ Error: ${response.status}`);
      return { success: false, status: response.status, duration };
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Función para verificar si el backend local está corriendo
async function verificarBackendLocal() {
  console.log(`\n🔍 Verificando si backend local está corriendo...`);
  
  try {
    const response = await fetch('http://localhost:3000', { method: 'GET' });
    console.log(`✅ Backend local responde en puerto 3000`);
    return true;
  } catch (error) {
    console.log(`❌ Backend local NO está corriendo: ${error.message}`);
    return false;
  }
}

// Diagnóstico principal
async function diagnosticoCompleto() {
  console.log('🚀 Iniciando diagnóstico completo...\n');
  
  // 1. Verificar backend local
  const backendLocalActivo = await verificarBackendLocal();
  
  // 2. Probar backends
  const resultados = [];
  
  // Siempre probar Render
  resultados.push(await probarBackend(configs.render));
  
  // Probar local solo si está activo
  if (backendLocalActivo) {
    resultados.push(await probarBackend(configs.local));
  }
  
  // 3. Probar frontend Vercel
  const frontendResult = await probarFrontendVercel();
  
  // 4. Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('🎯 RESUMEN FINAL DEL DIAGNÓSTICO');
  console.log('='.repeat(60));
  
  console.log('\n📊 ESTADO DE LOS SERVICIOS:');
  resultados.forEach(({ config, success, total }) => {
    const status = success === total ? '✅ FUNCIONA' : success > 0 ? '⚠️  PARCIAL' : '❌ CAÍDO';
    console.log(`   ${config}: ${status} (${success}/${total} endpoints)`);
  });
  
  const frontendStatus = frontendResult.success ? '✅ FUNCIONA' : '❌ CAÍDO';
  console.log(`   Frontend Vercel: ${frontendStatus}`);
  
  console.log('\n🔍 ANÁLISIS DEL PROBLEMA:');
  
  if (!frontendResult.success) {
    console.log('❌ PROBLEMA: Frontend Vercel no está respondiendo');
    console.log('   • Verifica que la URL sea correcta');
    console.log('   • El deploy puede haber fallado');
  }
  
  const renderResult = resultados.find(r => r.config === 'Render Backend');
  if (!renderResult || renderResult.success < renderResult.total) {
    console.log('❌ PROBLEMA: Backend Render no funciona completamente');
    console.log('   • Reinicia el servicio en Render Dashboard');
    console.log('   • Revisa los logs de errores');
  }
  
  if (backendLocalActivo) {
    const localResult = resultados.find(r => r.config === 'PC Local');
    console.log('ℹ️  INFO: Backend local está corriendo');
    if (localResult && localResult.success === localResult.total) {
      console.log('   • Podrías usar el backend local para desarrollo');
    }
  }
  
  console.log('\n🛠️ SOLUCIONES RECOMENDADAS:');
  
  if (!frontendResult.success) {
    console.log('1. Deploya nuevamente el frontend a Vercel');
    console.log('2. Verifica el archivo vercel.json');
    console.log('3. Revisa los logs de Vercel');
  }
  
  if (!renderResult || renderResult.success < renderResult.total) {
    console.log('1. Reinicia el backend en Render Dashboard');
    console.log('2. Verifica variables de entorno');
    console.log('3. Revisa logs de errores en Render');
  }
  
  console.log('\n🌐 URLs para verificar manualmente:');
  console.log(`   Frontend: ${configs.vercel.url}`);
  console.log(`   Backend Render: ${configs.render.url}/health`);
  if (backendLocalActivo) {
    console.log(`   Backend Local: ${configs.local.url}/health`);
  }
  
  console.log('\n✅ Diagnóstico completado');
}

// Ejecutar diagnóstico
diagnosticoCompleto().catch(console.error);
