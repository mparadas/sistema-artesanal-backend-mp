// Diagnóstico del problema de imágenes 404
console.log('🔍 DIAGNÓSTICO - Problema de imágenes 404 en el frontend\n');

// URLs que están fallando según los logs
const imagenesFallando = [
  'https://agromae-b.onrender.com/uploads/productos/1772454410218-manteca-jpeg-3de1d82b.jpg',
  'https://agromae-b.onrender.com/uploads/productos/1772454211426-hpollotocineta-jpeg-beb4f6ff.jpg',
  'https://agromae-b.onrender.com/uploads/productos/1772457548052-queso-mozzarella-jpg-5c42670b.jpg',
  'https://agromae-b.onrender.com/uploads/productos/1772454397886-hpollo-jpeg-28e3cb68.jpg',
  'https://agromae-b.onrender.com/uploads/productos/1772454630561-quesoduro-jpeg-05a1f209.jpg',
  'https://agromae-b.onrender.com/uploads/productos/1772454378645-hchistorra-jpeg-03629263.jpg'
];

console.log('📡 URLs que están fallando (404):');
imagenesFallando.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});

console.log('\n🔍 Verificando si las imágenes existen en el backend...');

async function verificarImagenes() {
  const resultados = [];
  
  for (const url of imagenesFallando) {
    try {
      console.log(`⏳ Verificando: ${url}`);
      
      const response = await fetch(url, { method: 'HEAD' });
      
      console.log(`   📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`   ✅ Imagen existe`);
        resultados.push({ url, status: 'EXISTS', code: response.status });
      } else {
        console.log(`   ❌ Imagen no existe (${response.status})`);
        resultados.push({ url, status: 'MISSING', code: response.status });
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
      resultados.push({ url, status: 'ERROR', error: error.message });
    }
    console.log('');
  }
  
  return resultados;
}

// Verificar también el directorio de uploads
async function verificarDirectorioUploads() {
  console.log('🔍 Verificando directorio de uploads...');
  
  try {
    const response = await fetch('https://agromae-b.onrender.com/uploads/', { method: 'GET' });
    console.log(`📊 Directorio uploads: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const text = await response.text();
      console.log(`✅ Directorio responde (${text.length} caracteres)`);
      
      // Verificar si es un listado de directorio
      if (text.includes('Index of') || text.includes('Directory listing')) {
        console.log('📁 Listado de directorio disponible');
      } else {
        console.log('📄 Respuesta HTML normal');
      }
    } else {
      console.log(`❌ Directorio no accesible: ${response.status}`);
    }
  } catch (error) {
    console.log(`💥 Error verificando directorio: ${error.message}`);
  }
}

// Verificar endpoint de productos para ver las URLs en la BD
async function verificarUrlsEnBD() {
  console.log('\n🔍 Verificando URLs de imágenes en la base de datos...');
  
  try {
    const response = await fetch('https://agromae-b.onrender.com/api/productos');
    
    if (response.ok) {
      const productos = await response.json();
      console.log(`✅ ${productos.length} productos obtenidos`);
      
      const productosConImagen = productos.filter(p => p.imagen_url);
      console.log(`📷 ${productosConImagen.length} productos con imagen`);
      
      // Mostrar algunas URLs de ejemplo
      console.log('\n📋 Ejemplos de URLs en la BD:');
      productosConImagen.slice(0, 5).forEach((producto, index) => {
        console.log(`${index + 1}. ${producto.nombre}`);
        console.log(`   📷 ${producto.imagen_url}`);
      });
      
      // Verificar si las URLs coinciden con las que fallan
      const urlsEnBD = productosConImagen.map(p => p.imagen_url);
      const coincidencias = imagenesFallando.filter(url => urlsEnBD.includes(url));
      
      console.log(`\n🎯 Coincidencias con URLs fallando: ${coincidencias.length}`);
      
      if (coincidencias.length > 0) {
        console.log('⚠️  Las URLs que fallan están en la BD pero no existen físicamente');
      }
      
    } else {
      console.log(`❌ Error obteniendo productos: ${response.status}`);
    }
  } catch (error) {
    console.log(`💥 Error verificando productos: ${error.message}`);
  }
}

// Diagnóstico completo
async function main() {
  console.log('🚀 Iniciando diagnóstico de imágenes 404...\n');
  
  await verificarImagenes();
  await verificarDirectorioUploads();
  await verificarUrlsEnBD();
  
  console.log('\n🎯 DIAGNÓSTICO FINAL:');
  console.log('====================');
  console.log('Si las imágenes dan 404 pero están en la BD:');
  console.log('1. Las imágenes fueron eliminadas del servidor');
  console.log('2. Las URLs en la BD son incorrectas');
  console.log('3. El directorio uploads no está configurado correctamente');
  console.log('4. Hay un problema con el servidor de archivos estáticos');
  
  console.log('\n🛠️ SOLUCIONES:');
  console.log('1. Verificar que el directorio uploads exista en el servidor');
  console.log('2. Revisar configuración de archivos estáticos en server.js');
  console.log('3. Actualizar URLs en la BD o re-subir las imágenes');
  console.log('4. Usar placeholders para imágenes faltantes');
}

main();
