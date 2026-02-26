// Script para verificar el estado de cuenta general
const db = require('./config/database');

async function verificarEstadoCuenta() {
  try {
    console.log('🔍 Verificando estado de cuenta general...\n');
    
    // 1. Verificar todas las ventas de crédito con saldos pendientes
    const queryCreditos = `
      SELECT 
        v.id,
        v.cliente_id,
        v.cliente_nombre,
        v.total,
        v.moneda_original,
        v.saldo_pendiente,
        v.estado_pago,
        v.tipo_venta,
        v.fecha,
        c.nombre as cliente_db_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      WHERE v.tipo_venta = 'credito' 
      AND v.saldo_pendiente > 0
      ORDER BY v.fecha DESC
    `;
    
    const creditos = await db.query(queryCreditos);
    
    console.log(`📊 Total de ventas de crédito con saldo pendiente: ${creditos.rows.length}\n`);
    
    let totalPorCobrarUSD = 0;
    let totalPorCobrarVES = 0;
    
    // Agrupar por cliente
    const clientesConDeuda = {};
    
    creditos.rows.forEach(venta => {
      const clienteId = venta.cliente_id;
      const clienteNombre = venta.cliente_nombre || venta.cliente_db_nombre || 'Cliente Desconocido';
      
      if (!clientesConDeuda[clienteId]) {
        clientesConDeuda[clienteId] = {
          nombre: clienteNombre,
          ventas: [],
          totalUSD: 0,
          totalVES: 0
        };
      }
      
      clientesConDeuda[clienteId].ventas.push(venta);
      
      // Convertir saldos a USD para el total general
      if (venta.moneda_original === 'USD') {
        totalPorCobrarUSD += parseFloat(venta.saldo_pendiente);
        clientesConDeuda[clienteId].totalUSD += parseFloat(venta.saldo_pendiente);
      } else if (venta.moneda_original === 'VES') {
        totalPorCobrarVES += parseFloat(venta.saldo_pendiente);
        clientesConDeuda[clienteId].totalVES += parseFloat(venta.saldo_pendiente);
      }
    });
    
    console.log('💰 Resumen por cliente:');
    console.log('='.repeat(80));
    
    Object.values(clientesConDeuda).forEach(cliente => {
      console.log(`\n👤 Cliente: ${cliente.nombre}`);
      console.log(`   Ventas con deuda: ${cliente.ventas.length}`);
      
      if (cliente.totalUSD > 0) {
        console.log(`   Deuda USD: $${cliente.totalUSD.toFixed(2)}`);
      }
      if (cliente.totalVES > 0) {
        console.log(`   Deuda VES: Bs${cliente.totalVES.toFixed(2)}`);
      }
      
      console.log('   Ventas:');
      cliente.ventas.forEach(venta => {
        console.log(`     • Venta #${venta.id} - ${venta.fecha} - ${venta.moneda_original} ${venta.saldo_pendiente} (${venta.estado_pago})`);
      });
    });
    
    console.log('\n📈 Totales generales:');
    console.log('='.repeat(40));
    console.log(`Total USD por cobrar: $${totalPorCobrarUSD.toFixed(2)}`);
    console.log(`Total VES por cobrar: Bs${totalPorCobrarVES.toFixed(2)}`);
    
    // 2. Verificar si hay tasas de cambio para convertir VES a USD
    if (totalPorCobrarVES > 0) {
      const tasaQuery = `
        SELECT tasa_bcv 
        FROM tasas_cambio 
        WHERE activa = true 
        ORDER BY fecha DESC 
        LIMIT 1
      `;
      
      const tasaResult = await db.query(tasaQuery);
      
      if (tasaResult.rows.length > 0) {
        const tasa = parseFloat(tasaResult.rows[0].tasa_bcv);
        const vesEnUSD = totalPorCobrarVES / tasa;
        const totalGeneralUSD = totalPorCobrarUSD + vesEnUSD;
        
        console.log(`\n💱 Tasa de cambio actual: ${tasa}`);
        console.log(`VES en USD: $${vesEnUSD.toFixed(2)}`);
        console.log(`🎯 Total general USD: $${totalGeneralUSD.toFixed(2)}`);
        
        if (Math.abs(totalGeneralUSD - 12000) < 0.01) {
          console.log('\n✅ ¡Coincide! Los $12,000 provienen de:');
          console.log(`   - $${totalPorCobrarUSD.toFixed(2)} en deudas directas USD`);
          console.log(`   - Bs${totalPorCobrarVES.toFixed(2)} (equivalente a $${vesEnUSD.toFixed(2)})`);
        }
      } else {
        console.log('\n⚠️  No hay tasa de cambio activa para convertir VES a USD');
      }
    } else {
      console.log(`\n🎯 Total general USD: $${totalPorCobrarUSD.toFixed(2)}`);
      
      if (Math.abs(totalPorCobrarUSD - 12000) < 0.01) {
        console.log('\n✅ ¡Coincide! Los $12,000 provienen completamente de deudas en USD');
      }
    }
    
  } catch (error) {
    console.error('❌ Error al verificar estado de cuenta:', error);
  } finally {
    process.exit(0);
  }
}

verificarEstadoCuenta();
