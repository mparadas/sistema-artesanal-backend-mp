-- Crear tabla de estados de venta
CREATE TABLE IF NOT EXISTS estados_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT 'gray',
    icono VARCHAR(50) DEFAULT 'circle',
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar estados básicos
INSERT INTO estados_venta (codigo, nombre, descripcion, color, icono, orden) VALUES
    ('pagado', 'Pagado', 'Venta completamente pagada', 'green', 'check-circle', 1),
    ('parcial', 'Parcial', 'Venta con pagos parciales', 'yellow', 'clock', 2),
    ('pendiente', 'Pendiente', 'Venta pendiente de pago', 'red', 'alert-circle', 3),
    ('liquidado', 'Liquidado', 'Venta de crédito completamente liquidada', 'blue', 'check-circle', 4),
    ('cancelado', 'Cancelado', 'Venta cancelada', 'gray', 'x-circle', 5)
ON DUPLICATE KEY UPDATE 
    nombre = VALUES(nombre),
    descripcion = VALUES(descripcion),
    color = VALUES(color),
    icono = VALUES(icono),
    orden = VALUES(orden),
    updated_at = CURRENT_TIMESTAMP;

-- Verificar los estados insertados
SELECT * FROM estados_venta ORDER BY orden;
