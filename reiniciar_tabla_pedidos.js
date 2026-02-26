// =====================================================
// REINICIAR TABLA PEDIDOS - SISTEMA ARTESANAL
// =====================================================

const { Pool } = require('pg');
require('dotenv').config();

// Configuración de conexión
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'inventario_artesanal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'MAP24'
});

async function reiniciarTablaPedidos() {
  console.log('🧹 Reiniciando tabla pedidos...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Iniciar transacción
    await pool.query('BEGIN');
    
    // Paso 1: Limpiar tablas dependientes (hijas)
    console.log('🔧 Paso 1: Limpiando tablas dependientes...');
    
    // Limpiar pedido_pagos
    try {
      await pool.query('DELETE FROM pedido_pagos');
      console.log('   ✅ pedido_pagos limpiada');
      await pool.query('ALTER SEQUENCE pedido_pagos_id_seq RESTART WITH 1');
    } catch (error) {
      console.log('   ⚠️  pedido_pagos no existe o ya está vacía');
    }
    
    // Limpiar pedido_items
    try {
      await pool.query('DELETE FROM pedido_items');
      console.log('   ✅ pedido_items limpiada');
      await pool.query('ALTER SEQUENCE pedido_items_id_seq RESTART WITH 1');
    } catch (error) {
      console.log('   ⚠️  pedido_items no existe o ya está vacía');
    }
    
    // Paso 2: Limpiar tabla principal (padre)
    console.log('\n🔧 Paso 2: Limpiando tabla pedidos...');
    
    try {
      await pool.query('DELETE FROM pedidos');
      console.log('   ✅ pedidos limpiada');
      await pool.query('ALTER SEQUENCE pedidos_id_seq RESTART WITH 1');
    } catch (error) {
      console.log('   ❌ Error al limpiar pedidos:', error.message);
    }
    
    // Confirmar transacción
    await pool.query('COMMIT');
    
    console.log('\n🎉 ¡Reinicio de tabla pedidos completado exitosamente!');
    
    // Verificación final
    console.log('\n📊 Estado final de la tabla pedidos:');
    
    const tablasPedidos = [
      { nombre: 'pedidos', descripcion: 'Pedidos principales' },
      { nombre: 'pedido_items', descripcion: 'Items de pedidos' },
      { nombre: 'pedido_pagos', descripcion: 'Pagos de pedidos' }
    ];
    
    for (const tabla of tablasPedidos) {
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
    const tablasPreservadas = ['clientes', 'productos', 'ventas', 'tasas_cambio', 'usuarios'];
    console.log('\n🔒 Tablas preservadas (sin cambios):');
    
    for (const tabla of tablasPreservadas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        console.log(`   ✅ ${tabla}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`   ⚠️  ${tabla}: No existe`);
      }
    }
    
    console.log('\n🎯 Tabla pedidos lista para uso');
    
  } catch (error) {
    console.error('❌ Error durante el reinicio:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Ejecutar el reinicio
reiniciarTablaPedidos();
