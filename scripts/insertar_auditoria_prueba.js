const db = require('../config/database');

async function insertarRegistrosPrueba() {
  try {
    console.log('🔍 Insertando registros de prueba en auditoría...');

    // Registro 1: INSERT de producto
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_nuevos, fecha)
      VALUES ('productos', 1, 'INSERT', 'admin', 
        '{"id":1,"nombre":"Pollo Entero","categoria":"Carnes","precio":25.50,"stock":100}', 
        NOW())
    `);
    console.log('✅ Registro 1: INSERT productos creado');

    // Registro 2: UPDATE de producto
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_anteriores, detalles_nuevos, fecha)
      VALUES ('productos', 1, 'UPDATE', 'admin',
        '{"id":1,"nombre":"Pollo Entero","categoria":"Carnes","precio":25.50,"stock":100}',
        '{"id":1,"nombre":"Pollo Entero","categoria":"Carnes","precio":26.00,"stock":101}',
        NOW() - INTERVAL '1 hour')
    `);
    console.log('✅ Registro 2: UPDATE productos creado');

    // Registro 3: INSERT de ingrediente
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_nuevos, fecha)
      VALUES ('ingredientes', 1, 'INSERT', 'mparadas',
        '{"id":1,"nombre":"Adobo","categoria":"Especias","stock":10,"unidad":"gr"}',
        NOW() - INTERVAL '2 hours')
    `);
    console.log('✅ Registro 3: INSERT ingredientes creado');

    // Registro 4: INSERT de cliente
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_nuevos, fecha)
      VALUES ('clientes', 1, 'INSERT', 'admin',
        '{"id":1,"nombre":"Juan Pérez","telefono":"123-456-7890","email":"juan@email.com"}',
        NOW() - INTERVAL '3 hours')
    `);
    console.log('✅ Registro 4: INSERT clientes creado');

    // Registro 5: INSERT de venta
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_nuevos, fecha)
      VALUES ('ventas', 1, 'INSERT', 'vendedor',
        '{"id":1,"cliente_id":1,"total":150.00,"estado":"completada"}',
        NOW() - INTERVAL '4 hours')
    `);
    console.log('✅ Registro 5: INSERT ventas creado');

    // Registro 6: DELETE de producto
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_anteriores, fecha)
      VALUES ('productos', 2, 'DELETE', 'admin',
        '{"id":2,"nombre":"Chorizo Tradicional","categoria":"Chorizos","precio":15.50,"stock":25}',
        NOW() - INTERVAL '5 hours')
    `);
    console.log('✅ Registro 6: DELETE productos creado');

    // Registro 7: UPDATE de ingrediente
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_anteriores, detalles_nuevos, fecha)
      VALUES ('ingredientes', 1, 'UPDATE', 'produccion',
        '{"id":1,"nombre":"Adobo","categoria":"Especias","stock":10,"unidad":"gr"}',
        '{"id":1,"nombre":"Adobo","categoria":"Especias","stock":8.5,"unidad":"gr"}',
        NOW() - INTERVAL '6 hours')
    `);
    console.log('✅ Registro 7: UPDATE ingredientes creado');

    // Registro 8: INSERT de pedido
    await db.query(`
      INSERT INTO auditoria (tabla, registro_id, tipo_movimiento, usuario, detalles_nuevos, fecha)
      VALUES ('pedidos', 1, 'INSERT', 'vendedor',
        '{"id":1,"cliente_id":1,"estado":"pendiente","total":75.00}',
        NOW() - INTERVAL '7 hours')
    `);
    console.log('✅ Registro 8: INSERT pedidos creado');

    console.log('🎉 Todos los registros de prueba insertados exitosamente');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error al insertar registros:', error.message);
    process.exit(1);
  }
}

insertarRegistrosPrueba();
