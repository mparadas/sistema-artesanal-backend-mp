// Verificación directa del problema actual
console.log('🔍 VERIFICACIÓN DIRECTA - ¿Qué está pasando?\n');

// Verificar si el módulo de ventas realmente carga los datos
async function verificarVentasDirecto() {
  try {
    console.log('📡 Verificando endpoint de ventas...');
    
    const response = await fetch('https://agromae-b.onrender.com/api/ventas');
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const ventas = await response.json();
      console.log(`✅ Ventas obtenidas: ${ventas.length}`);
      
      if (ventas.length > 0) {
        console.log('\n📋 Primera venta:');
        console.log(`   ID: ${ventas[0].id}`);
        console.log(`   Cliente: ${ventas[0].cliente_nombre}`);
        console.log(`   Total: ${ventas[0].total}`);
        console.log(`   Fecha: ${ventas[0].fecha}`);
      }
      
      return { success: true, count: ventas.length, data: ventas };
    } else {
      console.log(`❌ Error: ${response.status}`);
      return { success: false, error: response.status };
    }
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Verificar si el frontend está realmente cargando
async function verificarFrontendVentas() {
  try {
    console.log('\n🌐 Verificando frontend de ventas...');
    
    const response = await fetch('https://sistema-artesanal-frontend-mp.vercel.app/ventas', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    console.log(`📊 Frontend status: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Buscar indicadores en el HTML
      const tieneReact = html.includes('react') || html.includes('React');
      const tieneCargando = html.includes('Cargando ventas') || html.includes('cargando ventas');
      const tieneError = html.includes('Error') || html.includes('error');
      const tieneVentas = html.includes('ventas') || html.includes('Ventas');
      
      console.log(`📱 Contenido del frontend:`);
      console.log(`   • React: ${tieneReact ? 'SÍ' : 'NO'}`);
      console.log(`   • "Cargando ventas": ${tieneCargando ? 'SÍ' : 'NO'}`);
      console.log(`   • "Error": ${tieneError ? 'SÍ' : 'NO'}`);
      console.log(`   • "Ventas": ${tieneVentas ? 'SÍ' : 'NO'}`);
      console.log(`   • Tamaño HTML: ${html.length} caracteres`);
      
      if (tieneCargando) {
        console.log('\n⚠️  El frontend está mostrando "Cargando ventas..."');
        console.log('🔍 Esto significa que los datos no están llegando');
      } else if (tieneError) {
        console.log('\n❌ El frontend está mostrando un error');
      } else if (tieneVentas && !tieneCargando) {
        console.log('\n✅ El frontend parece estar cargando correctamente');
      }
      
      return { tieneCargando, tieneError, tieneVentas };
    } else {
      console.log(`❌ Error frontend: ${response.status}`);
      return { error: response.status };
    }
  } catch (error) {
    console.log(`💥 Error verificando frontend: ${error.message}`);
    return { error: error.message };
  }
}

// Verificar configuración actual del frontend
async function verificarConfiguracion() {
  console.log('\n🔧 Verificando configuración del frontend...');
  
  try {
    // Verificar si el vercel.json está correctamente configurado
    const response = await fetch('https://sistema-artesanal-frontend-mp.vercel.app/api/health');
    console.log(`📊 API desde frontend: ${response.status}`);
    
    if (response.ok) {
      console.log('✅ El frontend puede comunicarse con el backend');
    } else {
      console.log('❌ El frontend NO puede comunicarse con el backend');
    }
  } catch (error) {
    console.log(`💥 Error verificando API: ${error.message}`);
  }
}

// Diagnóstico completo
async function main() {
  console.log('🚀 INICIANDO VERIFICACIÓN COMPLETA...\n');
  
  // 1. Verificar backend
  const backendResult = await verificarVentasDirecto();
  
  // 2. Verificar frontend
  const frontendResult = await verificarFrontendVentas();
  
  // 3. Verificar configuración
  await verificarConfiguracion();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNÓSTICO FINAL');
  console.log('='.repeat(60));
  
  if (backendResult.success && frontendResult.tieneCargando) {
    console.log('🔍 PROBLEMA IDENTIFICADO:');
    console.log('   • Backend funciona correctamente');
    console.log('   • Frontend está atascado en "Cargando ventas..."');
    console.log('   • Los datos no llegan al frontend');
    
    console.log('\n🛠️ SOLUCIONES POSIBLES:');
    console.log('   1. El deploy del vercel.json no se aplicó');
    console.log('   2. Hay caché antiguo en Vercel');
    console.log('   3. El frontend está apuntando a URL incorrecta');
    console.log('   4. Hay un error en el código del frontend');
    
    console.log('\n🚀 ACCIONES RECOMENDADAS:');
    console.log('   1. Forzar nuevo deploy a Vercel');
    console.log('   2. Limpiar caché de Vercel');
    console.log('   3. Verificar que el vercel.json esté deployado');
    
  } else if (!backendResult.success) {
    console.log('❌ PROBLEMA EN EL BACKEND:');
    console.log('   • El backend no está respondiendo correctamente');
    console.log('   • Hay que reiniciar el backend en Render');
    
  } else if (frontendResult.tieneError) {
    console.log('❌ PROBLEMA EN EL FRONTEND:');
    console.log('   • Hay un error en el código del frontend');
    console.log('   • Hay que revisar la consola del navegador');
    
  } else {
    console.log('✅ TODO FUNCIONA CORRECTAMENTE');
    console.log('   • Backend responde');
    console.log('   • Frontend carga');
    console.log('   • Si hay lentitud, es por las imágenes');
  }
}

main();
