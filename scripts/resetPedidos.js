const db = require('../config/database');

async function resetPedidos() {
    try {
        console.log('🗄️  Reiniciando tabla de pedidos...');
        
        // Eliminar dependencias en orden correcto
        await db.query('DELETE FROM pedido_pagos');
        await db.query('DELETE FROM pedido_items');
        await db.query('DELETE FROM pedidos');
        
        // Reiniciar secuencia
        await db.query('ALTER SEQUENCE pedidos_id_seq RESTART WITH 1');
        
        // Insertar pedidos de ejemplo
        await db.query(`
            INSERT INTO pedidos (cliente_id, cliente_nombre, total_estimado, notas, fecha_entrega, estado, monto_pagado, saldo_pendiente) VALUES
            (2,'Alonso',22.50,'', '2026-02-20','facturado',22.50,0),
            (2,'Alonso',88.75,'333','2026-02-21','facturado',88.75,0),
            (2,'Alonso',74.40,'','2026-02-20','facturado',66.00,8.40),
            (NULL,'',112.50,'','2026-02-20','pendiente',0,112.50),
            (2,'Alonso',26.00,'Casa 30','2026-02-19','facturado',26.00,0),
            (1,'miguelangel Paradas',51.00,'Entregar en su casa','2026-02-20','pendiente',0,51.00)
        `);
        
        // Insertar items para pedidos
        await db.query(`
            INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado, precio_unitario) VALUES
            (1,4,1,0,1.25,18.00),
            (2,1,1,2.5,0,15.50),(2,5,1,2,0,25.00),
            (3,1,2,1.2,0,15.50),(3,1,2,1.2,0,15.50),(3,1,2,1.2,0,15.50),
            (4,4,1.25,0,0,18.00),(4,4,1.25,0,0,18.00),(4,1,2,0,0,15.50),(4,5,1,0,0,25.00),(4,3,1,0,0,12.00),
            (5,2,1,0,0,8.00),(5,1,1,0,0,18.00),
            (6,1,1,0,0,8.00),(6,2,1,0,0,18.00),(6,5,1,0,0,25.00)
        `);
        
        // Insertar algunos pagos de ejemplo
        await db.query(`
            INSERT INTO pedido_pagos (pedido_id, monto, metodo_pago, referencia_pago, fecha) VALUES
            (3,15.50,'efectivo',NULL,'2026-02-19T20:00:00'),
            (3,1.00,'efectivo','prueba3','2026-02-19T20:10:00'),
            (3,1.00,'efectivo','prueba2','2026-02-19T20:12:00'),
            (3,2.50,'efectivo','anticipo','2026-02-19T20:20:00'),
            (3,2.50,'efectivo',NULL,'2026-02-19T20:24:00')
        `);
        
        console.log('✅ Pedidos reinicializados correctamente');
        console.log('📋 Pedidos agregados:');
        
        const result = await db.query(`
            SELECT p.id, p.cliente_nombre, p.total_estimado, p.estado, p.monto_pagado, p.saldo_pendiente,
                   COUNT(pi.id) as items_count
            FROM pedidos p 
            LEFT JOIN pedido_items pi ON p.id = pi.pedido_id 
            GROUP BY p.id, p.cliente_nombre, p.total_estimado, p.estado, p.monto_pagado, p.saldo_pendiente
            ORDER BY p.id
        `);
        
        result.rows.forEach(p => {
            console.log(`  ${p.id}. ${p.cliente_nombre || 'Sin cliente'} - $${p.total_estimado} (${p.estado}) - ${p.items_count} items`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al reiniciar pedidos:', error.message);
        process.exit(1);
    }
}

resetPedidos();
