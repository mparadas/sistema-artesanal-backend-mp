// Verificar qué está pasando realmente con las imágenes en la BD
console.log('🔍 INVESTIGANDO URLs EN LA BASE DE DATOS\n');

const db = require('./config/database');

async function investigarUrlsBD() {
  try {
    console.log('📡 Obteniendo URLs de imágenes de la BD...\n');
    
    // Obtener todos los productos con imágenes
    const result = await db.query(`
      SELECT id, nombre, categoria, imagen_url 
      FROM productos 
      WHERE imagen_url IS NOT NULL AND imagen_url != ''
      ORDER BY id
    `);
    
    const productos = result.rows;
    console.log(`📊 ${productos.length} productos con imágenes en la BD\n`);
    
    // Analizar las URLs
    const urlsAnalizadas = {
      locales: [],      // URLs que apuntan a archivos locales
      externas: [],     // URLs que apuntan a sitios externos
      invalidas: []     // URLs que parecen inválidas
    };
    
    for (const producto of productos) {
      const url = producto.imagen_url;
      console.log(`📷 ${producto.nombre}:`);
      console.log(`   ID: ${producto.id}`);
      console.log(`   URL: ${url}`);
      
      // Clasificar la URL
      if (url.includes('agromae-b.onrender.com/uploads/')) {
        urlsAnalizadas.locales.push({ producto, url });
        console.log(`   🏠 Tipo: LOCAL (Render)`);
        
        // Verificar si la imagen realmente existe
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ Estado: EXISTE`);
          } else {
            console.log(`   ❌ Estado: NO EXISTE (${response.status})`);
            urlsAnalizadas.invalidas.push({ producto, url, error: response.status });
          }
        } catch (error) {
          console.log(`   💥 Estado: ERROR (${error.message})`);
          urlsAnalizadas.invalidas.push({ producto, url, error: error.message });
        }
        
      } else if (url.startsWith('http')) {
        urlsAnalizadas.externas.push({ producto, url });
        console.log(`   🌐 Tipo: EXTERNA`);
        
        // Verificar URL externa
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            console.log(`   ✅ Estado: EXISTE`);
          } else {
            console.log(`   ❌ Estado: NO EXISTE (${response.status})`);
            urlsAnalizadas.invalidas.push({ producto, url, error: response.status });
          }
        } catch (error) {
          console.log(`   💥 Estado: ERROR (${error.message})`);
          urlsAnalizadas.invalidas.push({ producto, url, error: error.message });
        }
        
      } else {
        urlsAnalizadas.invalidas.push({ producto, url, error: 'URL inválida' });
        console.log(`   ❌ Tipo: INVÁLIDA`);
      }
      
      console.log('');
    }
    
    // Resumen
    console.log('🎯 ANÁLISIS COMPLETO:');
    console.log('====================');
    console.log(`📊 Total productos con imágenes: ${productos.length}`);
    console.log(`🏠 URLs locales (Render): ${urlsAnalizadas.locales.length}`);
    console.log(`🌐 URLs externas: ${urlsAnalizadas.externas.length}`);
    console.log(`❌ URLs inválidas/no existentes: ${urlsAnalizadas.invalidas.length}`);
    
    if (urlsAnalizadas.invalidas.length > 0) {
      console.log('\n❌ PROBLEMAS ENCONTRADOS:');
      urlsAnalizadas.invalidas.forEach(({ producto, url, error }) => {
        console.log(`   • ${producto.nombre}: ${error}`);
      });
      
      console.log('\n🔍 DIAGNÓSTICO:');
      console.log('   • Las URLs están guardadas en la BD ✅');
      console.log('   • Pero los archivos físicos no existen ❌');
      console.log('   • Render/Vercel eliminan los archivos al reiniciar ❌');
      console.log('   • Las URLs en la BD quedan "huérfanas" ❌');
      
      console.log('\n🛠️ SOLUCIÓN:');
      console.log('   1. Reemplazar URLs locales con URLs externas persistentes');
      console.log('   2. Modificar upload para usar URLs externas');
      console.log('   3. Nunca más depender de archivos locales');
      
    } else {
      console.log('\n✅ Todas las imágenes existen y son accesibles');
    }
    
    return urlsAnalizadas;
    
  } catch (error) {
    console.error('❌ Error investigando URLs:', error);
  } finally {
    process.exit(0);
  }
}

investigarUrlsBD();
