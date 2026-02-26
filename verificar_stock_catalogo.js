// =====================================================
// VERIFICAR STOCK DE PRODUCTOS PARA CATÁLOGO
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

async function verificarStockCatalogo() {
  console.log('🔍 Verificando stock de productos para el catálogo...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Consultar todos los productos con sus datos de stock
    const result = await pool.query(`
      SELECT 
        id,
        nombre,
        categoria,
        animal_origen,
        precio,
        stock,
        cantidad_piezas,
        activa,
        imagen_url
      FROM productos 
      ORDER BY nombre
    `);
    
    console.log('📋 Todos los productos en la base de datos:');
    console.log('='.repeat(100));
    
    let conStockPositivo = 0;
    let sinStock = 0;
    let inactivos = 0;
    
    result.rows.forEach((producto, index) => {
      const stock = parseFloat(producto.stock || 0);
      const activo = producto.activa;
      
      console.log(`\n${index + 1}. ${producto.nombre}`);
      console.log(`   📂 Categoría: ${producto.categoria || 'Sin categoría'}`);
      console.log(`   🐾 Animal origen: ${producto.animal_origen || 'No especificado'}`);
      console.log(`   💰 Precio: $${producto.precio}`);
      console.log(`   📦 Stock: ${stock}`);
      console.log(`   🧩 Piezas: ${producto.cantidad_piezas || 0}`);
      console.log(`   ✅ Activo: ${activo ? 'Sí' : 'No'}`);
      console.log(`   🖼️  Imagen URL: ${producto.imagen_url ? 'Sí' : 'No'}`);
      
      // Clasificar el producto
      if (!activo) {
        inactivos++;
        console.log(`   🔴 ESTADO: INACTIVO (no se mostrará en catálogo)`);
      } else if (stock > 0) {
        conStockPositivo++;
        console.log(`   🟢 ESTADO: CON STOCK POSITIVO (debería mostrarse en catálogo)`);
      } else {
        sinStock++;
        console.log(`   🟡 ESTADO: SIN STOCK (no se mostrará en catálogo)`);
      }
    });
    
    console.log('\n' + '='.repeat(100));
    console.log('📊 RESUMEN DE STOCK:');
    console.log(`   🟢 Productos con stock > 0: ${conStockPositivo}`);
    console.log(`   🟡 Productos con stock = 0: ${sinStock}`);
    console.log(`   🔴 Productos inactivos: ${inactivos}`);
    console.log(`   📋 Total productos: ${result.rows.length}`);
    
    // Verificar productos que deberían mostrarse
    const productosDeberianMostrarse = result.rows.filter(p => 
      p.activa && (parseFloat(p.stock || 0) > 0)
    );
    
    console.log('\n🎯 PRODUCTOS QUE DEBERÍAN MOSTRARSE EN EL CATÁLOGO:');
    console.log('-'.repeat(80));
    productosDeberianMostrarse.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nombre} - Stock: ${p.stock} - Categoría: ${p.categoria}`);
    });
    
    console.log(`\n📈 Total esperado en catálogo: ${productosDeberianMostrarse.length} productos`);
    
    // Simular el filtro del frontend
    console.log('\n🔍 SIMULACIÓN DEL FILTRO DEL FRONTEND:');
    console.log('-'.repeat(80));
    
    const catalogoCompleto = result.rows.map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria || 'Sin categoría',
      stock: parseFloat(p.stock || 0),
      animal_origen: p.animal_origen || '',
      activa: p.activa
    }));
    
    // Aplicar el mismo filtro que el frontend
    const catalogoFiltrado = catalogoCompleto.filter((p) => {
      const tieneStock = (p.stock || 0) > 0;
      const estaActivo = p.activa;
      return tieneStock && estaActivo;
    });
    
    console.log(`📊 Resultado del filtro: ${catalogoFiltrado.length} productos`);
    catalogoFiltrado.forEach((p, i) => {
      console.log(`${i + 1}. ${p.nombre} - Stock: ${p.stock}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar verificación
verificarStockCatalogo();
