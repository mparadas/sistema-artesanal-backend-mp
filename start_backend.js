const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor backend...');

// Usar el directorio actual como working directory
const backend = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

backend.on('error', (error) => {
  console.error('❌ Error al iniciar backend:', error);
});

backend.on('close', (code) => {
  console.log(`📋 Backend process exited with code ${code}`);
});

backend.on('data', (data) => {
  console.log(data.toString());
});

console.log('✅ Comando de inicio enviado');
