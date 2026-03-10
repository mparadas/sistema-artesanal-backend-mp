console.log('🔍 Verificando estado actual del frontend...\n');

// Simular exactamente la función que está en Catalogo.jsx
const obtenerIconoProducto = (producto) => {
  const nombre = String(producto?.nombre || '').toLowerCase()
  const categoria = String(producto?.categoria || '').toLowerCase()
  const animal = String(producto?.animal_origen || '').toLowerCase()
  
  // Hamburguesa (PRIORIDAD MÁXIMA - antes que todo)
  if (nombre.includes('hamburguesa') || categoria.includes('hamburguesa')) {
    return '🍔'
  }
  
  // Pollo
  if (nombre.includes('pollo') || nombre.includes('chicken') || animal.includes('pollo')) {
    return '🐔'
  }
  
  // Cerdo/cochino
  if (nombre.includes('cerdo') || nombre.includes('cochino') || nombre.includes('puerco') || 
      nombre.includes('chancho') || nombre.includes('pork') || animal.includes('cerdo')) {
    return '🐷'
  }
  
  // Cordero/oveja
  if (nombre.includes('cordero') || nombre.includes('oveja') || nombre.includes('lamb') || 
      animal.includes('cordero') || animal.includes('oveja')) {
    return '🐑'
  }
  
  // Queso
  if (nombre.includes('queso') || nombre.includes('cheese') || categoria.includes('queso')) {
    return '🧀'
  }
  
  // Chorizo
  if (nombre.includes('chorizo') || categoria.includes('chorizo')) {
    return '🥩'
  }
  
  // Jamón
  if (nombre.includes('jamón') || nombre.includes('jamon') || nombre.includes('ham')) {
    return '🥓'
  }
  
  // Res/vaca/carne de res (excluyendo hamburguesa)
  if (nombre.includes('res') || nombre.includes('vaca') || 
      (nombre.includes('carne') && !nombre.includes('hamburguesa')) || 
      nombre.includes('beef') || animal.includes('res')) {
    return '🐄'
  }
  
  return '📦'
}

// Productos de la imagen
const productosDeImagen = [
  { nombre: 'Hamburguesa Clasica', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa De Pollo', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa Chistorra', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa Pollo Con Tocipanceta', categoria: 'Hamburguesas' }
];

console.log('🍔 Verificación de productos de la imagen:');
productosDeImagen.forEach((p, index) => {
  const icono = obtenerIconoProducto(p);
  console.log(`${index + 1}. ${p.nombre}`);
  console.log(`   📂 Categoría: ${p.categoria}`);
  console.log(`   🔍 Análisis:`);
  console.log(`      - ¿Nombre contiene "hamburguesa"? ${p.nombre.toLowerCase().includes('hamburguesa')}`);
  console.log(`      - ¿Categoría contiene "hamburguesa"? ${p.categoria.toLowerCase().includes('hamburguesa')}`);
  console.log(`   🍔 Icono resultante: ${icono}`);
  console.log(`   ✅ ${icono === '🍔' ? 'CORRECTO' : 'INCORRECTO'}\n`);
});

console.log('🎯 Si los iconos son correctos aquí pero no en la web:');
console.log('   1. Recarga la página (Ctrl+F5 o Cmd+Shift+R)');
console.log('   2. Limpia el caché del navegador');
console.log('   3. Verifica que no haya errores en la consola');
console.log('   4. El frontend puede necesitar reiniciar el servidor de desarrollo');

console.log('\n✅ Verificación completada');
