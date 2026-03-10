// Script para verificar tablas y eliminar ventas con clientes desconocidos
const db = require('./config/database');

async function eliminarVentasClientesDesconocidos() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...\n');
    
    // 1. Verificar tablas existentes
    const tablasQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const tablas = await db.query(tablasQuery);
    console.log('📋 Tablas existentes:');
    tablas.rows.forEach(tabla => {
      console.log(`   - ${tabla.table_name}`);
    });
    console.log('');
    
    // 2. Identificar ventas con clientes desconocidos
    const queryVentasDesconocidas = `
      SELECT 
        v.id,
        v.cliente_id,
        v.cliente_nombre,
        c.nombre as cliente_db_nombre,
        v.total,
        v.saldo_pendiente,
        v.fecha,
        v.estado_pago,
        v.tipo_venta
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.cliente_nombre = 'Cliente Desconocido' 
      OR v.cliente_nombre IS NULL
      OR v.cliente_nombre = ''
      OR (v.cliente_id IS NOT NULL AND c.id IS NULL)
      ORDER BY v.fecha DESC
    `;
    
    const ventasDesconocidas = await db.query(queryVentasDesconocidas);
    
    console.log(`📊 Se encontraron ${ventasDesconocidas.rows.length} ventas con clientes desconocidos:\n`);
    
    if (ventasDesconocidas.rows.length === 0) {
      console.log('✅ No hay ventas con clientes desconocidos');
      process.exit(0);
    }
    
    // Mostrar detalles de cada venta
    ventasDesconocidas.rows.forEach((venta, index) => {
      console.log(`${index + 1}. Venta #${venta.id}`);
      console.log(`   Cliente ID: ${venta.cliente_id}`);
      console.log(`   Nombre cliente: "${venta.cliente_nombre}"`);
      console.log(`   Nombre DB: "${venta.cliente_db_nombre || 'N/A'}"`);
      console.log(`   Total: USD ${venta.total}`);
      console.log(`   Saldo pendiente: USD ${venta.saldo_pendiente}`);
      console.log(`   Fecha: ${venta.fecha}`);
      console.log(`   Estado: ${venta.estado_pago} (${venta.tipo_venta})`);
      console.log('');
    });
    
    // 3. Eliminar las ventas (solo la tabla ventas que sí existe)
    console.log('🗑️  Eliminando ventas...');
    
    for (const venta of ventasDesconocidas.rows) {
      console.log(`   Eliminando venta #${venta.id}...`);
      
      // Eliminar solo la venta (las otras tablas no existen o no tienen restricciones)
      await db.query('DELETE FROM ventas WHERE id = $1', [venta.id]);
      
      console.log(`   ✅ Venta #${venta.id} eliminada`);
    }
    
    console.log(`\n✅ Se eliminaron ${ventasDesconocidas.rows.length} ventas con clientes desconocidos`);
    
    // 4. Verificar resultado
    const queryVerificacion = `
      SELECT COUNT(*) as total
      FROM ventas v
      WHERE v.cliente_nombre = 'Cliente Desconocido' 
      OR v.cliente_nombre IS NULL
      OR v.cliente_nombre = ''
    `;
    
    const verificacion = await db.query(queryVerificacion);
    console.log(`📊 Ventas restantes con clientes desconocidos: ${verificacion.rows[0].total}`);
    
    if (verificacion.rows[0].total === 0) {
      console.log('🎉 ¡Todas las ventas con clientes desconocidos han sido eliminadas!');
    }
    
    // 5. Verificar nuevo estado de cuenta
    console.log('\n📈 Verificando nuevo estado de cuenta...');
    
    const queryNuevoEstado = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(CASE WHEN moneda_original = 'USD' THEN saldo_pendiente ELSE 0 END), 0) as total_usd,
        COALESCE(SUM(CASE WHEN moneda_original = 'VES' THEN saldo_pendiente ELSE 0 END), 0) as total_ves
      FROM ventas 
      WHERE tipo_venta = 'credito' 
      AND saldo_pendiente > 0
    `;
    
    const nuevoEstado = await db.query(queryNuevoEstado);
    
    console.log(`💰 Nuevo estado de cuenta:`);
    console.log(`   Ventas con deuda: ${nuevoEstado.rows[0].total_ventas}`);
    console.log(`   Total USD por cobrar: $${nuevoEstado.rows[0].total_usd}`);
    console.log(`   Total VES por cobrar: Bs${nuevoEstado.rows[0].total_ves}`);
    
  } catch (error) {
    console.error('❌ Error al eliminar ventas con clientes desconocidos:', error);
  } finally {
    process.exit(0);
  }
}

eliminarVentasClientesDesconocidos();
