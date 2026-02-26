-- =====================================================
-- BACKUP AUTOMÁTICO ANTES DE REINICIAR
-- =====================================================
-- Este script crea un backup de seguridad antes de limpiar

-- Crear tablas de backup si no existen
CREATE TABLE IF NOT EXISTS ventas_backup AS SELECT * FROM ventas WHERE 1=0;
CREATE TABLE IF NOT EXISTS productos_backup AS SELECT * FROM productos WHERE 1=0;
CREATE TABLE IF NOT EXISTS clientes_backup AS SELECT * FROM clientes WHERE 1=0;
CREATE TABLE IF NOT EXISTS pagos_backup AS SELECT * FROM pagos WHERE 1=0;
CREATE TABLE IF NOT EXISTS tasas_cambio_backup AS SELECT * FROM tasas_cambio WHERE 1=0;

-- Limpiar tablas de backup
TRUNCATE TABLE ventas_backup, productos_backup, clientes_backup, pagos_backup, tasas_cambio_backup;

-- Insertar datos actuales en backup
INSERT INTO ventas_backup SELECT * FROM ventas;
INSERT INTO productos_backup SELECT * FROM productos;
INSERT INTO clientes_backup SELECT * FROM clientes;
INSERT INTO pagos_backup SELECT * FROM pagos;
INSERT INTO tasas_cambio_backup SELECT * FROM tasas_cambio;

-- Mostrar resumen del backup
DO $$
DECLARE
    total_ventas INTEGER;
    total_productos INTEGER;
    total_clientes INTEGER;
    total_pagos INTEGER;
    total_tasas INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_ventas FROM ventas_backup;
    SELECT COUNT(*) INTO total_productos FROM productos_backup;
    SELECT COUNT(*) INTO total_clientes FROM clientes_backup;
    SELECT COUNT(*) INTO total_pagos FROM pagos_backup;
    SELECT COUNT(*) INTO total_tasas FROM tasas_cambio_backup;
    
    RAISE NOTICE '📦 Backup creado exitosamente:';
    RAISE NOTICE '   - Ventas: % registros', total_ventas;
    RAISE NOTICE '   - Productos: % registros', total_productos;
    RAISE NOTICE '   - Clientes: % registros', total_clientes;
    RAISE NOTICE '   - Pagos: % registros', total_pagos;
    RAISE NOTICE '   - Tasas de cambio: % registros', total_tasas;
    RAISE NOTICE '💾 Datos seguros en tablas *_backup';
END $$;
