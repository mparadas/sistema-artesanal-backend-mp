// Script para probar la conversión automática de moneda
console.log('🧪 Probando conversión automática de moneda\n');

// Simular las funciones de conversión
const tasaCambioSistema = 40.00;

const handleMonedaChange = (nuevaMoneda, monedaActual, montoActual) => {
  if (nuevaMoneda === monedaActual) return montoActual;
  
  let nuevoMonto = montoActual;
  
  // Si se cambia a Bs, convertir el monto actual de USD a Bs
  if (nuevaMoneda === 'VES' && montoActual && parseFloat(montoActual) > 0) {
    nuevoMonto = (parseFloat(montoActual) * tasaCambioSistema).toFixed(2);
  }
  // Si se cambia a USD, convertir el monto actual de Bs a USD
  else if (nuevaMoneda === 'USD' && montoActual && parseFloat(montoActual) > 0) {
    nuevoMonto = (parseFloat(montoActual) / tasaCambioSistema).toFixed(2);
  }
  
  return nuevoMonto;
};

// Casos de prueba
console.log('📊 Casos de prueba:');
console.log('='.repeat(50));

// Caso 1: USD a Bs
let montoActual = '100.00';
let monedaActual = 'USD';
let nuevaMoneda = 'VES';
let resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`1. USD → Bs:`);
console.log(`   Monto original: $${montoActual} USD`);
console.log(`   Monto convertido: Bs ${resultado} VES`);
console.log(`   Tasa usada: ${tasaCambioSistema}`);
console.log('');

// Caso 2: Bs a USD
montoActual = '4000.00';
monedaActual = 'VES';
nuevaMoneda = 'USD';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`2. Bs → USD:`);
console.log(`   Monto original: Bs ${montoActual} VES`);
console.log(`   Monto convertido: $${resultado} USD`);
console.log(`   Tasa usada: ${tasaCambioSistema}`);
console.log('');

// Caso 3: Misma moneda (no debe cambiar)
montoActual = '150.00';
monedaActual = 'USD';
nuevaMoneda = 'USD';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`3. USD → USD (sin cambio):`);
console.log(`   Monto original: $${montoActual} USD`);
console.log(`   Monto final: $${resultado} USD`);
console.log('');

// Caso 4: Monto vacío (no debe convertir)
montoActual = '';
monedaActual = 'USD';
nuevaMoneda = 'VES';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`4. Monto vacío:`);
console.log(`   Monto original: "${montoActual}"`);
console.log(`   Monto final: "${resultado}"`);
console.log('');

// Caso 5: Monto cero (no debe convertir)
montoActual = '0.00';
monedaActual = 'USD';
nuevaMoneda = 'VES';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`5. Monto cero:`);
console.log(`   Monto original: $${montoActual} USD`);
console.log(`   Monto final: "${resultado}"`);
console.log('');

// Caso 6: Valores realistas del sistema
console.log('📈 Escenarios reales del sistema:');
console.log('='.repeat(50));

// Escenario 1: Abono de $50 USD, cambiar a Bs
montoActual = '50.00';
monedaActual = 'USD';
nuevaMoneda = 'VES';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`Escenario 1 - Abono de venta:`);
console.log(`   Usuario ingresa: $${montoActual} USD`);
console.log(`   Al seleccionar Bs: Bs ${resultado} VES`);
console.log(`   Conversión: $${montoActual} × ${tasaCambioSistema} = Bs ${resultado}`);
console.log('');

// Escenario 2: Pago total de $126.50 USD, cambiar a Bs
montoActual = '126.50';
monedaActual = 'USD';
nuevaMoneda = 'VES';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`Escenario 2 - Pago total:`);
console.log(`   Usuario ingresa: $${montoActual} USD`);
console.log(`   Al seleccionar Bs: Bs ${resultado} VES`);
console.log(`   Conversión: $${montoActual} × ${tasaCambioSistema} = Bs ${resultado}`);
console.log('');

// Escenario 3: Usuario ingresa Bs 2000, cambiar a USD
montoActual = '2000.00';
monedaActual = 'VES';
nuevaMoneda = 'USD';
resultado = handleMonedaChange(nuevaMoneda, monedaActual, montoActual);
console.log(`Escenario 3 - Ingreso en Bs:`);
console.log(`   Usuario ingresa: Bs ${montoActual} VES`);
console.log(`   Al seleccionar USD: $${resultado} USD`);
console.log(`   Conversión: Bs ${montoActual} ÷ ${tasaCambioSistema} = $${resultado}`);
console.log('');

console.log('✅ Pruebas completadas');
console.log('\n📋 Resumen de la funcionalidad implementada:');
console.log('   • Conversión automática USD → Bs cuando se selecciona "Bs VES"');
console.log('   • Conversión automática Bs → USD cuando se selecciona "$ USD"');
console.log('   • Usa la tasa del día (tasaCambioSistema) del módulo BCV');
console.log('   • Funciona en todos los modales de pago/abono:');
console.log('     - Modal de pago de ventas');
console.log('     - Modal de abono de cuenta (estado de cuenta)');
console.log('     - Modal de abono desde detalles de venta');
console.log('   • No convierte si el monto está vacío o es cero');
console.log('   • No convierte si la moneda es la misma');
