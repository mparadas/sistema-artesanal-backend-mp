// =====================================================
// VERIFICAR TODAS LAS CLAVES DE POSTGRESQL
// =====================================================

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando todas las claves de PostgreSQL en el sistema...\n');

// Archivos a verificar
const archivos = [
  { ruta: '.env.txt', descripcion: 'Configuración principal' },
  { ruta: '.env.example', descripcion: 'Ejemplo de configuración' },
  { ruta: 'config/database.js', descripcion: 'Configuración de base de datos' },
  { ruta: 'scripts/resetAdmin.js', descripcion: 'Script de reset admin' },
  { ruta: 'scripts/initDb.js', descripcion: 'Script de inicialización' }
];

console.log('📋 Análisis de credenciales encontradas:\n');
console.log('='.repeat(70));

let clavesEncontradas = [];

archivos.forEach(archivo => {
  const rutaCompleta = path.join(__dirname, archivo.ruta);
  
  if (fs.existsSync(rutaCompleta)) {
    const contenido = fs.readFileSync(rutaCompleta, 'utf8');
    
    console.log(`\n📁 ${archivo.descripcion} (${archivo.ruta}):`);
    console.log('-'.repeat(50));
    
    // Buscar patrones de credenciales
    const patrones = [
      { regex: /DB_USER\s*=\s*['"]?([^'"\s]+)/gi, tipo: 'Usuario DB' },
      { regex: /DB_PASS\s*=\s*['"]?([^'"\s]+)/gi, tipo: 'Contraseña DB' },
      { regex: /password\s*:\s*['"]?([^'"\s]+)/gi, tipo: 'Contraseña (password)' },
      { regex: /user\s*:\s*['"]?([^'"\s]+)/gi, tipo: 'Usuario (user)' },
      { regex: /DATABASE_URL\s*=\s*postgres:\/\/([^:]+):([^@]+)@/gi, tipo: 'URL PostgreSQL' }
    ];
    
    let encontradoEnArchivo = false;
    
    patrones.forEach(patron => {
      let match;
      while ((match = patron.regex.exec(contenido)) !== null) {
        if (patron.tipo === 'URL PostgreSQL') {
          console.log(`   🔑 ${patron.tipo}:`);
          console.log(`      Usuario: ${match[1]}`);
          console.log(`      Contraseña: ${match[2]}`);
          
          clavesEncontradas.push({
            archivo: archivo.ruta,
            tipo: 'Usuario PostgreSQL',
            valor: match[1],
            fuente: patron.tipo
          });
          
          clavesEncontradas.push({
            archivo: archivo.ruta,
            tipo: 'Contraseña PostgreSQL',
            valor: match[2],
            fuente: patron.tipo
          });
        } else {
          console.log(`   🔑 ${patron.tipo}: ${match[1]}`);
          
          clavesEncontradas.push({
            archivo: archivo.ruta,
            tipo: patron.tipo,
            valor: match[1],
            fuente: 'Directo'
          });
        }
        encontradoEnArchivo = true;
      }
    });
    
    if (!encontradoEnArchivo) {
      console.log('   ⚠️  No se encontraron credenciales explícitas');
    }
  } else {
    console.log(`\n❌ Archivo no encontrado: ${archivo.ruta}`);
  }
});

// Resumen de claves
console.log('\n' + '='.repeat(70));
console.log('📊 RESUMEN DE CLAVES ENCONTRADAS:');
console.log('='.repeat(70));

// Agrupar por tipo de credencial
const usuarios = clavesEncontradas.filter(c => c.tipo.includes('Usuario'));
const contrasenas = clavesEncontradas.filter(c => c.tipo.includes('Contraseña'));

if (usuarios.length > 0) {
  console.log('\n👤 USUARIOS ENCONTRADOS:');
  const usuariosUnicos = [...new Map(usuarios.map(u => [u.valor, u])).values()];
  usuariosUnicos.forEach(usuario => {
    console.log(`   • ${usuario.valor} (en ${usuario.archivo})`);
  });
}

if (contrasenas.length > 0) {
  console.log('\n🔐 CONTRASEÑAS ENCONTRADAS:');
  const contrasenasUnicas = [...new Map(contrasenas.map(c => [c.valor, c])).values()];
  contrasenasUnicas.forEach(contrasena => {
    console.log(`   • ${contrasena.valor} (en ${contrasena.archivo})`);
  });
}

// Configuración principal detectada
console.log('\n🎯 CONFIGURACIÓN PRINCIPAL DETECTADA:');
const configPrincipal = clavesEncontradas.find(c => c.archivo === '.env.txt');
if (configPrincipal) {
  console.log('   ✅ Se encontró configuración principal en .env.txt');
} else {
  console.log('   ⚠️  No se encontró .env.txt con credenciales');
}

console.log('\n🚀 PARA CONECTARSE A POSTGRESQL:');
console.log('   Comando: psql -U postgres -d inventario_artesanal -h localhost');
console.log('   Contraseña: MAP24 (según archivos de configuración)');

console.log('\n⚠️  RECOMENDACIONES DE SEGURIDAD:');
console.log('   • Cambiar la contraseña por defecto si es ambiente de producción');
console.log('   • No compartir archivos .env en repositorios públicos');
console.log('   • Usar variables de entorno en producción');

console.log('\n' + '='.repeat(70));
