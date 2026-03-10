const db = require('./config/database');

async function verificarHamburguesasEspecificas() {
    try {
        console.log('🔍 Verificando productos específicos para icono 🍔...\n');
        
        // Lista de productos específicos a verificar
        const productosEspecificos = [
            'Hamburguesa Pollo Con Tocipanceta',
            'Hamburguesa De Pollo', 
            'Hamburguesa Clasica',
            'Hamburguesa Chistorra',
            'hamburguesa de cordero'
        ];
        
        console.log('🍔 Buscando productos específicos:\n');
        
        for (const nombreProducto of productosEspecificos) {
            const resultado = await db.query(`
                SELECT id, nombre, categoria, stock, precio, cantidad_piezas
                FROM productos 
                WHERE nombre ILIKE $1
                ORDER BY nombre
            `, [`%${nombreProducto}%`]);
            
            if (resultado.rows.length > 0) {
                resultado.rows.forEach(p => {
                    console.log(`✅ ${p.nombre}`);
                    console.log(`   📂 Categoría: ${p.categoria}`);
                    console.log(`   📊 Stock: ${parseFloat(p.stock || 0).toFixed(3)} kg`);
                    console.log(`   💰 Precio: $${parseFloat(p.precio || 0).toFixed(2)}`);
                    console.log(`   🔢 Piezas: ${p.cantidad_piezas || 0}`);
                    console.log(`   🍔 Icono esperado: 🍔\n`);
                });
            } else {
                console.log(`❌ No encontrado: "${nombreProducto}"\n`);
            }
        }
        
        // Verificar todos los productos que contienen "hamburguesa"
        const todasHamburguesas = await db.query(`
            SELECT id, nombre, categoria, stock
            FROM productos 
            WHERE nombre ILIKE '%hamburguesa%' OR categoria ILIKE '%hamburguesa%'
            ORDER BY nombre
        `);
        
        console.log(`📊 Total de productos con "hamburguesa": ${todasHamburguesas.rows.length}\n`);
        
        todasHamburguesas.rows.forEach(p => {
            const tieneIcono = p.nombre.toLowerCase().includes('hamburguesa') || 
                             p.categoria.toLowerCase().includes('hamburguesa');
            console.log(`${tieneIcono ? '🍔' : '❌'} ${p.nombre} - ${p.categoria}`);
        });
        
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando hamburguesas específicas:', error);
    }
}

verificarHamburguesasEspecificas();
