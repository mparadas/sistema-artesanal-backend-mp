// =====================================================
// CORREGIR NOMBRE DE PRODUCTO EN BASE DE DATOS
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

async function corregirNombreProducto() {
  console.log('🔧 Corrigiendo nombre de producto en base de datos...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Buscar productos con el nombre incorrecto
    const resultadoBusqueda = await pool.query(`
      SELECT id, nombre, categoria, stock, activa
      FROM productos 
      WHERE nombre ILIKE '%Flilet de Pechuga%' OR 
            nombre ILIKE '%Flilet%' OR
            nombre ILIKE '%Pechuga%'
      ORDER BY nombre
    `);
    
    console.log('📋 Productos encontrados con "Flilet" o "Pechuga":');
    console.log('='.repeat(80));
    
    if (resultadoBusqueda.rows.length === 0) {
      console.log('❌ No se encontraron productos con "Flilet de Pechuga"');
      return;
    }
    
    resultadoBusqueda.rows.forEach((producto, index) => {
      console.log(`\n${index + 1}. ID: ${producto.id}`);
      console.log(`   Nombre actual: "${producto.nombre}"`);
      console.log(`   Categoría: ${producto.categoria}`);
      console.log(`   Stock: ${producto.stock}`);
      console.log(`   Activo: ${producto.activo ? 'Sí' : 'No'}`);
      
      // Verificar si necesita corrección
      if (producto.nombre.includes('Flilet')) {
        console.log(`   🔴 NECESITA CORRECCIÓN: "Flilet" → "Filet"`);
      } else {
        console.log(`   ✅ Nombre correcto`);
      }
    });
    
    // Realizar la corrección
    console.log('\n🔧 Realizando correcciones...');
    console.log('-'.repeat(50));
    
    const correcciones = [];
    
    for (const producto of resultadoBusqueda.rows) {
      if (producto.nombre.includes('Flilet')) {
        const nombreCorregido = producto.nombre.replace(/Flilet/g, 'Filet');
        
        console.log(`\n📝 Corrigiendo producto ID ${producto.id}:`);
        console.log(`   Antes: "${producto.nombre}"`);
        console.log(`   Después: "${nombreCorregido}"`);
        
        try {
          const resultadoUpdate = await pool.query(`
            UPDATE productos 
            SET nombre = $1 
            WHERE id = $2
            RETURNING id, nombre
          `, [nombreCorregido, producto.id]);
          
          console.log(`   ✅ Corrección exitosa`);
          correcciones.push({
            id: resultadoUpdate.rows[0].id,
            nombre_anterior: producto.nombre,
            nombre_nuevo: resultadoUpdate.rows[0].nombre
          });
          
        } catch (error) {
          console.log(`   ❌ Error al corregir: ${error.message}`);
        }
      }
    }
    
    // Resumen de correcciones
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE CORRECCIONES:');
    console.log(`   ✅ Productos corregidos: ${correcciones.length}`);
    
    if (correcciones.length > 0) {
      console.log('\n📋 Detalle de correcciones:');
      correcciones.forEach((corr, i) => {
        console.log(`${i + 1}. ID ${corr.id}: "${corr.nombre_anterior}" → "${corr.nombre_nuevo}"`);
      });
    }
    
    // Verificación final
    console.log('\n🔍 Verificación final:');
    const resultadoFinal = await pool.query(`
      SELECT id, nombre, categoria, stock, activa
      FROM productos 
      WHERE nombre ILIKE '%Filet de Pechuga%' OR 
            nombre ILIKE '%Filet%' OR
            nombre ILIKE '%Pechuga%'
      ORDER BY nombre
    `);
    
    console.log(`📋 Productos después de la corrección: ${resultadoFinal.rows.length}`);
    resultadoFinal.rows.forEach((p, i) => {
      console.log(`${i + 1}. "${p.nombre}" (ID: ${p.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar corrección
corregirNombreProducto();
