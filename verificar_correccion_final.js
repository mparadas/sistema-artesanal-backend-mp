// Verificación final de la función obtenerIconoProducto corregida
console.log('🔍 Verificando función obtenerIconoProducto CORREGIDA...\n');

// Función corregida que ahora está implementada
const obtenerIconoProducto = (producto) => {
  const nombre = String(producto?.nombre || '').toLowerCase()
  const categoria = String(producto?.categoria || '').toLowerCase()
  const animal = String(producto?.animal_origen || '').toLowerCase()
  
  // Hamburguesa (PRIORIDAD MÁXIMA - antes que todo)
  if (nombre.includes('hamburguesa') || categoria.includes('hamburguesa')) {
    return '🍔'
  }
  
  // Pollo (después de hamburguesa)
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

// Productos específicos a verificar
const productosEspecificos = [
  { nombre: 'Hamburguesa Pollo Con Tocipanceta', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa De Pollo', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa Clasica', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa Chistorra', categoria: 'Hamburguesas' },
  { nombre: 'Carne de Res', categoria: 'Carnes' },
  { nombre: 'Chorizo Traditional', categoria: 'Embutidos' }
];

console.log('🍔 Resultados de iconos CORREGIDOS:\n');
productosEspecificos.forEach((p, index) => {
  const icono = obtenerIconoProducto(p);
  console.log(`${index + 1}. ${p.nombre}`);
  console.log(`   📂 Categoría: ${p.categoria}`);
  console.log(`   🍔 Icono: ${icono}`);
  console.log(`   ✅ ${icono === '🍔' ? '¡HAMBURGUESA CORREGIDA!' : 'Otro icono'}\n`);
});

console.log('🎯 Cambio clave realizado:');
console.log('   - Hamburguesa ahora tiene PRIORIDAD ALTA');
console.log('   - Se evalúa ANTES que "carne"');
console.log('   - Condición: (nombre.includes("carne") && !nombre.includes("hamburguesa"))');
console.log('\n✅ Verificación completada');
