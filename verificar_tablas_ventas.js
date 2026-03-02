const db = require('./config/database');

async function verificarTablas() {
    try {
        console.log('🔍 Verificando estructura de tablas...\n');
        
        // 1. Verificar tabla ventas
        console.log('📋 TABLA VENTAS:');
        const ventasColumns = await db.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'ventas' 
            ORDER BY ordinal_position
        `);
        
        ventasColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
        });
        
        console.log('\n📋 TABLA VENTA_DETALLES:');
        // 2. Verificar tabla venta_detalles
        try {
            const detallesColumns = await db.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'venta_detalles' 
                ORDER BY ordinal_position
            `);
            
            detallesColumns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
            });
        } catch (error) {
            console.log('  ❌ Tabla venta_detalles no existe o error:', error.message);
        }
        
        console.log('\n📋 TABLA PRODUCTOS:');
        // 3. Verificar tabla productos
        try {
            const productosColumns = await db.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'productos' 
                ORDER BY ordinal_position
            `);
            
            productosColumns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
            });
        } catch (error) {
            console.log('  ❌ Tabla productos no existe o error:', error.message);
        }
        
        console.log('\n📋 TABLA PEDIDOS:');
        // 4. Verificar tabla pedidos
        try {
            const pedidosColumns = await db.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'pedidos' 
                ORDER BY ordinal_position
            `);
            
            pedidosColumns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
            });
        } catch (error) {
            console.log('  ❌ Tabla pedidos no existe o error:', error.message);
        }
        
        console.log('\n📊 DATOS DE PRUEBA - VENTAS:');
        // 5. Verificar datos existentes
        const ventasData = await db.query('SELECT id, estado_pago, total, monto_pagado, saldo_pendiente FROM ventas LIMIT 3');
        ventasData.rows.forEach(venta => {
            console.log(`  - Venta #${venta.id}: ${venta.estado_pago}, total: ${venta.total}, pagado: ${venta.monto_pagado}, saldo: ${venta.saldo_pendiente}`);
        });
        
        console.log('\n✅ Verificación completada');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error verificando tablas:', error);
        process.exit(1);
    }
}

verificarTablas();
