const db = require('./config/database');

async function verificarHamburguesas() {
    try {
        console.log('🔍 Verificando productos con hamburguesa...\n');
        
        // Obtener productos que contienen "hamburguesa" en nombre o categoría
        const hamburguesas = await db.query(`
            SELECT id, nombre, categoria, stock, precio, cantidad_piezas
            FROM productos 
            WHERE nombre ILIKE '%hamburguesa%' OR categoria ILIKE '%hamburguesa%'
            ORDER BY nombre
        `);
        
        console.log(`🍔 Encontrados ${hamburguesas.rows.length} productos con hamburguesa:\n`);
        
        if (hamburguesas.rows.length > 0) {
            hamburguesas.rows.forEach((p, index) => {
                console.log(`${index + 1}. ${p.nombre}`);
                console.log(`   📂 Categoría: ${p.categoria}`);
                console.log(`   📊 Stock: ${parseFloat(p.stock || 0).toFixed(3)} kg`);
                console.log(`   💰 Precio: $${parseFloat(p.precio || 0).toFixed(2)}`);
                console.log(`   🔢 Piezas: ${p.cantidad_piezas || 0}`);
                console.log(`   🍔 Icono esperado: 🍔\n`);
            });
        } else {
            console.log('❌ No se encontraron productos con "hamburguesa"');
        }
        
        // Verificar si hay productos que deberían tener icono de hamburguesa
        console.log('🎯 Resumen:');
        console.log(`   - Productos con hamburguesa: ${hamburguesas.rows.length}`);
        console.log(`   - Icono correcto: 🍔`);
        console.log(`   - Icono anterior: 🥩`);
        
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando hamburguesas:', error);
    }
}

verificarHamburguesas();
