// =====================================================
// DIAGNÓSTICO COMPLETO DE AUTENTICACIÓN POSTGRESQL
// =====================================================

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 DIAGNÓSTICO COMPLETO DE AUTENTICACIÓN POSTGRESQL\n');

// 1. Verificar variables de entorno
console.log('📋 Variables de entorno cargadas:');
console.log(`   DB_USER: ${process.env.DB_USER || 'NO DEFINIDO'}`);
console.log(`   DB_PASS: ${process.env.DB_PASS || 'NO DEFINIDO'}`);
console.log(`   DB_HOST: ${process.env.DB_HOST || 'NO DEFINIDO'}`);
console.log(`   DB_NAME: ${process.env.DB_NAME || 'NO DEFINIDO'}`);
console.log(`   DB_PORT: ${process.env.DB_PORT || 'NO DEFINIDO'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL || 'NO DEFINIDO'}`);

// 2. Probar diferentes configuraciones
const configuraciones = [
  {
    nombre: 'Configuración .env.txt',
    config: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'inventario_artesanal',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'MAP24',
      ssl: false
    }
  },
  {
    nombre: 'Configuración URL directa',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'inventario_artesanal',
      user: 'postgres',
      password: 'MAP24',
      ssl: false
    }
  },
  {
    nombre: 'Configuración alternativa',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'inventario_artesanal',
      user: 'postgres',
      password: 'MAP24',
      ssl: false,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000
    }
  }
];

async function diagnosticarConexiones() {
  for (const configInfo of configuraciones) {
    console.log(`\n🔧 Probando: ${configInfo.nombre}`);
    console.log('-'.repeat(50));
    
    const pool = new Pool(configInfo.config);
    
    try {
      console.log('   📡 Intentando conectar...');
      const client = await pool.connect();
      console.log('   ✅ Conexión exitosa');
      
      // Probar consulta simple
      const result = await client.query('SELECT version()');
      console.log(`   📊 Versión PostgreSQL: ${result.rows[0].version.substring(0, 50)}...`);
      
      // Probar listar bases de datos
      const dbResult = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
      console.log('   🗄️  Bases de datos disponibles:');
      dbResult.rows.forEach(db => {
        console.log(`      - ${db.datname}`);
      });
      
      client.release();
      await pool.end();
      
      console.log('   🎯 Esta configuración funciona correctamente');
      return configInfo.config; // Devolver la configuración que funciona
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      
      // Análisis específico del error
      if (error.message.includes('password')) {
        console.log('   🔐 Posible causa: Contraseña incorrecta');
      } else if (error.message.includes('authentication')) {
        console.log('   🔐 Posible causa: Error de autenticación');
      } else if (error.message.includes('connect')) {
        console.log('   🌐 Posible causa: PostgreSQL no está corriendo');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.log('   🗄️  Posible causa: La base de datos no existe');
      }
      
      await pool.end();
    }
  }
  
  console.log('\n❌ Ninguna configuración funcionó');
  return null;
}

async function verificarServicioPostgreSQL() {
  console.log('\n🔍 Verificando servicio PostgreSQL...');
  
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    // Para Windows
    exec('sc query postgresql-x64-16', (error, stdout, stderr) => {
      if (!error) {
        console.log('✅ Servicio PostgreSQL encontrado:');
        console.log(stdout);
        resolve(true);
      } else {
        // Intentar con otros nombres de servicio
        exec('sc query postgresql', (error2, stdout2, stderr2) => {
          if (!error2) {
            console.log('✅ Servicio PostgreSQL encontrado:');
            console.log(stdout2);
            resolve(true);
          } else {
            console.log('❌ Servicio PostgreSQL no encontrado o no está corriendo');
            console.log('💡 Inicia PostgreSQL desde services.msc o con el comando net start');
            resolve(false);
          }
        });
      }
    });
  });
}

async function main() {
  console.log('='.repeat(70));
  
  // 1. Verificar si PostgreSQL está corriendo
  const servicioActivo = await verificarServicioPostgreSQL();
  
  if (!servicioActivo) {
    console.log('\n🚨 ACCIÓN REQUERIDA: Inicia el servicio PostgreSQL');
    console.log('   1. Abre services.msc');
    console.log('   2. Busca "postgresql"');
    console.log('   3. Haz clic derecho → Iniciar');
    return;
  }
  
  // 2. Probar diferentes configuraciones
  const configFuncional = await diagnosticarConexiones();
  
  if (configFuncional) {
    console.log('\n🎉 SOLUCIÓN ENCONTRADA');
    console.log('Usa esta configuración en tus scripts:');
    console.log(JSON.stringify(configFuncional, null, 2));
    
    // Crear archivo de configuración funcional
    const fs = require('fs');
    const configContent = `
// Configuración funcional de PostgreSQL
module.exports = ${JSON.stringify(configFuncional, null, 2)};
`;
    
    fs.writeFileSync('config_funcional.js', configContent);
    console.log('\n📁 Se creó archivo config_funcional.js con la configuración que funciona');
    
  } else {
    console.log('\n🚨 NO SE PUDO CONECTAR');
    console.log('Posibles soluciones:');
    console.log('1. Verifica que PostgreSQL esté corriendo');
    console.log('2. Verifica la contraseña del usuario postgres');
    console.log('3. Verifica que la base de datos "inventario_artesanal" exista');
    console.log('4. Reinstala PostgreSQL si es necesario');
  }
  
  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
