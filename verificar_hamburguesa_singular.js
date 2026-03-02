const db = require('./config/database');

async function verificarHamburguesaSingular() {
    try {
        console.log('🔍 Verificando productos con "hamburguesa" (singular)...\n');
        
        // Obtener productos que contienen "hamburguesa" exacta
        const hamburguesaExacta = await db.query(`
            SELECT id, nombre, categoria, stock, precio, cantidad_piezas
            FROM productos 
            WHERE nombre ILIKE '%hamburguesa%' OR categoria ILIKE '%hamburguesa%'
            ORDER BY nombre
        `);
        
        console.log(`🍔 Encontrados ${hamburguesaExacta.rows.length} productos con "hamburguesa":\n`);
        
        if (hamburguesaExacta.rows.length > 0) {
            hamburguesaExacta.rows.forEach((p, index) => {
                console.log(`${index + 1}. ${p.nombre}`);
                console.log(`   📂 Categoría: ${p.categoria}`);
                console.log(`   🍔 Contiene "hamburguesa": ${p.nombre.toLowerCase().includes('hamburguesa') || p.categoria.toLowerCase().includes('hamburguesa') ? 'SÍ' : 'NO'}`);
                console.log(`   📊 Stock: ${parseFloat(p.stock || 0).toFixed(3)} kg`);
                console.log(`   💰 Precio: $${parseFloat(p.precio || 0).toFixed(2)}`);
                console.log(`   🔢 Piezas: ${p.cantidad_piezas || 0}`);
                console.log(`   🍔 Icono: 🍔\n`);
            });
        }
        
        // Verificar si hay productos con "hamburguesas" (plural)
        const hamburguesasPlural = await db.query(`
            SELECT id, nombre, categoria
            FROM productos 
            WHERE nombre ILIKE '%hamburguesas%' OR categoria ILIKE '%hamburguesas%'
            ORDER BY nombre
        `);
        
        console.log(`🔍 Productos con "hamburguesas" (plural): ${hamburguesasPlural.rows.length}`);
        if (hamburguesasPlural.rows.length > 0) {
            hamburguesasPlural.rows.forEach(p => {
                console.log(`   - ${p.nombre} (${p.categoria})`);
            });
        }
        
        console.log('\n🎯 Resumen:');
        console.log(`   - Con "hamburguesa" (singular): ${hamburguesaExacta.rows.length}`);
        console.log(`   - Con "hamburguesas" (plural): ${hamburguesasPlural.rows.length}`);
        console.log(`   - Icono para "hamburguesa": 🍔`);
        
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando hamburguesa singular:', error);
    }
}

verificarHamburguesaSingular();
