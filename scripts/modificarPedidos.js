const db = require('../config/database');

async function modificarFlujoPedidos() {
    try {
        console.log('🔧 Modificando el flujo de pedidos...');
        
        // 1. Modificar tabla pedidos para eliminar campos de costo
        console.log('📝 Modificando tabla pedidos...');
        
        // Eliminar columnas de costo si existen
        const checkColumns = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'pedidos' AND column_name IN ('total_estimado', 'monto_pagado', 'saldo_pendiente')
        `);
        
        for (const col of checkColumns.rows) {
            try {
                await db.query(`ALTER TABLE pedidos DROP COLUMN ${col.column_name}`);
                console.log(`  ✅ Columna ${col.column_name} eliminada`);
            } catch (e) {
                console.log(`  ℹ️  Columna ${col.column_name} no existe o no se puede eliminar`);
            }
        }
        
        // Agregar nueva columna para estado de procesamiento
        try {
            await db.query(`ALTER TABLE pedidos ADD COLUMN estado_procesamiento VARCHAR(20) DEFAULT 'pendiente'`);
            console.log('  ✅ Columna estado_procesamiento agregada');
        } catch (e) {
            console.log('  ℹ️  Columna estado_procesamiento ya existe');
        }
        
        // 2. Modificar tabla pedido_items para eliminar precio_unitario
        console.log('\n📝 Modificando tabla pedido_items...');
        
        try {
            await db.query(`ALTER TABLE pedido_items DROP COLUMN precio_unitario`);
            console.log('  ✅ Columna precio_unitario eliminada de pedido_items');
        } catch (e) {
            console.log('  ℹ️  Columna precio_unitario no existe en pedido_items');
        }
        
        // 3. Limpiar datos existentes y actualizar estados
        console.log('\n🧹 Limpiando y actualizando datos...');
        
        // Actualizar todos los pedidos existentes
        await db.query(`
            UPDATE pedidos 
            SET estado_procesamiento = CASE 
                WHEN estado = 'facturado' THEN 'venta por procesar'
                ELSE 'pendiente'
            END
        `);
        
        console.log('  ✅ Estados de pedidos actualizados');
        
        // 4. Crear nuevo endpoint para procesar despacho
        console.log('\n🔧 Creando lógica de despacho...');
        
        // Verificar estructura final de las tablas
        const pedidosStructure = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'pedidos'
            ORDER BY ordinal_position
        `);
        
        const itemsStructure = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'pedido_items'
            ORDER BY ordinal_position
        `);
        
        console.log('\n📊 Estructura final - Tabla pedidos:');
        pedidosStructure.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default || ''}`);
        });
        
        console.log('\n📊 Estructura final - Tabla pedido_items:');
        itemsStructure.rows.forEach(col => {
            console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${col.column_default || ''}`);
        });
        
        // 5. Mostrar estado actual de pedidos
        const pedidosCount = await db.query(`
            SELECT estado_procesamiento, COUNT(*) as total
            FROM pedidos 
            GROUP BY estado_procesamiento
        `);
        
        console.log('\n📋 Estado actual de pedidos:');
        pedidosCount.rows.forEach(row => {
            console.log(`  ${row.estado_procesamiento}: ${row.total} pedidos`);
        });
        
        console.log('\n✅ Modificación completada!');
        console.log('📝 Próximos pasos:');
        console.log('  1. Modificar el frontend para eliminar campos de costo');
        console.log('  2. Crear endpoint POST /api/pedidos/:id/despachar');
        console.log('  3. Actualizar lógica de conversión a ventas');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en la modificación:', error.message);
        process.exit(1);
    }
}

modificarFlujoPedidos();
