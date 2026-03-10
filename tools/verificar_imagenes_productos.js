const fs = require('fs');
const path = require('path');

async function verificarImagenesProductos() {
    try {
        console.log('🔍 Verificando sistema de imágenes de productos...\n');
        
        // Verificar directorio uploads
        const uploadsDir = path.join(__dirname, 'uploads');
        const productosDir = path.join(uploadsDir, 'productos');
        
        console.log('📁 Directorios:');
        console.log('  - uploads:', fs.existsSync(uploadsDir) ? '✅ Existe' : '❌ No existe');
        console.log('  - uploads/productos:', fs.existsSync(productosDir) ? '✅ Existe' : '❌ No existe');
        
        if (fs.existsSync(productosDir)) {
            const archivos = fs.readdirSync(productosDir);
            console.log(`  - Archivos en uploads/productos: ${archivos.length}`);
            
            if (archivos.length > 0) {
                console.log('  - Primeros 5 archivos:');
                archivos.slice(0, 5).forEach(archivo => {
                    const filePath = path.join(productosDir, archivo);
                    const stats = fs.statSync(filePath);
                    console.log(`    * ${archivo} (${stats.size} bytes)`);
                });
            }
        }
        
        // Verificar productos con imágenes en BD
        const db = require('./config/database');
        const productosConImagen = await db.query(`
            SELECT id, nombre, imagen_url 
            FROM productos 
            WHERE imagen_url IS NOT NULL 
            AND imagen_url != ''
            LIMIT 5
        `);
        
        console.log('\n📊 Productos con imágenes en BD:');
        if (productosConImagen.rows.length > 0) {
            productosConImagen.rows.forEach(producto => {
                console.log(`  - #${producto.id} ${producto.nombre}: ${producto.imagen_url}`);
            });
        } else {
            console.log('  - ❌ No hay productos con imágenes en la BD');
        }
        
        // Verificar productos sin imágenes
        const productosSinImagen = await db.query(`
            SELECT COUNT(*) as total 
            FROM productos 
            WHERE imagen_url IS NULL OR imagen_url = ''
        `);
        
        console.log('\n📊 Productos sin imágenes:');
        console.log(`  - Total: ${productosSinImagen.rows[0].total}`);
        
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error verificando imágenes:', error);
    }
}

verificarImagenesProductos();
