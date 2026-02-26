// Script para diagnosticar problemas de conexión
const http = require('http');
const os = require('os');

console.log('🔍 DIAGNÓSTICO DE CONEXIÓN DEL SISTEMA\n');

// 1. Obtener información de red
const interfaces = os.networkInterfaces();
console.log('📡 Interfaces de red disponibles:');
Object.keys(interfaces).forEach(name => {
  const iface = interfaces[name];
  if (iface.length > 0) {
    const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);
    if (ipv4) {
      console.log(`   ${name}: ${ipv4.address} (${ipv4.family})`);
    }
  }
});

// 2. Probar conexión al backend
console.log('\n🔧 Probando conexión al backend...');
const backendOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/health',
  method: 'GET',
  timeout: 5000
};

const backendReq = http.request(backendOptions, (res) => {
  console.log(`   ✅ Backend responde: ${res.statusCode} ${res.statusMessage}`);
  console.log(`   🌐 Backend accesible en: http://localhost:3000`);
});

backendReq.on('error', (err) => {
  console.log(`   ❌ Error conectando al backend: ${err.message}`);
});

backendReq.on('timeout', () => {
  console.log(`   ⏰ Timeout conectando al backend`);
  backendReq.destroy();
});

backendReq.end();

// 3. Probar conexión al frontend
console.log('\n🎨 Probando conexión al frontend...');
const frontendOptions = {
  hostname: 'localhost',
  port: 5173,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const frontendReq = http.request(frontendOptions, (res) => {
  console.log(`   ✅ Frontend responde: ${res.statusCode} ${res.statusMessage}`);
  console.log(`   🌐 Frontend accesible en: http://localhost:5173`);
});

frontendReq.on('error', (err) => {
  console.log(`   ❌ Error conectando al frontend: ${err.message}`);
});

frontendReq.on('timeout', () => {
  console.log(`   ⏰ Timeout conectando al frontend`);
  frontendReq.destroy();
});

frontendReq.end();

// 4. Probar conexión desde IP de red
setTimeout(() => {
  console.log('\n🌐 Probando conexión desde IP de red...');
  
  const networkBackendOptions = {
    hostname: '192.168.100.224',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  const networkBackendReq = http.request(networkBackendOptions, (res) => {
    console.log(`   ✅ Backend accesible desde red: ${res.statusCode} ${res.statusMessage}`);
    console.log(`   🌐 URL de red: http://192.168.100.224:3000`);
  });

  networkBackendReq.on('error', (err) => {
    console.log(`   ❌ Error accediendo al backend desde red: ${err.message}`);
  });

  networkBackendReq.on('timeout', () => {
    console.log(`   ⏰ Timeout accediendo al backend desde red`);
    networkBackendReq.destroy();
  });

  networkBackendReq.end();

  const networkFrontendOptions = {
    hostname: '192.168.100.224',
    port: 5173,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const networkFrontendReq = http.request(networkFrontendOptions, (res) => {
    console.log(`   ✅ Frontend accesible desde red: ${res.statusCode} ${res.statusMessage}`);
    console.log(`   🌐 URL de red: http://192.168.100.224:5173`);
  });

  networkFrontendReq.on('error', (err) => {
    console.log(`   ❌ Error accediendo al frontend desde red: ${err.message}`);
  });

  networkFrontendReq.on('timeout', () => {
    console.log(`   ⏰ Timeout accediendo al frontend desde red`);
    networkFrontendReq.destroy();
  });

  networkFrontendReq.end();
}, 2000);

// 5. Recomendaciones
setTimeout(() => {
  console.log('\n💡 RECOMENDACIONES:');
  console.log('   1. Si estás en la misma máquina que el servidor:');
  console.log('      - Usa: http://localhost:5173 (frontend)');
  console.log('      - Usa: http://localhost:3000 (backend API)');
  console.log('');
  console.log('   2. Si estás en otra PC de la misma red:');
  console.log('      - Usa: http://192.168.100.224:5173 (frontend)');
  console.log('      - Verifica que no haya firewall bloqueando los puertos 3000 y 5173');
  console.log('      - Verifica que ambas PCs estén en la misma red (192.168.100.x)');
  console.log('');
  console.log('   3. Si aún no funciona:');
  console.log('      - Desactiva temporalmente el antivirus/firewall');
  console.log('      - Verifica que el servidor no esté en modo "solo localhost"');
  console.log('      - Reinicia los servicios de red');
}, 4000);
