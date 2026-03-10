const db = require('./config/database');

async function verificarDashboardQuery() {
    try {
        console.log('🔍 Verificando query de dashboard...\n');
        
        // Verificar ventas del mes (sin filtro)
        const ventasTotales = await db.query(`
            SELECT 
                COUNT(*) as total_ventas,
                COUNT(CASE WHEN estado_pago = 'anulada' THEN 1 END) as ventas_anuladas,
                COUNT(CASE WHEN estado_pago != 'anulada' THEN 1 END) as ventas_no_anuladas
            FROM ventas 
            WHERE DATE(fecha) >= CURRENT_DATE - INTERVAL '30 days'
        `);
        
        console.log('📊 Ventas del mes (total):');
        console.log('  - Total ventas:', ventasTotales.rows[0].total_ventas);
        console.log('  - Ventas anuladas:', ventasTotales.rows[0].ventas_anuladas);
        console.log('  - Ventas no anuladas:', ventasTotales.rows[0].ventas_no_anuladas);
        
        // Verificar query específico del dashboard
        const ventasDashboard = await db.query(`
            SELECT 
                COUNT(*) as total_ventas,
                COUNT(CASE WHEN estado_pago = 'pagado' THEN 1 END) as ventas_pagadas,
                COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as ventas_pendientes,
                COUNT(CASE WHEN estado_pago = 'anulada' THEN 1 END) as ventas_anuladas
            FROM ventas 
            WHERE DATE(fecha) >= CURRENT_DATE - INTERVAL '30 days'
            AND estado_pago != 'anulada'
        `);
        
        console.log('\n📊 Ventas del dashboard (con filtro):');
        console.log('  - Total ventas:', ventasDashboard.rows[0].total_ventas);
        console.log('  - Ventas pagadas:', ventasDashboard.rows[0].ventas_pagadas);
        console.log('  - Ventas pendientes:', ventasDashboard.rows[0].ventas_pendientes);
        console.log('  - Ventas anuladas (no deberían aparecer):', ventasDashboard.rows[0].ventas_anuladas);
        
        // Verificar query de anuladas
        const ventasAnuladas = await db.query(`
            SELECT 
                COUNT(*) as total_anuladas_mes,
                COUNT(CASE WHEN DATE(fecha) = CURRENT_DATE THEN 1 END) as anuladas_hoy
            FROM ventas 
            WHERE DATE(fecha) >= CURRENT_DATE - INTERVAL '30 days'
            AND estado_pago = 'anulada'
        `);
        
        console.log('\n📊 Ventas anuladas del mes:');
        console.log('  - Total anuladas mes:', ventasAnuladas.rows[0].total_anuladas_mes);
        console.log('  - Anuladas hoy:', ventasAnuladas.rows[0].anuladas_hoy);
        
        // Verificar ventas recientes para ver estados
        const ventasRecientes = await db.query(`
            SELECT id, estado_pago, total, fecha
            FROM ventas 
            WHERE DATE(fecha) >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY fecha DESC
            LIMIT 5
        `);
        
        console.log('\n📊 Ventas recientes (últimos 30 días):');
        ventasRecientes.rows.forEach(venta => {
            console.log(`  - Venta #${venta.id}: ${venta.estado_pago} - ${venta.total} - ${venta.fecha}`);
        });
        
        console.log('\n✅ Verificación completada');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error verificando dashboard:', error);
        process.exit(1);
    }
}

verificarDashboardQuery();
