// =====================================================
// SCRIPT SIMPLE PARA REINICIAR TABLAS PRINCIPALES
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

async function reiniciarTablas() {
  console.log('🧹 Iniciando reinicio simple de tablas principales...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Iniciar transacción
    await pool.query('BEGIN');
    
    // Limpiar tabla de pagos
    console.log('📊 Limpiando tabla de pagos...');
    await pool.query('DELETE FROM pagos');
    await pool.query('ALTER SEQUENCE pagos_id_seq RESTART WITH 1');
    
    // Limpiar tabla de ventas
    console.log('💰 Limpiando tabla de ventas...');
    await pool.query('DELETE FROM ventas');
    await pool.query('ALTER SEQUENCE ventas_id_seq RESTART WITH 1');
    
    // Limpiar tabla de productos
    console.log('📦 Limpiando tabla de productos...');
    await pool.query('DELETE FROM productos');
    await pool.query('ALTER SEQUENCE productos_id_seq RESTART WITH 1');
    
    // Confirmar transacción
    await pool.query('COMMIT');
    
    console.log('\n🎉 ¡Reinicio completado exitosamente!');
    console.log('\n📊 Estado de las tablas:');
    
    // Verificar estado de las tablas principales
    const tablas = ['ventas', 'productos', 'pagos'];
    const tablasPreservadas = ['clientes', 'tasas_cambio', 'usuarios', 'categorias'];
    
    console.log('   🧹 Tablas limpiadas:');
    for (const tabla of tablas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        console.log(`      ${tabla}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`      ${tabla}: Tabla no existe`);
      }
    }
    
    console.log('   🔒 Tablas preservadas:');
    for (const tabla of tablasPreservadas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        console.log(`      ${tabla}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`      ${tabla}: Tabla no existe`);
      }
    }
    
    console.log('\n🎯 Sistema listo para entrega al cliente');
    
  } catch (error) {
    console.error('❌ Error durante el reinicio:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar el reinicio
reiniciarTablas();
