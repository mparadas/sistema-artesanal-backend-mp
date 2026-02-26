const db = require('../config/database');

async function agregarVentasCredito() {
  try {
    console.log('🔍 Agregando ventas de crédito de prueba...');
    
    // Actualizar algunas ventas existentes a crédito
    const ventasParaActualizar = [1, 2, 3]; // IDs de ventas existentes
    
    for (const id of ventasParaActualizar) {
      await db.query(
        'UPDATE ventas SET tipo_venta = $1 WHERE id = $2',
        ['credito', id]
      );
      console.log('✅ Venta', id, 'actualizada a crédito');
    }
    
    // Insertar nuevas ventas de crédito
    const ventasNuevas = [
      {
        cliente_id: 1,
        cliente_nombre: 'Cliente Crédito 1',
        total: 150.00,
        total_ves: 6000.00,
        moneda_original: 'USD',
        tasa_cambio_usada: 40.00,
        tipo_venta: 'credito',
        metodo_pago: 'transferencia',
        estado_pago: 'pendiente',
        monto_pagado: 0,
        saldo_pendiente: 6000.00,
        fecha: new Date().toISOString()
      },
      {
        cliente_id: 2,
        cliente_nombre: 'Cliente Crédito 2',
        total: 200.00,
        total_ves: 8000.00,
        moneda_original: 'USD',
        tasa_cambio_usada: 40.00,
        tipo_venta: 'credito',
        metodo_pago: 'pago_movil',
        estado_pago: 'parcial',
        monto_pagado: 2000.00,
        saldo_pendiente: 6000.00,
        fecha: new Date().toISOString()
      }
    ];
    
    for (const venta of ventasNuevas) {
      await db.query(`
        INSERT INTO ventas (cliente_id, cliente_nombre, total, total_ves, moneda_original, tasa_cambio_usada, tipo_venta, metodo_pago, estado_pago, monto_pagado, saldo_pendiente, fecha)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        venta.cliente_id,
        venta.cliente_nombre,
        venta.total,
        venta.total_ves,
        venta.moneda_original,
        venta.tasa_cambio_usada,
        venta.tipo_venta,
        venta.metodo_pago,
        venta.estado_pago,
        venta.monto_pagado,
        venta.saldo_pendiente,
        venta.fecha
      ]);
      console.log('✅ Venta de crédito creada:', venta.cliente_nombre);
    }
    
    console.log('🎉 Ventas de crédito agregadas correctamente');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error al agregar ventas de crédito:', error.message);
    process.exit(1);
  }
}

agregarVentasCredito();
