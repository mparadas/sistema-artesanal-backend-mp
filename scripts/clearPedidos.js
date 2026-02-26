const db = require('../config/database');

async function clearPedidos() {
    try {
        console.log('🗑️  Eliminando información de la tabla de pedidos...');
        
        // Eliminar dependencias primero
        const result1 = await db.query('DELETE FROM pedido_pagos');
        console.log(`  ✅ pedido_pagos: ${result1.rowCount} filas eliminadas`);
        
        const result2 = await db.query('DELETE FROM pedido_items');
        console.log(`  ✅ pedido_items: ${result2.rowCount} filas eliminadas`);
        
        const result3 = await db.query('DELETE FROM pedidos');
        console.log(`  ✅ pedidos: ${result3.rowCount} filas eliminadas`);
        
        // Reiniciar secuencia
        await db.query('ALTER SEQUENCE pedidos_id_seq RESTART WITH 1');
        console.log(`  🔄 pedidos_id_seq: reiniciada`);
        
        console.log('\n✅ Tabla de pedidos vaciada correctamente');
        
        // Verificar estado
        const count = await db.query('SELECT COUNT(*) as total FROM pedidos');
        console.log(`📊 Pedidos restantes: ${count.rows[0].total}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al eliminar pedidos:', error.message);
        process.exit(1);
    }
}

clearPedidos();
