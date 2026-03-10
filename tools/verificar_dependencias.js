// =====================================================
// VERIFICAR DEPENDENCIAS DE TABLAS
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

async function verificarDependencias() {
  console.log('🔍 Verificando dependencias de tablas...\n');
  
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
    
    // Verificar tablas que referencian a productos
    console.log('\n🔗 Buscando tablas que referencian a productos...');
    
    const foreignKeysResult = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'productos'
    `);
    
    if (foreignKeysResult.rows.length > 0) {
      console.log('⚠️  Tablas que referencian a productos:');
      foreignKeysResult.rows.forEach(row => {
        console.log(`   • ${row.table_name}.${row.column_name} → productos.${row.foreign_column_name}`);
      });
    } else {
      console.log('✅ No se encontraron referencias a productos');
    }
    
    // Verificar tablas que referencian a ventas
    console.log('\n🔗 Buscando tablas que referencian a ventas...');
    
    const ventasFkResult = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = 'ventas'
    `);
    
    if (ventasFkResult.rows.length > 0) {
      console.log('⚠️  Tablas que referencian a ventas:');
      ventasFkResult.rows.forEach(row => {
        console.log(`   • ${row.table_name}.${row.column_name} → ventas.${row.foreign_column_name}`);
      });
    } else {
      console.log('✅ No se encontraron referencias a ventas');
    }
    
    // Contar registros en tablas problemáticas
    console.log('\n📊 Conteo de registros en tablas dependientes:');
    
    const tablasDependientes = ['pedido_items', 'ventas_items'];
    for (const tabla of tablasDependientes) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        console.log(`   • ${tabla}: ${countResult.rows[0].count} registros`);
      } catch (error) {
        console.log(`   • ${tabla}: No existe`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verificarDependencias();
