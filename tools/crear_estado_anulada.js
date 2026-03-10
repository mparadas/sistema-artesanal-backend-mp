const db = require('./config/database');

async function crearEstadoAnulada() {
    try {
        console.log('🔍 Verificando si existe estado "anulada"...\n');
        
        // Verificar si ya existe
        const estadoExistente = await db.query('SELECT * FROM estados_venta WHERE codigo = $1', ['anulada']);
        
        if (estadoExistente.rows.length > 0) {
            console.log('✅ Estado "anulada" ya existe en la base de datos:');
            console.log('  - Código:', estadoExistente.rows[0].codigo);
            console.log('  - Nombre:', estadoExistente.rows[0].nombre);
            console.log('  - Color:', estadoExistente.rows[0].color);
            console.log('  - ID:', estadoExistente.rows[0].id);
            process.exit(0);
        }
        
        console.log('📝 Estado "anulada" no existe, creándolo...\n');
        
        // Insertar nuevo estado
        const nuevoEstado = await db.query(`
            INSERT INTO estados_venta (codigo, nombre, color, creado_en, actualizado_en)
            VALUES ('anulada', 'Anulada', 'red', NOW(), NOW())
            RETURNING id, codigo, nombre, color, creado_en, actualizado_en
        `);
        
        const estado = nuevoEstado.rows[0];
        console.log('✅ Estado "anulada" creado exitosamente:');
        console.log('  - ID:', estado.id);
        console.log('  - Código:', estado.codigo);
        console.log('  - Nombre:', estado.nombre);
        console.log('  - Color:', estado.color);
        console.log('  - Creado:', estado.creado_en);
        console.log('  - Actualizado:', estado.actualizado_en);
        
        // Verificar todos los estados actuales
        console.log('\n📊 Estados actuales en la tabla:');
        const todosEstados = await db.query('SELECT codigo, nombre, color FROM estados_venta ORDER BY codigo');
        
        todosEstados.rows.forEach(estado => {
            console.log(`  - ${estado.codigo}: ${estado.nombre} (${estado.color})`);
        });
        
        console.log('\n✅ Proceso completado exitosamente');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error creando estado "anulada":', error);
        
        // Si la tabla no existe, crearla
        if (error.message.includes('does not exist') || error.message.includes('no existe')) {
            console.log('\n🔍 La tabla estados_venta no existe, creándola...');
            
            try {
                await db.query(`
                    CREATE TABLE IF NOT EXISTS estados_venta (
                        id SERIAL PRIMARY KEY,
                        codigo VARCHAR(50) UNIQUE NOT NULL,
                        nombre VARCHAR(100) NOT NULL,
                        color VARCHAR(50) DEFAULT 'gray',
                        creado_en TIMESTAMP DEFAULT NOW(),
                        actualizado_en TIMESTAMP DEFAULT NOW()
                    )
                `);
                
                console.log('✅ Tabla estados_venta creada');
                
                // Insertar estados básicos
                const estadosBasicos = [
                    ['pagado', 'Pagado', 'green'],
                    ['parcial', 'Parcial', 'yellow'],
                    ['pendiente', 'Pendiente', 'red'],
                    ['liquidado', 'Liquidado', 'emerald'],
                    ['cancelado', 'Cancelado', 'gray'],
                    ['anulada', 'Anulada', 'red']
                ];
                
                for (const [codigo, nombre, color] of estadosBasicos) {
                    await db.query(`
                        INSERT INTO estados_venta (codigo, nombre, color)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (codigo) DO NOTHING
                    `, [codigo, nombre, color]);
                }
                
                console.log('✅ Estados básicos insertados incluyendo "anulada"');
                console.log('\n✅ Proceso completado exitosamente');
                
            } catch (createError) {
                console.error('❌ Error creando tabla:', createError);
            }
        }
        
        process.exit(1);
    }
}

crearEstadoAnulada();
