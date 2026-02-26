const db = require('../config/database');

async function insertarIngredientes() {
    try {
        console.log('📦 Insertando ingredientes en la base de datos...');
        
        const ingredientes = [
            // Madejas Naturales
            { nombre: 'Madeja de Cerdo 50m (26-28 / 30-32 / 34-38mm)', precio: 15.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cerdo 60m (28-32 / 32-36mm)', precio: 18.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cerdo 70m (30-32 / 34-38mm)', precio: 21.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja Cerdo Tramo Corto (~60m Mixto)', precio: 10.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cordero Nacional 50m (No cal.)', precio: 15.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Cordero Importada 100m (22-24mm)', precio: 35.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            { nombre: 'Madeja de Res 20m (+38mm)', precio: 10.00, unidad: 'Paquete', categoria: 'Madeja Natural' },
            
            // Tripas de Colágeno
            { nombre: 'Tripa Colágeno Calibre 19 (75m)', precio: 24.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            { nombre: 'Tripa Colágeno Calibre 21 (75m)', precio: 25.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            { nombre: 'Tripa Colágeno Calibre 24 (75m)', precio: 26.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            { nombre: 'Tripa Colágeno Calibre 32 España (60m)', precio: 39.00, unidad: 'Paquete', categoria: 'Tripa de Colágeno' },
            
            // Condimentos y Especias
            { nombre: 'Adobo', precio: 4.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Adobo', precio: 1.50, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Ajo en Polvo', precio: 12.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Ajo en Polvo', precio: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Cebolla en Polvo', precio: 12.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Cebolla en Polvo', precio: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Comino Molido', precio: 15.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Comino Molido', precio: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Paprika Dulce', precio: 12.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Paprika Dulce', precio: 4.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Negra', precio: 24.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Negra', precio: 7.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Blanca', precio: 38.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Pimienta Blanca', precio: 10.00, unidad: '250g', categoria: 'Condimento y Especia' },
            { nombre: 'Ají Habanero', precio: 90.00, unidad: '1kg', categoria: 'Condimento y Especia' },
            { nombre: 'Ají Habanero', precio: 18.00, unidad: '200g', categoria: 'Condimento y Especia' },
            
            // Aditivos y Líquidos
            { nombre: 'Humo Líquido Tru Smoke', precio: 14.00, unidad: '1 Litro', categoria: 'Aditivo y Líquido' },
            { nombre: 'Humo Líquido Tru Smoke', precio: 4.00, unidad: '250ml', categoria: 'Aditivo y Líquido' },
            { nombre: 'Sal de Cura 10%', precio: 4.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Sal de Cura 10%', precio: 1.50, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Proteína Soya 90%', precio: 7.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Proteína Soya 90%', precio: 3.00, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Ácido Cítrico', precio: 6.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Ácido Cítrico', precio: 2.50, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Glutamato Monosódico', precio: 6.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Glutamato Monosódico', precio: 2.50, unidad: '250g', categoria: 'Aditivo y Líquido' },
            { nombre: 'Fosfato para Embutidos', precio: 8.00, unidad: '1kg', categoria: 'Aditivo y Líquido' },
            { nombre: 'Fosfato para Embutidos', precio: 3.00, unidad: '250g', categoria: 'Aditivo y Líquido' }
        ];
        
        // Limpiar tabla de ingredientes primero
        await db.query('DELETE FROM ingredientes');
        await db.query('ALTER SEQUENCE ingredientes_id_seq RESTART WITH 1');
        
        // Insertar ingredientes
        for (const ingrediente of ingredientes) {
            await db.query(`
                INSERT INTO ingredientes (nombre, costo, unidad, categoria, stock, stock_minimo)
                VALUES ($1, $2, $3, $4, 100, 10)
            `, [ingrediente.nombre, ingrediente.precio, ingrediente.unidad, ingrediente.categoria]);
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
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al insertar ingredientes:', error.message);
        process.exit(1);
    }
}

insertarIngredientes();
