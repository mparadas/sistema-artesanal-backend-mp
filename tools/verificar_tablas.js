// =====================================================
// VERIFICAR TABLAS EXISTENTES
// =====================================================

const { Pool } = require('pg');
require('dotenv').config();

// Configuración de conexión
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'inventario_artesanal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'MAP24'
});

async function verificarTablas() {
  console.log('🔍 Verificando tablas existentes...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Obtener todas las tablas
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tablas encontradas:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    // Verificar tablas principales
    const tablasPrincipales = ['ventas', 'productos', 'pagos', 'clientes', 'tasas_cambio', 'usuarios', 'categorias'];
    
    console.log('\n🎯 Estado de tablas principales:');
    for (const tabla of tablasPrincipales) {
      const existe = result.rows.some(row => row.table_name === tabla);
      console.log(`   ${existe ? '✅' : '❌'} ${tabla}`);
    }
    
    // Contar registros en tablas existentes
    console.log('\n📊 Registros por tabla:');
    for (const row of result.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
        console.log(`   ${row.table_name}: ${countResult.rows[0].count} registros`);
      } catch (error) {
        console.log(`   ${row.table_name}: Error al contar registros`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verificarTablas();
