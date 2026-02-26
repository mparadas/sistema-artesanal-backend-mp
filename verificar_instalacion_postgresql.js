// =====================================================
// VERIFICAR INSTALACIÓN DE POSTGRESQL
// =====================================================

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando instalación de PostgreSQL...\n');

// Rutas comunes de instalación en Windows
const rutasPostgreSQL = [
  'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\13\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\15\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\14\\bin\\psql.exe'
];

function verificarRutas() {
  console.log('📁 Buscando instalación de PostgreSQL...');
  
  let rutasEncontradas = [];
  
  rutasPostgreSQL.forEach(ruta => {
    if (fs.existsSync(ruta)) {
      rutasEncontradas.push(ruta);
      console.log(`✅ Encontrado: ${ruta}`);
    }
  });
  
  if (rutasEncontradas.length === 0) {
    console.log('❌ No se encontró PostgreSQL instalado');
    console.log('\n📥 NECESITAS INSTALAR POSTGRESQL');
    console.log('1. Descarga desde: https://www.postgresql.org/download/windows/');
    console.log('2. Instala la versión 16 o 15');
    console.log('3. Anota la contraseña que configures (recomendado: MAP24)');
    console.log('4. Asegúrate de marcar "Install as service"');
  } else {
    console.log('\n✅ PostgreSQL está instalado');
    console.log('🔧 Intentando iniciar el servicio manualmente...');
    
    // Intentar iniciar con la ruta encontrada
    const rutaPrincipal = rutasEncontradas[0];
    const directorioBin = path.dirname(rutaPrincipal);
    
    console.log(`📂 Usando: ${directorioBin}`);
    
    // Crear script para iniciar
    const iniciarScript = `
@echo off
cd /d "${directorioBin}"
pg_ctl start -D "${directorioBin}\\..\\data"
pause
`;
    
    fs.writeFileSync('iniciar_postgresql_manual.bat', iniciarScript);
    console.log('📄 Se creó: iniciar_postgresql_manual.bat');
    console.log('💡 Ejecuta este archivo .bat para iniciar PostgreSQL');
  }
}

function verificarServiciosWindows() {
  console.log('\n🔍 Buscando servicios de PostgreSQL en Windows...');
  
  exec('sc query | findstr postgresql', (error, stdout, stderr) => {
    if (stdout) {
      console.log('✅ Servicios PostgreSQL encontrados:');
      console.log(stdout);
      
      // Extraer nombres de servicio
      const lineas = stdout.split('\n');
      lineas.forEach(linea => {
        if (linea.includes('postgresql')) {
          const nombreServicio = linea.split('SERVICE_NAME:')[1]?.trim();
          if (nombreServicio) {
            console.log(`🔧 Para iniciar: net start ${nombreServicio}`);
          }
        }
      });
    } else {
      console.log('❌ No se encontraron servicios PostgreSQL');
    }
  });
}

// Ejecutar verificación
verificarRutas();
verificarServiciosWindows();

console.log('\n📋 RESUMEN:');
console.log('1. Si PostgreSQL no está instalado → Instálalo');
console.log('2. Si está instalado → Inicia el servicio manualmente');
console.log('3. Una vez iniciado → Prueba con: node contar_registros.js');

console.log('\n🔑 CONTRASEÑA RECOMENDADA: MAP24');
console.log('🗄️  BASE DE DATOS: inventario_artesanal');
