const db = require('./config/database');

async function verificarStockProductos() {
    try {
        console.log('🔍 Verificando stock de productos para catálogo...\n');
        
        // Obtener todos los productos
        const productos = await db.query(`
            SELECT id, nombre, stock, cantidad_piezas, categoria, precio
            FROM productos 
            ORDER BY nombre
        `);
        
        console.log('📊 Total productos en BD:', productos.rows.length);
        
        // Separar por stock
        const conStock = productos.rows.filter(p => parseFloat(p.stock || 0) > 0);
        const sinStock = productos.rows.filter(p => parseFloat(p.stock || 0) <= 0);
        
        console.log(`✅ Productos con stock > 0: ${conStock.length}`);
        console.log(`❌ Productos con stock <= 0: ${sinStock.length}`);
        
        if (conStock.length > 0) {
            console.log('\n📋 Ejemplos de productos CON stock (deberían mostrarse):');
            conStock.slice(0, 5).forEach(p => {
                console.log(`  - ${p.nombre}: ${parseFloat(p.stock).toFixed(3)} kg`);
            });
        }
        
        if (sinStock.length > 0) {
            console.log('\n📋 Ejemplos de productos SIN stock (no deberían mostrarse):');
            sinStock.slice(0, 5).forEach(p => {
                console.log(`  - ${p.nombre}: ${parseFloat(p.stock).toFixed(3)} kg`);
            });
        }
        
        // Verificar productos con piezas
        const conPiezas = productos.rows.filter(p => parseInt(p.cantidad_piezas || 0) > 0);
        console.log(`\n🔢 Productos con piezas definidas: ${conPiezas.length}`);
        
        if (conPiezas.length > 0) {
            console.log('\n📋 Ejemplos de productos con piezas:');
            conPiezas.slice(0, 3).forEach(p => {
                console.log(`  - ${p.nombre}: ${p.cantidad_piezas} piezas, ${parseFloat(p.stock).toFixed(3)} kg`);
            });
        }
        
        console.log('\n✅ Verificación completada');
        console.log('\n🎯 Resumen para catálogo:');
        console.log(`  - Deberían mostrarse: ${conStock.length} productos`);
        console.log(`  - Deberían ocultarse: ${sinStock.length} productos`);
        
    } catch (error) {
        console.error('❌ Error verificando stock:', error);
    }
}

verificarStockProductos();
