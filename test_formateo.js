// Script para probar el formateo de montos
const ventas = [
  { id: 1, tipo_venta: 'credito', moneda_original: 'USD', total: 40.00, saldo_pendiente: 40.00 },
  { id: 2, tipo_venta: 'credito', moneda_original: 'USD', total: 81.00, saldo_pendiente: 0.00 },
  { id: 3, tipo_venta: 'credito', moneda_original: 'USD', total: 126.00, saldo_pendiente: 126.00 },
  { id: 9, tipo_venta: 'credito', moneda_original: 'USD', total: 150.00, saldo_pendiente: 6000.00 },
  { id: 10, tipo_venta: 'credito', moneda_original: 'USD', total: 200.00, saldo_pendiente: 6000.00 }
];

// Función formatearMonto (similar a la del frontend)
const formatearMonto = (monto, monedaOriginal = 'USD') => {
  let valor = 0;
  
  if (typeof monto === 'number') {
    valor = monto;
  } else if (typeof monto === 'string') {
    valor = parseFloat(monto.replace(/[^0-9.-]+/g, '')) || 0;
  } else if (monto && typeof monto === 'object') {
    valor = parseFloat(monto.toString()) || 0;
  }
  
  if (isNaN(valor)) {
    valor = 0;
  }
  
  if (monedaOriginal === 'VES') {
    return `Bs ${valor.toFixed(2)}`;
  }
  
  return `$ ${valor.toFixed(2)}`;
};

// Función toNumber
const toNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace(/[^0-9.-]+/g, '')) || 0;
  return parseFloat(val.toString()) || 0;
};

console.log('🧪 Probando formateo de montos:');
console.log('');

ventas.forEach(v => {
  console.log(`📋 Venta ID ${v.id}:`);
  console.log(`   Tipo: ${v.tipo_venta}`);
  console.log(`   Moneda Original: ${v.moneda_original}`);
  console.log(`   Total: ${formatearMonto(v.total, v.moneda_original)}`);
  console.log(`   Saldo Pendiente: ${v.saldo_pendiente}`);
  
  // Lógica corregida
  const saldoFormateado = v.moneda_original === 'USD' && v.saldo_pendiente > 1000 ? 
    `Bs ${toNumber(v.saldo_pendiente).toFixed(2)}` : 
    formatearMonto(v.saldo_pendiente, v.moneda_original);
  
  console.log(`   Saldo Formateado (CORREGIDO): ${saldoFormateado}`);
  console.log(`   Saldo Formateado (ANTES): ${formatearMonto(v.saldo_pendiente, v.moneda_original)}`);
  console.log('');
});
