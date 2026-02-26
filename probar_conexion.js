// =====================================================
// PROBAR CONEXIÓN POSTGRESQL (DESPUÉS DE INICIAR)
// =====================================================

const { Pool } = require('pg');

console.log('🔍 Probando conexión con PostgreSQL...\n');

// Configuración directa
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'inventario_artesanal',
  user: 'postgres',
  password: 'MAP24',
  ssl: false
});

async function probarConexion() {
  try {
    console.log('📡 Conectando...');
    const client = await pool.connect();
    console.log('✅ Conexión exitosa');
    
    // Verificar base de datos
    const dbResult = await client.query('SELECT current_database()');
    console.log(`🗄️ Base de datos: ${dbResult.rows[0].current_database}`);
    
    // Contar registros en tablas principales
    const tablas = ['ventas', 'productos', 'pagos', 'clientes'];
    
    console.log('\n📊 Estado actual de las tablas:');
    for (const tabla of tablas) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        console.log(`   ${tabla}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`   ${tabla}: No existe o error`);
      }
    }
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 ¡Conexión exitosa! PostgreSQL está funcionando');
    console.log('\n🚀 Ahora puedes ejecutar:');
    console.log('   node reinicio_completo_seguro.js');
    console.log('   node contar_registros.js');
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    if (error.message.includes('password')) {
      console.log('🔐 La contraseña MAP24 es incorrecta');
    } else if (error.message.includes('connect')) {
      console.log('🌐 PostgreSQL no está corriendo o no acepta conexiones');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('🗄️ La base de datos inventario_artesanal no existe');
      console.log('💡 Crea la base de datos primero:');
      console.log('   CREATE DATABASE inventario_artesanal;');
    }
  }
}

probarConexion();
