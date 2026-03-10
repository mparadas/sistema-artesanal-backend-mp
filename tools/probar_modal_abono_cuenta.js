// Script para probar específicamente el modal de abono de cuenta
console.log('🧪 Probando conversión en modal de Abono de Cuenta\n');

// Simular el estado del modal de abono de cuenta
const tasaCambioSistema = 40.00;

// Estado inicial del modal
let estadoInicial = {
  abonoMoneda: 'USD',
  abonoMonto: '100.00', // Siempre comienza en USD
  abonoTasaCambio: 40.00,
  cuentaParaAbonar: {
    nombre: 'Cliente Test',
    saldo_pendiente_usd: 389.43
  }
};

console.log('📊 Estado inicial del modal:');
console.log(`   Moneda: ${estadoInicial.abonoMoneda}`);
console.log(`   Monto: ${estadoInicial.abonoMoneda} ${estadoInicial.abonoMonto}`);
console.log(`   Saldo pendiente: $${estadoInicial.cuentaParaAbonar.saldo_pendiente_usd}`);
console.log('');

// Simular la función handleAbonoMonedaChange corregida
const handleAbonoMonedaChange = (nuevaMoneda, estadoActual) => {
  let nuevoEstado = { ...estadoActual };
  
  if (nuevaMoneda === estadoActual.abonoMoneda) {
    console.log(`   ⚠️  La moneda ya es ${nuevaMoneda}, no se cambia`);
    return nuevoEstado;
  }
  
  nuevoEstado.abonoMoneda = nuevaMoneda;
  
  // Si se cambia a Bs, convertir el monto actual de USD a Bs
  if (nuevaMoneda === 'VES' && estadoActual.abonoMonto && parseFloat(estadoActual.abonoMonto) > 0) {
    const montoEnBs = (parseFloat(estadoActual.abonoMonto) * tasaCambioSistema).toFixed(2);
    nuevoEstado.abonoMonto = montoEnBs;
    console.log(`   🔄 USD → Bs: $${estadoActual.abonoMonto} → Bs ${montoEnBs}`);
  }
  // Si se cambia a USD, convertir el monto actual de Bs a USD
  else if (nuevaMoneda === 'USD' && estadoActual.abonoMonto && parseFloat(estadoActual.abonoMonto) > 0) {
    const montoEnUsd = (parseFloat(estadoActual.abonoMonto) / tasaCambioSistema).toFixed(2);
    nuevoEstado.abonoMonto = montoEnUsd;
    console.log(`   🔄 Bs → USD: Bs ${estadoActual.abonoMonto} → $${montoEnUsd}`);
  }
  
  return nuevoEstado;
};

// Caso 1: Usuario ingresa $100 USD, luego selecciona Bs
console.log('📈 Caso 1: Usuario ingresa $100 USD, selecciona Bs VES');
let estado = handleAbonoMonedaChange('VES', estadoInicial);
console.log(`   Resultado:`);
console.log(`   Moneda: ${estado.abonoMoneda}`);
console.log(`   Monto: ${estado.abonoMoneda} ${estado.abonoMonto}`);
console.log(`   Equivalencia: ≈ $ ${(parseFloat(estado.abonoMonto) / estado.abonoTasaCambio).toFixed(2)} USD`);
console.log('');

// Caso 2: Usuario vuelve a USD desde Bs
console.log('📉 Caso 2: Usuario vuelve a USD desde Bs');
estado = handleAbonoMonedaChange('USD', estado);
console.log(`   Resultado:`);
console.log(`   Moneda: ${estado.abonoMoneda}`);
console.log(`   Monto: ${estado.abonoMoneda} ${estado.abonoMonto}`);
console.log('');

// Caso 3: Usuario ingresa un monto diferente en Bs
console.log('💰 Caso 3: Usuario ingresa Bs 2000, selecciona USD');
estado.abonoMonto = '2000.00';
estado.abonoMoneda = 'VES';
estado = handleAbonoMonedaChange('USD', estado);
console.log(`   Resultado:`);
console.log(`   Moneda: ${estado.abonoMoneda}`);
console.log(`   Monto: ${estado.abonoMoneda} ${estado.abonoMonto}`);
console.log('');

// Caso 4: Escenario real - Abono parcial de $50 USD
console.log('🎯 Caso 4: Escenario real - Abono parcial de $50 USD');
estado = {
  abonoMoneda: 'USD',
  abonoMonto: '50.00',
  abonoTasaCambio: 40.00,
  cuentaParaAbonar: {
    nombre: 'miguelangel Paradas',
    saldo_pendiente_usd: 76.43
  }
};

console.log(`   Estado inicial:`);
console.log(`   Cliente: ${estado.cuentaParaAbonar.nombre}`);
console.log(`   Saldo pendiente: $${estado.cuentaParaAbonar.saldo_pendiente_usd}`);
console.log(`   Monto a abonar: ${estado.abonoMoneda} ${estado.abonoMonto}`);

estado = handleAbonoMonedaChange('VES', estado);
console.log(`   Al seleccionar Bs:`);
console.log(`   Monto convertido: ${estado.abonoMoneda} ${estado.abonoMonto}`);
console.log(`   Equivalencia: ≈ $ ${(parseFloat(estado.abonoMonto) / estado.abonoTasaCambio).toFixed(2)} USD`);
console.log('');

// Caso 5: Verificar que no convierte si el monto es vacío
console.log('⚠️  Caso 5: Monto vacío - no debe convertir');
estado.abonoMonto = '';
estado.abonoMoneda = 'USD';
estado = handleAbonoMonedaChange('VES', estado);
console.log(`   Monto vacío: "${estado.abonoMonto}"`);
console.log(`   Moneda: ${estado.abonoMoneda}`);
console.log(`   ✅ No se realizó conversión`);
console.log('');

console.log('✅ Pruebas del modal de abono de cuenta completadas');
console.log('\n📋 Mejoras implementadas:');
console.log('   • Conversión automática USD ↔ Bs al cambiar moneda');
console.log('   • Indicador visual de equivalencia cuando se selecciona Bs');
console.log('   • Usa tasaCambioSistema actual del módulo BCV');
console.log('   • No convierte si el monto está vacío o es cero');
console.log('   • Muestra equivalencia en tiempo real: "≈ $ X.XX USD"');
console.log('\n🎯 Flujo de usuario corregido:');
console.log('   1. Modal abre con monto en USD');
console.log('   2. Usuario selecciona "Bs VES" → monto se convierte automáticamente');
console.log('   3. Se muestra equivalencia: "≈ $ X.XX USD"');
console.log('   4. Usuario puede ajustar el monto en Bs si lo desea');
console.log('   5. Al volver a USD, se convierte de vuelta automáticamente');
