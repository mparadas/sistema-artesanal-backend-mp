const db = require('./config/database');

async function restaurarVenta5() {
    try {
        console.log('🔍 Restaurando venta #5 a estado pendiente...\n');
        
        // 1. Verificar estado actual de la venta #5
        const ventaActual = await db.query('SELECT * FROM ventas WHERE id = 5');
        if (ventaActual.rows.length === 0) {
            console.log('❌ ERROR - Venta #5 no encontrada');
            process.exit(1);
        }
        
        const venta = ventaActual.rows[0];
        console.log('📊 Estado actual de venta #5:', {
            id: venta.id,
            estado_pago: venta.estado_pago,
            total: venta.total,
            monto_pagado: venta.monto_pagado,
            saldo_pendiente: venta.saldo_pendiente,
            cliente: venta.cliente_nombre
        });
        
        // 2. Restaurar a estado pendiente con montos originales
        console.log('🔄 Restaurando a estado pendiente...');
        const result = await db.query(`
            UPDATE ventas SET 
                total = 12.456,
                monto_pagado = 0,
                saldo_pendiente = 12.456,
                estado_pago = 'pendiente',
                actualizado_en = NOW()
            WHERE id = 5
            RETURNING id, estado_pago, total, monto_pagado, saldo_pendiente, actualizado_en
        `);
        
        const ventaRestaurada = result.rows[0];
        console.log('✅ Venta #5 restaurada:', ventaRestaurada);
        
        // 3. Verificar detalles de la venta
        const detalles = await db.query('SELECT * FROM venta_detalles WHERE venta_id = 5');
        console.log('📋 Detalles de la venta:', detalles.rows.length, 'productos');
        detalles.rows.forEach(detalle => {
            console.log(`  - Producto #${detalle.producto_id}: ${detalle.cantidad} x ${detalle.precio_unitario}`);
        });
        
        console.log('\n✅ Venta #5 lista para pruebas');
        console.log('📊 Estado: pendiente');
        console.log('💰 Total: $12.456');
        console.log('💳 Pagado: $0');
        console.log('⚖️ Saldo: $12.456');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error restaurando venta #5:', error);
        process.exit(1);
    }
}

restaurarVenta5();
