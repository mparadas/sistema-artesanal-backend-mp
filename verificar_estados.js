const db = require('./config/database');

async function verificarEstados() {
    try {
        console.log('🔍 Verificando estados disponibles...\n');
        
        const estados = await db.query('SELECT * FROM estados_venta ORDER BY codigo');
        
        console.log('📊 Estados disponibles en la base de datos:');
        estados.rows.forEach(estado => {
            console.log(`  - ${estado.codigo}: ${estado.nombre} (${estado.color})`);
        });
        
        // Verificar específicamente el estado anulada
        const estadoAnulada = estados.rows.find(e => e.codigo === 'anulada');
        
        if (estadoAnulada) {
            console.log('\n✅ Estado "anulada" encontrado:');
            console.log('  - ID:', estadoAnulada.id);
            console.log('  - Código:', estadoAnulada.codigo);
            console.log('  - Nombre:', estadoAnulada.nombre);
            console.log('  - Color:', estadoAnulada.color);
        } else {
            console.log('\n❌ Estado "anulada" no encontrado');
        }
        
        console.log('\n✅ Verificación completada');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error verificando estados:', error);
        process.exit(1);
    }
}

verificarEstados();
