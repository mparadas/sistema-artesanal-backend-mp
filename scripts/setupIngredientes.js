const db = require('../config/database');

async function agregarCategoriaYCargarIngredientes() {
    try {
        console.log('🔧 Agregando columna categoria a la tabla ingredientes...');
        
        // Verificar si la columna categoria existe
        const checkColumn = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ingredientes' AND column_name = 'categoria'
        `);
        
        if (checkColumn.rows.length === 0) {
            // Agregar columna categoria
            await db.query(`ALTER TABLE ingredientes ADD COLUMN categoria VARCHAR(50) DEFAULT 'Otros'`);
            console.log('✅ Columna categoria agregada correctamente');
        } else {
            console.log('ℹ️  Columna categoria ya existe');
        }
        
        console.log('\n📦 Insertando ingredientes...');
        
        const ingredientes = [
            // Madejas Naturales
            { nombre: 'Madeja de Cerdo 50m (26-28 / 30-32 / 34-38mm)', costo: 15.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cerdo 60m (28-32 / 32-36mm)', costo: 18.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cerdo 70m (30-32 / 34-38mm)', costo: 21.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja Cerdo Tramo Corto (~60m Mixto)', costo: 10.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cordero Nacional 50m (No cal.)', costo: 15.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cordero Importada 100m (22-24mm)', costo: 35.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Res 20m (+38mm)', costo: 10.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            
            // Tripas de Colágeno
            { nombre: 'Tripa Colágeno Calibre 19 (75m)', costo: 24.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            { nombre: 'Tripa Colágeno Calibre 21 (75m)', costo: 25.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            { nombre: 'Tripa Colágeno Calibre 24 (75m)', costo: 26.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            { nombre: 'Tripa Colágeno Calibre 32 España (60m)', costo: 39.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            
            // Condimentos y Especias
            { nombre: 'Adobo', costo: 4.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Adobo', costo: 1.50, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Ajo en Polvo', costo: 12.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Ajo en Polvo', costo: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Cebolla en Polvo', costo: 12.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Cebolla en Polvo', costo: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Comino Molido', costo: 15.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Comino Molido', costo: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Paprika Dulce', costo: 12.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Paprika Dulce', costo: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Negra', costo: 24.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Negra', costo: 7.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Blanca', costo: 38.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Blanca', costo: 10.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Ají Habanero', costo: 90.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Ají Habanero', costo: 18.00, unidad: '200g', categoria: 'Condimento y Especia' },
            
            // Aditivos y Líquidos
            { nombre: 'Humo Líquido Tru Smoke', costo: 14.00, unidad: '1 Litro', categoria: 'Aditivo y Líquido' },
            { nombre: 'Humo Líquido Tru Smoke', costo: 4.00, unidad: '250ml', categoria: 'Aditivo y Líquido' },
            { nombre: 'Sal de Cura 10%', costo: 4.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Sal de Cura 10%', costo: 1.50, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Proteína Soya 90%', costo: 7.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Proteína Soya 90%', costo: 3.00, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Ácido Cítrico', costo: 6.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Ácido Cítrico', costo: 2.50, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Glutamato Monosódico', costo: 6.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Glutamato Monosódico', costo: 2.50, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Fosfato para Embutidos', costo: 8.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Fosfato para Embutidos', costo: 3.00, unidad: '250g', categoria: 'Aditivo y Líquido' }
        ];
        
        // Limpiar tabla de ingredientes primero
        await db.query('DELETE FROM ingredientes');
        await db.query('ALTER SEQUENCE ingredientes_id_seq RESTART WITH 1');
        
        // Insertar ingredientes
        for (const ingrediente of ingredientes) {
            await db.query(`
                INSERT INTO ingredientes (nombre, costo, unidad, categoria, stock, stock_minimo)
                VALUES ($1, $2, $3, $4, 100, 10)
            `, [ingrediente.nombre, ingrediente.costo, ingrediente.unidad, ingrediente.categoria]);
        }
        
        console.log(`✅ ${ingredientes.length} ingredientes insertados correctamente`);
        
        // Mostrar resumen por categoría
        const resumen = await db.query(`
            SELECT categoria, COUNT(*) as total, MIN(costo) as precio_min, MAX(costo) as precio_max
            FROM ingredientes 
            GROUP BY categoria 
            ORDER BY categoria
        `);
        
        console.log('\n📊 Resumen por categoría:');
        resumen.rows.forEach(cat => {
            console.log(`  ${cat.categoria}: ${cat.total} productos ($${cat.precio_min} - $${cat.precio_max})`);
        });
        
        // Mostrar primeros 10 ingredientes como ejemplo
        const muestra = await db.query(`
            SELECT nombre, costo, unidad, categoria, stock 
            FROM ingredientes 
            ORDER BY id 
            LIMIT 10
        `);
        
        console.log('\n📋 Muestra de ingredientes:');
        muestra.rows.forEach(ing => {
            console.log(`  ${ing.nombre} - $${ing.costo}/${ing.unidad} - ${ing.categoria}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

agregarCategoriaYCargarIngredientes();
