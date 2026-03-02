const API_URL = 'https://agromae-b.onrender.com';

async function testDashboardAPI() {
    try {
        console.log('🔍 Probando API del dashboard...\n');
        
        const response = await fetch(`${API_URL}/api/dashboard/stats`);
        const data = await response.json();
        
        console.log('📊 Response completo de la API:');
        console.log(JSON.stringify(data, null, 2));
        
        console.log('\n📊 Estadísticas de ventas:');
        console.log('  - Total ventas:', data.ventas?.total_ventas);
        console.log('  - Ventas pagadas:', data.ventas?.ventas_pagadas);
        console.log('  - Ventas pendientes:', data.ventas?.ventas_pendientes);
        
        console.log('\n📊 Estadísticas de anuladas:');
        console.log('  - Total anuladas mes:', data.anuladas?.total_anuladas_mes);
        console.log('  - Anuladas hoy:', data.anuladas?.anuladas_hoy);
        console.log('  - Monto total anulado:', data.anuladas?.total_anulado_monto);
        
        console.log('\n✅ API test completado');
        
    } catch (error) {
        console.error('❌ Error probando API:', error);
    }
}

testDashboardAPI();
