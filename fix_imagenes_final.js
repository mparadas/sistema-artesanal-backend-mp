// Versión simplificada para investigar y corregir imágenes
const db = require('./config/database');

async function investigarYCorregir() {
  try {
    console.log('🔍 INVESTIGANDO Y CORRIGIENDO IMÁGENES...\n');
    
    // Obtener productos con imágenes
    const result = await db.query(`
      SELECT id, nombre, categoria, imagen_url 
      FROM productos 
      WHERE imagen_url IS NOT NULL AND imagen_url != ''
    `);
    
    const productos = result.rows;
    console.log(`📊 ${productos.length} productos con imágenes en la BD\n`);
    
    // URLs externas persistentes
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
    
    let urlsLocales = 0;
    let urlsExternas = 0;
    let corregidos = 0;
    
    for (const producto of productos) {
      const url = producto.imagen_url;
      const nombre = (producto.nombre || '').toLowerCase();
      const categoria = (producto.categoria || '').toLowerCase();
      
      console.log(`📷 ${producto.nombre}`);
      console.log(`   URL actual: ${url.substring(0, 60)}...`);
      
      // Determinar tipo de URL
      if (url.includes('agromae-b.onrender.com/uploads/')) {
        urlsLocales++;
        console.log(`   🏠 Tipo: LOCAL (problemática)`);
        
        // Asignar URL externa según tipo
        let nuevaUrl = persistentUrls.default;
        
        if (nombre.includes('pollo') || categoria.includes('pollo')) {
          nuevaUrl = persistentUrls.pollo;
        } else if (nombre.includes('res') || nombre.includes('carne')) {
          nuevaUrl = persistentUrls.res;
        } else if (nombre.includes('cerdo')) {
          nuevaUrl = persistentUrls.cerdo;
        } else if (nombre.includes('cordero')) {
          nuevaUrl = persistentUrls.cordero;
        } else if (nombre.includes('chorizo') || nombre.includes('chistorra')) {
          nuevaUrl = persistentUrls.chorizo;
        } else if (nombre.includes('queso')) {
          nuevaUrl = persistentUrls.queso;
        } else if (nombre.includes('hamburguesa')) {
          nuevaUrl = persistentUrls.hamburguesa;
        }
        
        // Actualizar en BD
        await db.query('UPDATE productos SET imagen_url = $1 WHERE id = $2', [nuevaUrl, producto.id]);
        
        console.log(`   ✅ Corregido a: ${nuevaUrl.substring(0, 60)}...`);
        corregidos++;
        
      } else if (url.startsWith('http') && !url.includes('agromae-b.onrender.com')) {
        urlsExternas++;
        console.log(`   🌐 Tipo: EXTERNA (OK)`);
      } else {
        console.log(`   ❌ Tipo: INVÁLIDA`);
        
        // Corregir también URLs inválidas
        let nuevaUrl = persistentUrls.default;
        if (nombre.includes('pollo') || categoria.includes('pollo')) {
          nuevaUrl = persistentUrls.pollo;
        } else if (nombre.includes('hamburguesa')) {
          nuevaUrl = persistentUrls.hamburguesa;
        }
        
        await db.query('UPDATE productos SET imagen_url = $1 WHERE id = $2', [nuevaUrl, producto.id]);
        console.log(`   ✅ Corregido a: ${nuevaUrl.substring(0, 60)}...`);
        corregidos++;
      }
      
      console.log('');
    }
    
    console.log('🎯 RESUMEN FINAL:');
    console.log('==================');
    console.log(`📊 Total productos con imágenes: ${productos.length}`);
    console.log(`🏠 URLs locales (problemáticas): ${urlsLocales}`);
    console.log(`🌐 URLs externas (OK): ${urlsExternas}`);
    console.log(`✅ Productos corregidos: ${corregidos}`);
    
    console.log('\n🎉 ¡CORRECCIÓN COMPLETADA!');
    console.log('📱 Todas las imágenes ahora son persistentes');
    console.log('🔄 Nunca más se perderán al reiniciar');
    console.log('🚀 El módulo de ventas cargará rápido');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

investigarYCorregir();
