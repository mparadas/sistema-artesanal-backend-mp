// =====================================================
// VERIFICAR DATOS DE PRODUCTOS PARA CATÁLOGO
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

async function verificarDatosProductos() {
  console.log('🔍 Verificando datos de productos para el catálogo...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Consultar productos con sus datos
    const result = await pool.query(`
      SELECT 
        id,
        nombre,
        categoria,
        animal_origen,
        precio,
        stock,
        imagen_url
      FROM productos 
      WHERE activa = true
      ORDER BY nombre
      LIMIT 10
    `);
    
    console.log('📋 Productos encontrados:');
    console.log('='.repeat(80));
    
    result.rows.forEach((producto, index) => {
      console.log(`\n${index + 1}. ${producto.nombre}`);
      console.log(`   📂 Categoría: ${producto.categoria || 'Sin categoría'}`);
      console.log(`   🐾 Animal origen: ${producto.animal_origen || 'No especificado'}`);
      console.log(`   💰 Precio: $${producto.precio}`);
      console.log(`   📦 Stock: ${producto.stock}`);
      console.log(`   🖼️  Imagen URL: ${producto.imagen_url || 'No tiene'}`);
      
      // Analizar qué imagen debería mostrar
      const nombre = String(producto.nombre || '').toLowerCase();
      const animal = String(producto.animal_origen || '').toLowerCase();
      
      console.log(`   🔍 Análisis de imagen:`);
      
      if (producto.imagen_url) {
        console.log(`      → Usará imagen personalizada`);
      } else if (animal) {
        console.log(`      → Usará imagen de animal: ${animal}`);
      } else if (nombre.includes('pollo')) {
        console.log(`      → Usará imagen de pollo (detectado por nombre)`);
      } else if (nombre.includes('cerdo') || nombre.includes('cochino') || nombre.includes('lomo')) {
        console.log(`      → Usará imagen de cerdo (detectado por nombre)`);
      } else if (nombre.includes('res') || nombre.includes('vaca') || nombre.includes('carne')) {
        console.log(`      → Usará imagen de res (detectado por nombre)`);
      } else if (nombre.includes('queso')) {
        console.log(`      → Usará imagen de queso`);
      } else {
        console.log(`      → Usará imagen genérica`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verificarDatosProductos();
