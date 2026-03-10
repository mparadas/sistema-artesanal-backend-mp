// Verificar estado del backend
console.log('🔍 Verificando estado del backend...\n');

const BACKEND_URL = 'https://agromae-b.onrender.com';

async function checkBackendStatus() {
  try {
    console.log(`📡 Probando conexión con: ${BACKEND_URL}`);
    
    const response = await fetch(BACKEND_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 Estado: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const text = await response.text();
      console.log(`✅ Backend responde (${text.length} caracteres)`);
      
      // Probar API específica
      console.log('\n📡 Probando endpoints específicos...');
      
      const apiEndpoints = [
        '/api/ventas',
        '/api/productos', 
        '/api/clientes',
        '/api/estados-venta',
        '/ventas',
        '/productos',
        '/clientes',
        '/estados-venta'
      ];
      
      for (const endpoint of apiEndpoints) {
        try {
          const url = BACKEND_URL + endpoint;
          console.log(`⏳ Probando: ${url}`);
          
          const res = await fetch(url);
          console.log(`   ${res.status} ${res.statusText}`);
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
      
    } else {
      console.log(`❌ Error en backend: ${response.status}`);
    }
    
  } catch (error) {
    console.log(`💥 Error de conexión: ${error.message}`);
  }
}

checkBackendStatus();
