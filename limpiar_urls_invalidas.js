// Script para limpiar URLs de imágenes que no existen
console.log('🧹 LIMPIANDO URLs DE IMÁGENES INVÁLIDAS\n');

const db = require('./config/database');

async function limpiarUrlsInvalidas() {
  try {
    console.log('📡 Obteniendo productos...');
    
    // Obtener todos los productos
    const result = await db.query('SELECT id, nombre, imagen_url FROM productos WHERE imagen_url IS NOT NULL AND imagen_url != \'\'');
    const productos = result.rows;
    
    console.log(`📊 ${productos.length} productos con imagen`);
    
    let actualizados = 0;
    
    for (const producto of productos) {
      const imageUrl = producto.imagen_url;
      
      // Verificar si la URL es de agromae-b.onrender.com
      if (imageUrl.includes('agromae-b.onrender.com/uploads/')) {
        console.log(`🔍 Verificando: ${producto.nombre}`);
        console.log(`   📷 URL: ${imageUrl}`);
        
        try {
          // Intentar acceder a la imagen
          const response = await fetch(imageUrl, { method: 'HEAD' });
          
          if (!response.ok) {
            console.log(`   ❌ Imagen no existe (${response.status}) - Limpiando URL`);
            
            // Limpiar la URL
            await db.query('UPDATE productos SET imagen_url = NULL WHERE id = $1', [producto.id]);
            actualizados++;
            
            console.log(`   ✅ URL limpiada para ${producto.nombre}`);
          } else {
            console.log(`   ✅ Imagen existe - Manteniendo URL`);
          }
        } catch (error) {
          console.log(`   💥 Error verificando imagen: ${error.message} - Limpiando URL`);
          
          // Si hay error de red, también limpiamos
          await db.query('UPDATE productos SET imagen_url = NULL WHERE id = $1', [producto.id]);
          actualizados++;
        }
      }
      console.log('');
    }
    
    console.log(`🎯 RESUMEN:`);
    console.log(`   • Productos verificados: ${productos.length}`);
    console.log(`   • URLs limpiadas: ${actualizados}`);
    console.log(`   • Productos sin imagen ahora: ${actualizados}`);
    
    if (actualizados > 0) {
      console.log(`\n✅ Se limpiaron ${actualizados} URLs inválidas`);
      console.log(`📱 Los productos ahora mostrarán placeholders`);
    } else {
      console.log(`\n✅ Todas las imágenes existen - No se necesita limpieza`);
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    process.exit(0);
  }
}

limpiarUrlsInvalidas();
