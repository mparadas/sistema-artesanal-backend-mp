// =====================================================
// VERIFICAR ORIGEN DEL POLLO EN CATÁLOGO
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

async function verificarOrigenPollo() {
  console.log('🔍 Verificando origen del pollo en el catálogo...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Consultar productos relacionados con pollo
    const result = await pool.query(`
      SELECT 
        id,
        nombre,
        categoria,
        animal_origen,
        precio,
        stock,
        imagen_url,
        activa
      FROM productos 
      WHERE (nombre ILIKE '%pollo%' OR nombre ILIKE '%chicken%' OR animal_origen ILIKE '%pollo%')
        AND activa = true
      ORDER BY nombre
    `);
    
    console.log('📋 Productos de pollo encontrados:');
    console.log('='.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('❌ No se encontraron productos de pollo activos');
    } else {
      result.rows.forEach((producto, index) => {
        console.log(`\n${index + 1}. ${producto.nombre}`);
        console.log(`   📂 Categoría: ${producto.categoria || 'Sin categoría'}`);
        console.log(`   🐾 Animal origen: ${producto.animal_origen || '❌ NO ESPECIFICADO'}`);
        console.log(`   💰 Precio: $${producto.precio}`);
        console.log(`   📦 Stock: ${producto.stock}`);
        console.log(`   🖼️  Imagen URL: ${producto.imagen_url || 'No tiene'}`);
        console.log(`   ✅ Activo: ${producto.activa ? 'Sí' : 'No'}`);
        
        // Analizar qué imagen debería mostrar el catálogo
        const categoria = String(producto.categoria || '').toLowerCase();
        const animal = String(producto.animal_origen || '').toLowerCase();
        const nombre = String(producto.nombre || '').toLowerCase();
        
        console.log(`   🔍 Análisis de imagen circular:`);
        
        if (categoria.includes('pollo') || categoria.includes('aves')) {
          console.log(`      → 🐔 Imagen de pollo (por categoría: "${producto.categoria}")`);
        } else if (animal.includes('pollo')) {
          console.log(`      → 🐔 Imagen de pollo (por animal_origen: "${producto.animal_origen}")`);
        } else if (nombre.includes('pollo') || nombre.includes('chicken')) {
          console.log(`      → 🐔 Imagen de pollo (detectado por nombre: "${producto.nombre}")`);
        } else {
          console.log(`      → ❓ Imagen genérica (no se detectó pollo)`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Total de productos de pollo: ${result.rows.length}`);
    
    // Mostrar todas las categorías disponibles
    const categoriasResult = await pool.query(`
      SELECT DISTINCT categoria, COUNT(*) as cantidad
      FROM productos 
      WHERE activa = true
      GROUP BY categoria
      ORDER BY cantidad DESC
    `);
    
    console.log('\n📂 Todas las categorías disponibles:');
    console.log('-'.repeat(40));
    categoriasResult.rows.forEach((cat) => {
      console.log(`   ${cat.categoria}: ${cat.cantidad} productos`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verificarOrigenPollo();
