// =====================================================
// REINICIO COMPLETO SEGURO (ORDEN CORRECTO)
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

async function reinicioCompletoSeguro() {
  console.log('🧹 Iniciando reinicio completo seguro...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Iniciar transacción
    await pool.query('BEGIN');
    
    // Paso 1: Limpiar tablas dependientes (hijas)
    console.log('🔧 Paso 1: Limpiando tablas dependientes...');
    
    const tablasDependientes = [
      'pedido_items',
      'ventas_items', 
      'pagos'
    ];
    
    for (const tabla of tablasDependientes) {
      try {
        await pool.query(`DELETE FROM ${tabla}`);
        console.log(`   ✅ ${tabla} limpiada`);
        await pool.query(`ALTER SEQUENCE ${tabla}_id_seq RESTART WITH 1`);
      } catch (error) {
        console.log(`   ⚠️  ${tabla} no existe o ya está vacía`);
      }
    }
    
    // Paso 2: Limpiar tablas principales (padres)
    console.log('\n🔧 Paso 2: Limpiando tablas principales...');
    
    const tablasPrincipales = ['ventas', 'productos'];
    
    for (const tabla of tablasPrincipales) {
      try {
        await pool.query(`DELETE FROM ${tabla}`);
        console.log(`   ✅ ${tabla} limpiada`);
        await pool.query(`ALTER SEQUENCE ${tabla}_id_seq RESTART WITH 1`);
      } catch (error) {
        console.log(`   ❌ Error al limpiar ${tabla}: ${error.message}`);
      }
    }
    
    // Confirmar transacción
    await pool.query('COMMIT');
    
    console.log('\n🎉 ¡Reinicio completado exitosamente!');
    
    // Verificación final
    console.log('\n📊 Estado final:');
    
    const tablasVerificar = [
      { nombre: 'ventas', descripcion: 'Ventas registradas' },
      { nombre: 'productos', descripcion: 'Productos del catálogo' },
      { nombre: 'pagos', descripcion: 'Pagos y abonos' },
      { nombre: 'pedido_items', descripcion: 'Items de pedidos' },
      { nombre: 'ventas_items', descripcion: 'Items de ventas' }
    ];
    
    for (const tabla of tablasVerificar) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla.nombre}`);
        const count = result.rows[0].count;
        const estado = count === 0 ? '🧹 VACÍA' : '📄 CON DATOS';
        console.log(`   ${estado} | ${tabla.nombre.padEnd(15)} | ${count} registros`);
      } catch (error) {
        console.log(`   ❌ ERROR | ${tabla.nombre.padEnd(15)} | No existe`);
      }
    }
    
    // Verificar tablas preservadas
    const tablasPreservadas = ['clientes', 'tasas_cambio', 'usuarios', 'categorias'];
    console.log('\n🔒 Tablas preservadas (sin cambios):');
    
    for (const tabla of tablasPreservadas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        console.log(`   ✅ ${tabla}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`   ⚠️  ${tabla}: No existe`);
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
reinicioCompletoSeguro();
