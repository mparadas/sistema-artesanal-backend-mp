const db = require('./config/database');

async function agregarHamburguesaCordero() {
    try {
        console.log('🔍 Opción: Agregar "hamburguesa de cordero" a la base de datos\n');
        
        // Verificar si ya existe
        const existe = await db.query(`
            SELECT id, nombre FROM productos 
            WHERE nombre ILIKE '%hamburguesa%cordero%'
        `);
        
        if (existe.rows.length > 0) {
            console.log('❌ Ya existe un producto similar:');
            existe.rows.forEach(p => {
                console.log(`   - ${p.nombre} (ID: ${p.id})`);
            });
            return;
        }
        
        console.log('✅ Producto no encontrado. Para agregarlo manualmente:\n');
        console.log('📝 SQL para agregar hamburguesa de cordero:');
        console.log(`INSERT INTO productos (nombre, categoria, precio, stock, stock_minimo, unidad, tipo_producto, animal_origen) 
VALUES ('Hamburguesa de Cordero', 'Hamburguesas', 25.50, 15.000, 5.000, 'kg', 'procesado', 'cordero');`);
        
        console.log('\n🎯 O ejecuta este script para agregarlo automáticamente:');
        console.log('   - Descomenta el código de inserción abajo');
        console.log('   - Ajusta los valores según necesites');
        
        // Código comentado para inserción automática (descomentar si es necesario)
        /*
        const resultado = await db.query(`
            INSERT INTO productos (nombre, categoria, precio, stock, stock_minimo, unidad, tipo_producto, animal_origen) 
            VALUES ('Hamburguesa de Cordero', 'Hamburguesas', 25.50, 15.000, 5.000, 'kg', 'procesado', 'cordero')
            RETURNING id, nombre
        `);
        
        console.log(`✅ Agregado: ${resultado.rows[0].nombre} (ID: ${resultado.rows[0].id})`);
        */
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

agregarHamburguesaCordero();
