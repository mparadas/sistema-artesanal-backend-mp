const db = require('../config/database');

async function actualizarStockCero() {
    try {
        console.log('🔄 Actualizando stock a 0 en todos los ingredientes...');
        
        // Actualizar stock a 0 en todos los registros
        const result = await db.query(`
            UPDATE ingredientes 
            SET stock = 0 
            WHERE stock > 0
        `);
        
        console.log(`✅ ${result.rowCount} ingredientes actualizados con stock = 0`);
        
        // Verificar el resultado
        const verification = await db.query(`
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as con_stock_cero,
                   MIN(stock) as stock_min,
                   MAX(stock) as stock_max
            FROM ingredientes
        `);
        
        const stats = verification.rows[0];
        console.log('\n📊 Estadísticas de stock:');
        console.log(`  Total ingredientes: ${stats.total}`);
        console.log(`  Con stock = 0: ${stats.con_stock_cero}`);
        console.log(`  Stock mínimo: ${stats.stock_min}`);
        console.log(`  Stock máximo: ${stats.stock_max}`);
        
        // Mostrar muestra de ingredientes actualizados
        const muestra = await db.query(`
            SELECT nombre, costo, unidad, categoria, stock, stock_minimo
            FROM ingredientes 
            ORDER BY categoria, nombre
            LIMIT 10
        `);
        
        console.log('\n📋 Muestra de ingredientes (stock actualizado):');
        muestra.rows.forEach(ing => {
            console.log(`  ${ing.nombre} - $${ing.costo}/${ing.unidad} - ${ing.categoria} - Stock: ${ing.stock}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al actualizar stock:', error.message);
        process.exit(1);
    }
}

actualizarStockCero();
