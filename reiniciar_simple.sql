-- =====================================================
-- SCRIPT SIMPLE PARA REINICIAR TABLAS PRINCIPALES
-- =====================================================

-- Iniciar transacción
BEGIN;

-- Limpiar tabla de pagos (dependiente)
DELETE FROM pagos;

-- Limpiar tabla de ventas (principal)
DELETE FROM ventas;

-- Limpiar tabla de productos
DELETE FROM productos;

-- Reiniciar secuencias
ALTER SEQUENCE pagos_id_seq RESTART WITH 1;
ALTER SEQUENCE ventas_id_seq RESTART WITH 1;
ALTER SEQUENCE productos_id_seq RESTART WITH 1;

-- Confirmar transacción
COMMIT;
