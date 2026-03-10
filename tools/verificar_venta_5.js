const db = require('./config/database');

async function verificarVenta5() {
    try {
        console.log('🔍 Verificando estado actual de venta #5...\n');
        
        // Verificar estado actual
        const ventaActual = await db.query('SELECT id, estado_pago, total, monto_pagado, saldo_pendiente, actualizado_en FROM ventas WHERE id = 5');
        if (ventaActual.rows.length === 0) {
            console.log('❌ ERROR - Venta #5 no encontrada');
            process.exit(1);
        }
        
        const venta = ventaActual.rows[0];
        console.log('📊 Estado actual de venta #5:');
        console.log('  - ID:', venta.id);
        console.log('  - Estado:', venta.estado_pago);
        console.log('  - Total:', venta.total);
        console.log('  - Pagado:', venta.monto_pagado);
        console.log('  - Saldo:', venta.saldo_pendiente);
        console.log('  - Actualizado:', venta.actualizado_en);
        
        if (venta.estado_pago === 'anulada') {
            console.log('\n✅ Venta está correctamente ANULADA en la base de datos');
            console.log('❌ El problema está en el FRONTEND - no está refrescando correctamente');
        } else {
            console.log('\n❌ Venta no está anulada en la base de datos');
            console.log('❌ El problema está en el BACKEND');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error verificando venta #5:', error);
        process.exit(1);
    }
}

verificarVenta5();
