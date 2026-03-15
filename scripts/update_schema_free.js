require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/database');

async function updateSchema() {
    try {
        console.log('Adding descuento_porcentaje to ventas table...');
        await db.query(`
            ALTER TABLE ventas 
            ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) DEFAULT 0;
        `);
        console.log('Column added or already exists.');

        console.log('Adding "free" state to estados_venta...');
        const tableExists = await db.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' OR table_schema = 'sistema_artesanal'
            AND table_name = 'estados_venta'
        `);
        
        if (Number(tableExists.rows[0].count) > 0) {
            await db.query(`
                INSERT INTO estados_venta (codigo, nombre, descripcion, color, icono, orden) 
                VALUES ('free', '100% Descuento', 'Venta exonerada (100% descuento)', 'purple', 'gift', 6)
                ON CONFLICT (codigo) DO UPDATE 
                SET nombre = EXCLUDED.nombre, 
                    descripcion = EXCLUDED.descripcion, 
                    color = EXCLUDED.color, 
                    icono = EXCLUDED.icono;
            `);
            console.log('State "free" added successfully to estados_venta.');
        } else {
            console.log('estados_venta does not exist yet.');
        }

        console.log('Schema update complete.');
    } catch (e) {
        console.error('Error updating schema:', e);
    } finally {
        process.exit();
    }
}

updateSchema();
