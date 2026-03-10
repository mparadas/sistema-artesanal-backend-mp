const db = require('./config/database');

async function corregirUrlsImagenes() {
    try {
        console.log('🔍 Corrigiendo URLs de imágenes de productos...\n');
        
        // Obtener productos con URLs locales
        const productosUrlsLocales = await db.query(`
            SELECT id, nombre, imagen_url 
            FROM productos 
            WHERE imagen_url IS NOT NULL 
            AND imagen_url != ''
            AND (imagen_url LIKE '%192.168.100.224%' OR imagen_url LIKE '%localhost%')
        `);
        
        console.log(`📊 Productos con URLs locales: ${productosUrlsLocales.rows.length}`);
        
        if (productosUrlsLocales.rows.length === 0) {
            console.log('✅ No hay productos con URLs locales que corregir');
            return;
        }
        
        // Corregir cada URL
        for (const producto of productosUrlsLocales.rows) {
            const urlLocal = producto.imagen_url;
            
            // Extraer nombre del archivo
            const nombreArchivo = urlLocal.split('/').pop();
            const urlCorregida = `https://agromae-b.onrender.com/uploads/productos/${nombreArchivo}`;
            
            console.log(`🔄 Producto #${producto.id}: ${producto.nombre}`);
            console.log(`  Antes: ${urlLocal}`);
            console.log(`  Después: ${urlCorregida}`);
            
            // Actualizar en la base de datos
            await db.query(`
                UPDATE productos 
                SET imagen_url = $1 
                WHERE id = $2
            `, [urlCorregida, producto.id]);
            
            console.log('  ✅ Actualizado\n');
        }
        
        // Verificación final
        const productosConImagenes = await db.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN imagen_url LIKE '%agromae-b.onrender.com%' THEN 1 END) as urls_corregidas
            FROM productos 
            WHERE imagen_url IS NOT NULL 
            AND imagen_url != ''
        `);
        
        console.log('📊 Estadísticas finales:');
        console.log(`  - Total productos con imágenes: ${productosConImagenes.rows[0].total}`);
        console.log(`  - URLs corregidas: ${productosConImagenes.rows[0].urls_corregidas}`);
        
        console.log('\n✅ Corrección completada');
        
    } catch (error) {
        console.error('❌ Error corrigiendo URLs:', error);
    }
}

corregirUrlsImagenes();
