console.log('🔍 DIAGNÓSTICO RÁPIDO - Imágenes 404\n');

// Verificar una imagen específica que falla
async function verificarImagen() {
  try {
    const url = 'https://agromae-b.onrender.com/uploads/productos/1772454410218-manteca-jpeg-3de1d82b.jpg';
    console.log(`⏳ Verificando: ${url}`);
    
    const response = await fetch(url, { method: 'HEAD' });
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Imagen existe');
    } else {
      console.log('❌ Imagen no existe (404)');
    }
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
  }
}

// Verificar directorio uploads
async function verificarUploads() {
  try {
    console.log('\n⏳ Verificando directorio uploads...');
    const response = await fetch('https://agromae-b.onrender.com/uploads/');
    console.log(`📊 Directorio: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
  }
}

verificarImagen();
verificarUploads();
