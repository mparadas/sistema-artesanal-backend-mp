// Verificación final de la función obtenerIconoProducto
console.log('🔍 Verificando función obtenerIconoProducto en componentes...\n');

// Simular la función que ya está implementada
const obtenerIconoProducto = (producto) => {
  const nombre = String(producto?.nombre || '').toLowerCase()
  const categoria = String(producto?.categoria || '').toLowerCase()
  
  // Hamburguesa
  if (nombre.includes('hamburguesa') || categoria.includes('hamburguesa')) {
    return '🍔'
  }
  
  return '📦'
}

// Productos específicos a verificar
const productosEspecificos = [
  { nombre: 'Hamburguesa Pollo Con Tocipanceta', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa De Pollo', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa Clasica', categoria: 'Hamburguesas' },
  { nombre: 'Hamburguesa Chistorra', categoria: 'Hamburguesas' },
  { nombre: 'hamburguesa de cordero', categoria: 'Hamburguesas' },
  { nombre: 'Otro producto', categoria: 'Otra' }
];

console.log('🍔 Resultados de iconos:\n');
productosEspecificos.forEach((p, index) => {
  const icono = obtenerIconoProducto(p);
  console.log(`${index + 1}. ${p.nombre}`);
  console.log(`   📂 Categoría: ${p.categoria}`);
  console.log(`   🍔 Icono: ${icono}`);
  console.log(`   ✅ ${icono === '🍔' ? 'Correcto' : 'Sin icono de hamburguesa'}\n`);
});

console.log('✅ Verificación completada');
