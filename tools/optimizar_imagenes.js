// Script para optimizar URLs de imágenes y eliminar duplicados
console.log('🚀 OPTIMIZANDO URLs DE IMÁGENES\n');

const db = require('./config/database');

async function optimizarImagenes() {
  try {
    console.log('📡 Obteniendo productos...');
    
    // Obtener todos los productos
    const result = await db.query('SELECT id, nombre, imagen_url FROM productos');
    const productos = result.rows;
    
    console.log(`📊 ${productos.length} productos totales`);
    
    // Agrupar productos por imagen_url para encontrar duplicados
    const urlsEncontradas = {};
    const duplicados = [];
    
    productos.forEach(producto => {
      if (producto.imagen_url) {
        if (urlsEncontradas[producto.imagen_url]) {
          duplicados.push(producto);
        } else {
          urlsEncontradas[producto.imagen_url] = producto;
        }
      }
    });
    
    console.log(`🔍 ${duplicados.length} productos con imágenes duplicadas`);
    
    // Limpiar duplicados
    let limpiados = 0;
    for (const producto of duplicados) {
      console.log(`🧹 Limpiando duplicado: ${producto.nombre}`);
      await db.query('UPDATE productos SET imagen_url = NULL WHERE id = $1', [producto.id]);
      limpiados++;
    }
    
    // Verificar imágenes que no existen
    console.log('\n🔍 Verificando imágenes que existen...');
    const urlsValidas = [];
    const urlsInvalidas = [];
    
    for (const [url, producto] of Object.entries(urlsEncontradas)) {
      try {
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        
        if (response.ok) {
          urlsValidas.push({ url, producto });
          console.log(`✅ ${producto.nombre} - Imagen existe`);
        } else {
          urlsInvalidas.push({ url, producto });
          console.log(`❌ ${producto.nombre} - Imagen no existe (${response.status})`);
        }
      } catch (error) {
        urlsInvalidas.push({ url, producto });
        console.log(`💥 ${producto.nombre} - Error verificando: ${error.message}`);
      }
    }
    
    // Limpiar URLs inválidas
    for (const { url, producto } of urlsInvalidas) {
      console.log(`🧹 Limpiando URL inválida: ${producto.nombre}`);
      await db.query('UPDATE productos SET imagen_url = NULL WHERE id = $1', [producto.id]);
      limpiados++;
    }
    
    console.log('\n🎯 RESUMEN:');
    console.log(`   • Productos totales: ${productos.length}`);
    console.log(`   • Imágenes duplicadas: ${duplicados.length}`);
    console.log(`   • Imágenes inválidas: ${urlsInvalidas.length}`);
    console.log(`   • URLs limpiadas: ${limpiados}`);
    console.log(`   • Imágenes válidas: ${urlsValidas.length}`);
    
    console.log('\n✅ Optimización completada');
    console.log('📱 El frontend cargará más rápido ahora');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    process.exit(0);
  }
}

optimizarImagenes();
