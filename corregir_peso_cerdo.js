// =====================================================
// CORREGIR PESO DE PULPA DE CERDO
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

async function corregirPesoCerdo() {
  console.log('🔧 Corrigiendo peso de pulpa de cerdo...\n');
  
  try {
    // Conectar a la base de datos
    await pool.connect();
    console.log('✅ Conectado a la base de datos');
    
    // Buscar productos de cerdo con peso total incorrecto
    const resultadoBusqueda = await pool.query(`
      SELECT id, nombre, categoria, peso_total, stock, cantidad_piezas, activa
      FROM productos 
      WHERE (animal_origen ILIKE '%cerdo%' OR nombre ILIKE '%cerdo%')
        AND activa = true
      ORDER BY nombre
    `);
    
    console.log('📋 Productos de cerdo encontrados:');
    console.log('='.repeat(80));
    
    if (resultadoBusqueda.rows.length === 0) {
      console.log('❌ No se encontraron productos de cerdo');
      return;
    }
    
    const correcciones = [];
    
    resultadoBusqueda.rows.forEach((producto) => {
      const pesoTotal = parseFloat(producto.peso_total || 0);
      const cantidadPiezas = parseInt(producto.cantidad_piezas || 0);
      const stock = parseFloat(producto.stock || 0);
      
      console.log(`\n📋 ID: ${producto.id}`);
      console.log(`   Nombre: "${producto.nombre}"`);
      console.log(`   Peso total actual: ${pesoTotal} kg`);
      console.log(`   Cantidad piezas: ${cantidadPiezas}`);
      console.log(`   Stock: ${stock}`);
      
      // Verificar si el peso por pieza es mayor a 1kg, probablemente está mal calculado
      const pesoPorPieza = cantidadPiezas > 0 ? pesoTotal / cantidadPiezas : 0;
      
      console.log(`   Peso por pieza calculado: ${pesoPorPieza.toFixed(3)} kg`);
      
      // Si el peso por pieza es mayor a 1kg, probablemente está mal calculado
      if (pesoPorPieza > 1.0) {
        console.log(`   🔴 ERROR: Peso por pieza demasiado alto (${pesoPorPieza.toFixed(3)} kg)`);
        
        // Calcular peso correcto (asumiendo 0.48 kg por pieza de pulpa de cerdo)
        const pesoCorrecto = cantidadPiezas * 0.48;
        
        console.log(`   ✅ Peso corregido: ${pesoCorrecto.toFixed(3)} kg (${cantidadPiezas} piezas × 0.48 kg)`);
        
        correcciones.push({
          id: producto.id,
          nombre: producto.nombre,
          peso_anterior: pesoTotal,
          peso_nuevo: pesoCorrecto,
          piezas: cantidadPiezas,
          stock: stock
        });
      } else {
        console.log(`   ✅ Peso por pieza correcto (${pesoPorPieza.toFixed(3)} kg)`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Total de correcciones: ${correcciones.length}`);
    
    if (correcciones.length > 0) {
      console.log('\n📋 Detalle de correcciones:');
      correcciones.forEach((corr, i) => {
        console.log(`${i + 1}. ID ${corr.id}: "${corr.nombre}"`);
        console.log(`   Peso anterior: ${corr.peso_anterior.toFixed(3)} kg → Peso nuevo: ${corr.peso_nuevo.toFixed(3)} kg`);
        console.log(`   Piezas: ${corr.piezas}`);
      });
      
      // Aplicar correcciones
      console.log('\n🔧 Aplicando correcciones...');
      
      for (const corr of correcciones) {
        try {
          await pool.query(`
            UPDATE productos 
            SET peso_total = $1 
            WHERE id = $1
            RETURNING id, nombre, peso_total
          `, [corr.peso_nuevo, corr.id]);
          console.log(`   ✅ ID ${corr.id}: "${corr.nombre}" - Peso actualizado a ${corr.peso_nuevo.toFixed(3)} kg`);
        } catch (error) {
          console.log(`   ❌ Error al corregir ID ${corr.id}: ${error.message}`);
        }
      }
    }
    
    // Verificación final
    console.log('\n🔍 Verificación final:');
    const resultadoFinal = await pool.query(`
      SELECT id, nombre, peso_total, stock, cantidad_piezas, activa
      FROM productos 
      WHERE (animal_origen ILIKE '%cerdo%' OR nombre ILIKE '%cerdo%')
        AND activa = true
      ORDER BY nombre
    `);
    
    console.log('📋 Productos de cerdo después de corrección:');
    resultadoFinal.rows.forEach((p, i) => {
      const pesoPorPieza = parseInt(p.cantidad_piezas || 0) > 0 ? (parseFloat(p.peso_total || 0) / parseInt(p.cantidad_piezas || 1)) : 0;
      console.log(`${i + 1}. "${p.nombre}" - Peso: ${p.peso_total} kg - Piezas: ${p.cantidad_piezas} - Peso/pieza: ${pesoPorPieza.toFixed(3)} kg`);
    });
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await pool.end();
  }
}

// Ejecutar corrección
corregirPesoCerdo();
