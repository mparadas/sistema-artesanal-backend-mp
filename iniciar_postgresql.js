// =====================================================
// INICIAR POSTGRESQL - SOLUCIÓN AUTOMÁTICA
// =====================================================

const { exec } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando PostgreSQL...\n');

// Comandos para iniciar PostgreSQL en Windows
const comandos = [
  'net start postgresql-x64-16',
  'net start postgresql-x64-14', 
  'net start postgresql',
  'sc start postgresql-x64-16',
  'sc start postgresql'
];

async function iniciarPostgreSQL() {
  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i];
    console.log(`🔧 Intentando: ${comando}`);
    
    try {
      await ejecutarComando(comando);
      console.log('✅ PostgreSQL iniciado exitosamente');
      
      // Esperar un momento y verificar
      setTimeout(async () => {
        await verificarEstado();
      }, 3000);
      
      return;
    } catch (error) {
      console.log(`❌ Falló: ${error.message}`);
      
      if (i === comandos.length - 1) {
        console.log('\n🚨 No se pudo iniciar PostgreSQL automáticamente');
        console.log('\n📋 Manualmente:');
        console.log('1. Presiona Win + R');
        console.log('2. Escribe: services.msc');
        console.log('3. Busca "PostgreSQL"');
        console.log('4. Haz clic derecho → Iniciar');
        console.log('5. Busca variantes como:');
        console.log('   - postgresql-x64-16');
        console.log('   - postgresql-x64-14');
        console.log('   - postgresql');
      }
    }
  }
}

function ejecutarComando(comando) {
  return new Promise((resolve, reject) => {
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function verificarEstado() {
  console.log('\n🔍 Verificando estado del servicio...');
  
  try {
    await ejecutarComando('sc query postgresql-x64-16');
    console.log('✅ PostgreSQL-x64-16 está corriendo');
  } catch {
    try {
      await ejecutarComando('sc query postgresql');
      console.log('✅ PostgreSQL está corriendo');
    } catch {
      console.log('❌ PostgreSQL no está corriendo');
    }
  }
  
  console.log('\n🎯 Ahora intenta conectar con:');
  console.log('   node contar_registros.js');
  console.log('   node reinicio_completo_seguro.js');
}

iniciarPostgreSQL();
