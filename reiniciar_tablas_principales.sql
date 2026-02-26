-- =====================================================
-- SCRIPT PARA REINICIAR TABLAS PRINCIPALES DEL SISTEMA
-- =====================================================
-- Este script limpia los datos principales manteniendo la estructura
-- Para entrega limpia al cliente

-- Iniciar transacción para seguridad
BEGIN;

-- Mostrar mensaje de inicio
DO $$
BEGIN
    RAISE NOTICE '🧹 Iniciando limpieza de tablas principales...';
END $$;

-- 5. LIMPIAR TABLAS DE PAGOS (DEPENDIENTES)
-- =====================================================
RAISE NOTICE '📊 Limpiando tabla de pagos...';
DELETE FROM pagos;
ALTER SEQUENCE pagos_id_seq RESTART WITH 1;

-- 6. LIMPIAR TABLAS DE VENTAS (PRINCIPAL)
-- =====================================================
RAISE NOTICE '💰 Limpiando tabla de ventas...';
DELETE FROM ventas;
ALTER SEQUENCE ventas_id_seq RESTART WITH 1;

-- 7. LIMPIAR TABLAS DE PRODUCTOS
-- =====================================================
RAISE NOTICE '📦 Limpiando tabla de productos...';
DELETE FROM productos;
ALTER SEQUENCE productos_id_seq RESTART WITH 1;

-- Confirmar transacción
COMMIT;

-- Mostrar mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '✅ Limpieza completada exitosamente!';
    RAISE NOTICE '📊 Estado final:';
    RAISE NOTICE '   - Ventas: 0 registros';
    RAISE NOTICE '   - Productos: 0 registros';
    RAISE NOTICE '   - Pagos: 0 registros';
    RAISE NOTICE '🔒 Tablas preservadas:';
    RAISE NOTICE '   - Clientes: Mantenidos intactos';
    RAISE NOTICE '   - Tasas de cambio: Mantenidas intactas';
    RAISE NOTICE '   - Usuarios: Mantenidos intactos';
    RAISE NOTICE '   - Categorías: Mantenidas intactas';
    RAISE NOTICE '🎯 Sistema listo para entrega al cliente';
END $$;
