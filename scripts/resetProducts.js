const db = require('../config/database');

async function resetProducts() {
    try {
        console.log('🗄️  Reiniciando tabla de productos...');
        
        // Eliminar dependencias en orden correcto
        await db.query('DELETE FROM receta_ingredientes');
        await db.query('DELETE FROM recetas');
        await db.query('DELETE FROM pedido_items');
        await db.query('DELETE FROM venta_detalles');
        await db.query('DELETE FROM productos');
        
        // Reiniciar secuencia
        await db.query('ALTER SEQUENCE productos_id_seq RESTART WITH 1');
        
        // Insertar productos base
        await db.query(`
            INSERT INTO productos (nombre, categoria, precio, stock, stock_minimo, unidad) VALUES
            ('Chorizo Tradicional', 'Chorizos', 15.50, 25, 10, 'kg'),
            ('Hamburguesa Artesanal', 'Hamburguesas', 8.00, 50, 20, 'unidad'),
            ('Queso Mozzarella', 'Quesos', 12.00, 15, 5, 'kg'),
            ('Chistorra Vasca', 'Chistorras', 18.00, 20, 8, 'kg'),
            ('Jamón Curado', 'Curados', 25.00, 10, 3, 'kg')
        `);
        
        console.log('✅ Productos reinicializados correctamente');
        console.log('📦 Productos agregados:');
        
        const result = await db.query('SELECT id, nombre, categoria, precio, stock, unidad FROM productos ORDER BY id');
        result.rows.forEach(p => {
            console.log(`  ${p.id}. ${p.nombre} - $${p.precio}/${p.unidad} (Stock: ${p.stock} ${p.unidad})`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al reiniciar productos:', error.message);
        process.exit(1);
    }
}

resetProducts();
