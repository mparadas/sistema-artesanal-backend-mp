// =====================================================
// CONTAR REGISTROS EN TABLAS PRINCIPALES
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

async function contarRegistros() {
  console.log('📊 Contando registros en tablas principales...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Tablas a verificar
    const tablas = [
      { nombre: 'ventas', descripcion: 'Ventas registradas' },
      { nombre: 'productos', descripcion: 'Productos del catálogo' },
      { nombre: 'pagos', descripcion: 'Pagos y abonos' },
      { nombre: 'clientes', descripcion: 'Clientes registrados' },
      { nombre: 'tasas_cambio', descripcion: 'Tasas de cambio' },
      { nombre: 'usuarios', descripcion: 'Usuarios del sistema' },
      { nombre: 'categorias', descripcion: 'Categorías de productos' }
    ];
    
    console.log('📋 Estado actual de las tablas:');
    console.log('='.repeat(50));
    
    for (const tabla of tablas) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla.nombre}`);
        const count = result.rows[0].count;
        const estado = count === 0 ? '🧹 VACÍA' : count > 0 ? '📄 CON DATOS' : '❓ DESCONOCIDO';
        console.log(`${estado} | ${tabla.nombre.padEnd(15)} | ${count.toString().padStart(6)} registros | ${tabla.descripcion}`);
      } catch (error) {
        console.log(`❌ ERROR | ${tabla.nombre.padEnd(15)} | No existe | ${tabla.descripcion}`);
      }
    }
    
    console.log('='.repeat(50));
    
    // Verificar si hay datos que limpiar
    const tablasConDatos = [];
    for (const tabla of ['ventas', 'productos', 'pagos']) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tabla}`);
        if (parseInt(result.rows[0].count) > 0) {
          tablasConDatos.push({ nombre: tabla, count: result.rows[0].count });
        }
      } catch (error) {
        // Tabla no existe
      }
    }
    
    if (tablasConDatos.length > 0) {
      console.log('\n⚠️  Tablas con datos que necesitan limpieza:');
      tablasConDatos.forEach(tabla => {
        console.log(`   • ${tabla.nombre}: ${tabla.count} registros`);
      });
      console.log('\n🚀 Se recomienda ejecutar el reinicio para limpiar estas tablas.');
    } else {
      console.log('\n✅ Las tablas principales ya están limpias.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar conteo
contarRegistros();
