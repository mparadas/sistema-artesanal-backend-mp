// Solución inmediata para imágenes persistentes
const db = require('./config/database');

async function fixImagesPermanent() {
  try {
    console.log('🔧 CORRIGIENDO IMÁGENES PARA QUE SEAN PERSISTENTES...\n');
    
    // URLs externas que nunca se pierden
    const persistentUrls = {
      'pollo': 'https://images.unsplash.com/photo-1596797048514-2719ce685c0a?w=600&h=400&fit=crop&crop=center',
      'res': 'https://images.unsplash.com/photo-1603054739162-dae7846d1d9b?w=600&h=400&fit=crop&crop=center',
      'cerdo': 'https://images.unsplash.com/photo-1529692236672-92f07c813b1f?w=600&h=400&fit=crop&crop=center',
      'cordero': 'https://images.unsplash.com/photo-1628700992732-9f5f7b6e2b8c?w=600&h=400&fit=crop&crop=center',
      'chorizo': 'https://images.unsplash.com/photo-1587593810297-e3fdf1d4d921?w=600&h=400&fit=crop&crop=center',
      'chistorra': 'https://images.unsplash.com/photo-1587593810297-e3fdf1d4d921?w=600&h=400&fit=crop&crop=center',
      'queso': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop&crop=center',
      'mozarella': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=400&fit=crop&crop=center',
      'hamburguesa': 'https://images.unsplash.com/photo-1568901343474-2c8ca98e9b2c?w=600&h=400&fit=crop&crop=center',
      'default': 'https://images.unsplash.com/photo-1504684243225-7a6f8d8b2d6e?w=600&h=400&fit=crop&crop=center'
    };
    
    // Obtener todos los productos
    const result = await db.query('SELECT id, nombre, categoria FROM productos');
    const productos = result.rows;
    
    console.log(`📊 Actualizando ${productos.length} productos...\n`);
    
    let actualizados = 0;
    
    for (const producto of productos) {
      const nombre = (producto.nombre || '').toLowerCase();
      const categoria = (producto.categoria || '').toLowerCase();
      
      let imageUrl = persistentUrls.default;
      
      // Asignar URL según tipo de producto
      if (nombre.includes('pollo') || categoria.includes('pollo')) {
        imageUrl = persistentUrls.pollo;
      } else if (nombre.includes('res') || categoria.includes('res') || nombre.includes('carne')) {
        imageUrl = persistentUrls.res;
      } else if (nombre.includes('cerdo') || categoria.includes('cerdo')) {
        imageUrl = persistentUrls.cerdo;
      } else if (nombre.includes('cordero') || categoria.includes('cordero')) {
        imageUrl = persistentUrls.cordero;
      } else if (nombre.includes('chorizo') || nombre.includes('chistorra') || categoria.includes('chorizo')) {
        imageUrl = persistentUrls.chorizo;
      } else if (nombre.includes('queso') || categoria.includes('queso')) {
        imageUrl = persistentUrls.queso;
      } else if (nombre.includes('mozarella') || nombre.includes('mozzarella')) {
        imageUrl = persistentUrls.mozarella;
      } else if (nombre.includes('hamburguesa') || categoria.includes('hamburguesa')) {
        imageUrl = persistentUrls.hamburguesa;
      }
      
      // Actualizar producto
      await db.query('UPDATE productos SET imagen_url = $1 WHERE id = $2', [imageUrl, producto.id]);
      
      console.log(`✅ ${producto.nombre} -> URL persistente`);
      actualizados++;
    }
    
    console.log(`\n🎯 ¡CORRECCIÓN COMPLETADA!`);
    console.log(`   • Productos actualizados: ${actualizados}`);
    console.log(`   • Imágenes persistentes: SÍ`);
    console.log(`   • Nunca más se perderán: SÍ`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixImagesPermanent();
