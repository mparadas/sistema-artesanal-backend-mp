// Script para eliminar ventas específicas #9 y #10
const db = require('./config/database');

async function eliminarVentasEspecificas() {
  try {
    console.log('🔍 Verificando ventas #9 y #10...\n');
    
    // 1. Identificar las ventas específicas
    const queryVentas = `
      SELECT 
        v.id,
        v.cliente_id,
        v.cliente_nombre,
        c.nombre as cliente_db_nombre,
        v.total,
        v.moneda_original,
        v.saldo_pendiente,
        v.fecha,
        v.estado_pago,
        v.tipo_venta
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.id IN (9, 10)
      ORDER BY v.id
    `;
    
    const ventas = await db.query(queryVentas);
    
    console.log(`📊 Se encontraron ${ventas.rows.length} ventas:\n`);
    
    if (ventas.rows.length === 0) {
      console.log('❌ No se encontraron las ventas #9 y #10');
      process.exit(0);
    }
    
    // Mostrar detalles de cada venta
    ventas.rows.forEach((venta, index) => {
      console.log(`${index + 1}. Venta #${venta.id}`);
      console.log(`   Cliente: "${venta.cliente_nombre}" (${venta.cliente_db_nombre || 'N/A'})`);
      console.log(`   Total: ${venta.moneda_original} ${venta.total}`);
      console.log(`   Saldo pendiente: ${venta.moneda_original} ${venta.saldo_pendiente}`);
      console.log(`   Fecha: ${venta.fecha}`);
      console.log(`   Estado: ${venta.estado_pago} (${venta.tipo_venta})`);
      console.log(`   Pagos: N/A`);
      console.log('');
    });
    
    // 2. Eliminar las ventas y sus registros relacionados
    console.log('🗑️  Eliminando ventas y registros relacionados...');
    
    for (const venta of ventas.rows) {
      console.log(`\n   Eliminando venta #${venta.id}...`);
      
      try {
        // Eliminar detalles de venta si existen
        await db.query('DELETE FROM venta_detalles WHERE venta_id = $1', [venta.id]);
        console.log(`     ✅ Detalles de venta eliminados`);
        
        // Eliminar pagos de venta si existen
        const pagosEliminados = await db.query('DELETE FROM venta_pagos WHERE venta_id = $1', [venta.id]);
        console.log(`     ✅ Pagos eliminados: ${pagosEliminados.rowCount}`);
        
        // Eliminar auditoría relacionada
        const auditoriaEliminada = await db.query('DELETE FROM auditoria WHERE tabla_afectada = $1 AND registro_id = $2', ['ventas', venta.id]);
        console.log(`     ✅ Auditoría eliminada: ${auditoriaEliminada.rowCount} registros`);
        
        // Eliminar la venta
        await db.query('DELETE FROM ventas WHERE id = $1', [venta.id]);
        console.log(`     ✅ Venta #${venta.id} eliminada completamente`);
        
      } catch (error) {
        console.log(`     ⚠️  Error al eliminar venta #${venta.id}: ${error.message}`);
        // Intentar eliminar la venta directamente si hay error con tablas relacionadas
        try {
          await db.query('DELETE FROM ventas WHERE id = $1', [venta.id]);
          console.log(`     ✅ Venta #${venta.id} eliminada (directamente)`);
        } catch (directError) {
          console.log(`     ❌ No se pudo eliminar la venta #${venta.id}: ${directError.message}`);
        }
      }
    }
    
    console.log(`\n✅ Proceso de eliminación completado`);
    
    // 3. Verificar resultado
    const queryVerificacion = `
      SELECT COUNT(*) as total
      FROM ventas 
      WHERE id IN (9, 10)
    `;
    
    const verificacion = await db.query(queryVerificacion);
    console.log(`📊 Ventas #9 y #10 restantes: ${verificacion.rows[0].total}`);
    
    if (verificacion.rows[0].total === 0) {
      console.log('🎉 ¡Las ventas #9 y #10 han sido eliminadas!');
    }
    
    // 4. Verificar nuevo estado de cuenta
    console.log('\n📈 Verificando nuevo estado de cuenta...');
    
    const queryNuevoEstado = `
      SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(CASE WHEN moneda_original = 'USD' THEN saldo_pendiente ELSE 0 END), 0) as total_usd,
        COALESCE(SUM(CASE WHEN moneda_original = 'VES' THEN saldo_pendiente ELSE 0 END), 0) as total_ves,
        COALESCE(SUM(saldo_pendiente), 0) as total_general
      FROM ventas 
      WHERE tipo_venta = 'credito' 
      AND saldo_pendiente > 0
    `;
    
    const nuevoEstado = await db.query(queryNuevoEstado);
    
    console.log(`💰 Nuevo estado de cuenta:`);
    console.log(`   Ventas con deuda: ${nuevoEstado.rows[0].total_ventas}`);
    console.log(`   Total USD por cobrar: $${nuevoEstado.rows[0].total_usd}`);
    console.log(`   Total VES por cobrar: Bs${nuevoEstado.rows[0].total_ves}`);
    console.log(`   Total general: ${nuevoEstado.rows[0].total_general}`);
    
    if (nuevoEstado.rows[0].total_ventas === 0) {
      console.log('\n🎉 ¡No quedan ventas con saldo pendiente!');
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar ventas:', error);
  } finally {
    process.exit(0);
  }
}

eliminarVentasEspecificas();
