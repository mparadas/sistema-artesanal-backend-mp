const db = require('../config/database');

async function clearMainTables() {
    try {
        console.log('🗑️  Eliminando datos de tablas principales (excepto usuarios y clientes)...');
        
        // Eliminar en orden correcto por dependencias
        const tables = [
            'venta_pagos',
            'venta_detalles', 
            'ventas',
            'pedido_pagos',
            'pedido_items',
            'pedidos',
            'receta_ingredientes',
            'recetas',
            'produccion',
            'ingredientes',
            'productos'
        ];
        
        let totalEliminadas = 0;
        
        for (const table of tables) {
            const result = await db.query(`DELETE FROM ${table}`);
            const count = result.rowCount;
            totalEliminadas += count;
            console.log(`  ✅ ${table}: ${count} filas eliminadas`);
        }
        
        // Reiniciar secuencias importantes
        const sequences = [
            'productos_id_seq',
            'pedidos_id_seq', 
            'ventas_id_seq',
            'ingredientes_id_seq',
            'recetas_id_seq'
        ];
        
        for (const seq of sequences) {
            try {
                await db.query(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
                console.log(`  🔄 ${seq}: reiniciada`);
            } catch (e) {
                // La secuencia podría no existir
            }
        }
        
        console.log(`\n✅ Eliminación completada: ${totalEliminadas} filas totales`);
        
        // Verificar estado final
        const counts = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM productos) as productos,
                (SELECT COUNT(*) FROM pedidos) as pedidos,
                (SELECT COUNT(*) FROM ventas) as ventas,
                (SELECT COUNT(*) FROM clientes) as clientes,
                (SELECT COUNT(*) FROM usuarios) as usuarios,
                (SELECT COUNT(*) FROM ingredientes) as ingredientes,
                (SELECT COUNT(*) FROM recetas) as recetas
        `);
        
        console.log('\n📊 Estado final:');
        Object.entries(counts.rows[0]).forEach(([table, count]) => {
            const status = count === 0 ? '🔴 Vacía' : `🟢 ${count} registros`;
            console.log(`  ${table}: ${status}`);
        });
        
        console.log('\n📝 NOTA: Usuarios y Clientes fueron preservados');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al eliminar datos:', error.message);
        process.exit(1);
    }
}

clearMainTables();
