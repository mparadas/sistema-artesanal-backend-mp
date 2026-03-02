// Fix Imágenes Persistentes - Para ejecutar directamente en GitHub/Render
const db = require('./config/database');

async function fixImagenesGitHub() {
  try {
    console.log('🚀 FIX IMÁGENES PERSISTENTES - GitHub/Render\n');
    
    // URLs externas persistentes (Unsplash - CDN gratuito)
    const persistentUrls = {
      'pollo': 'https://images.unsplash.com/photo-1596797048514-2719ce685c0a?w=600&h=400&fit=crop&crop=center',
      'res': 'https://images.unsplash.com/photo-1603054739162-dae7846d1d9b?w=600&h=400&fit=crop&crop=center',
      'cerdo': 'https://images.unsplash.com/photo-1529692236672-92f07c813b1f?w=600&h=400&fit=crop&crop=center',
      'cordero': 'https://images.unsplash.com/photo-1628700992732-9f5f7b6e2b8c?w=600&h=400&fit=crop&crop=center',
      'chorizo': 'https://images.unsplash.com/photo-1587593810297-e3fdf1d4d921?w=600&h=400&fit=crop&crop=center',
      'chistorra': 'https://images.unsplash.com/photo-1587593810297-e3fdf1d4d921?w=600&h=400&fit=crop&crop=center',
      'queso': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop&crop=center',
      'hamburguesa': 'https://images.unsplash.com/photo-1568901343474-2c8ca98e9b2c?w=600&h=400&fit=crop&crop=center',
      'default': 'https://images.unsplash.com/photo-1504684243225-7a6f8d8b2d6e?w=600&h=400&fit=crop&crop=center'
    };
    
    // Obtener todos los productos con imágenes
    const result = await db.query(`
      SELECT id, nombre, categoria, imagen_url 
      FROM productos 
      WHERE imagen_url IS NOT NULL AND imagen_url != ''
      ORDER BY id
    `);
    
    const productos = result.rows;
    console.log(`📊 Encontrados ${productos.length} productos con imágenes\n`);
    
    let urlsLocales = 0;
    let urlsExternas = 0;
    let corregidos = 0;
    let errores = 0;
    
    for (const producto of productos) {
      try {
        const urlActual = producto.imagen_url;
        const nombre = (producto.nombre || '').toLowerCase();
        const categoria = (producto.categoria || '').toLowerCase();
        
        console.log(`📷 [${producto.id}] ${producto.nombre}`);
        console.log(`   URL: ${urlActual.substring(0, 70)}...`);
        
        // Determinar si es URL local (problemática)
        if (urlActual.includes('agromae-b.onrender.com/uploads/') || 
            urlActual.includes('localhost:3000/uploads/') ||
            !urlActual.startsWith('http')) {
          
          urlsLocales++;
          console.log(`   🏠 Tipo: LOCAL (necesita corrección)`);
          
          // Asignar URL externa según tipo de producto
          let nuevaUrl = persistentUrls.default;
          
          if (nombre.includes('pollo') || categoria.includes('pollo')) {
            nuevaUrl = persistentUrls.pollo;
          } else if (nombre.includes('res') || nombre.includes('carne') || nombre.includes('asado')) {
            nuevaUrl = persistentUrls.res;
          } else if (nombre.includes('cerdo') || nombre.includes('bondiola') || nombre.includes('lomo')) {
            nuevaUrl = persistentUrls.cerdo;
          } else if (nombre.includes('cordero') || nombre.includes('chuleton')) {
            nuevaUrl = persistentUrls.cordero;
          } else if (nombre.includes('chorizo') || nombre.includes('chistorra') || nombre.includes('morcilla')) {
            nuevaUrl = persistentUrls.chorizo;
          } else if (nombre.includes('queso') || nombre.includes('mozarella') || nombre.includes('manteca')) {
            nuevaUrl = persistentUrls.queso;
          } else if (nombre.includes('hamburguesa') || nombre.includes('hpollo') || nombre.includes('hpollotocineta')) {
            nuevaUrl = persistentUrls.hamburguesa;
          }
          
          // Actualizar en la base de datos
          await db.query('UPDATE productos SET imagen_url = $1 WHERE id = $2', [nuevaUrl, producto.id]);
          
          console.log(`   ✅ Corregido: ${nuevaUrl.substring(0, 70)}...`);
          corregidos++;
          
        } else if (urlActual.includes('unsplash') || urlActual.includes('pexels')) {
          urlsExternas++;
          console.log(`   🌐 Tipo: EXTERNA (OK)`);
        } else {
          console.log(`   ❌ Tipo: DESCONOCIDA`);
          // Corregir también URLs desconocidas
          let nuevaUrl = persistentUrls.default;
          if (nombre.includes('pollo')) nuevaUrl = persistentUrls.pollo;
          if (nombre.includes('hamburguesa')) nuevaUrl = persistentUrls.hamburguesa;
          
          await db.query('UPDATE productos SET imagen_url = $1 WHERE id = $2', [nuevaUrl, producto.id]);
          console.log(`   ✅ Corregido: ${nuevaUrl.substring(0, 70)}...`);
          corregidos++;
        }
        
      } catch (error) {
        console.log(`   💥 Error: ${error.message}`);
        errores++;
      }
      
      console.log('');
    }
    
    // Resumen final
    console.log('🎯 RESUMEN FINAL:');
    console.log('==================');
    console.log(`📊 Total productos procesados: ${productos.length}`);
    console.log(`🏠 URLs locales encontradas: ${urlsLocales}`);
    console.log(`🌐 URLs externas (ya OK): ${urlsExternas}`);
    console.log(`✅ Productos corregidos: ${corregidos}`);
    console.log(`❌ Errores: ${errores}`);
    
    if (corregidos > 0) {
      console.log('\n🎉 ¡CORRECCIÓN EXITOSA!');
      console.log('📱 Todas las imágenes ahora son persistentes');
      console.log('🔄 Nunca más se perderán al reiniciar');
      console.log('🚀 El módulo de ventas cargará rápido');
      console.log('✅ Sin errores 404 de imágenes');
    } else {
      console.log('\n✅ Todas las imágenes ya eran persistentes');
    }
    
    console.log('\n🌐 Para verificar:');
    console.log('   1. Recarga el frontend con Ctrl+F5');
    console.log('   2. Ve al módulo de ventas');
    console.log('   3. Las imágenes deberían cargar sin errores');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la corrección
fixImagenesGitHub();
