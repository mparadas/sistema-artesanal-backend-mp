-- Crear tabla para tasas de cambio diarias
CREATE TABLE IF NOT EXISTS tasas_cambio_diarias (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tasa_bcv DECIMAL(10, 2) NOT NULL,
    tasa_paralelo DECIMAL(10, 2) NOT NULL,
    usuario VARCHAR(100) DEFAULT 'sistema',
    ip_address VARCHAR(45),
    user_agent TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha ON tasas_cambio_diarias(fecha);
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_usuario ON tasas_cambio_diarias(usuario);
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_fecha_usuario ON tasas_cambio_diarias(fecha, usuario);

-- Insertar tasa de cambio del día actual si no existe
INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
SELECT 
    CURRENT_DATE as fecha,
    (SELECT tasa FROM tasas_cambio WHERE fecha = CURRENT_DATE ORDER BY id DESC LIMIT 1) as tasa_bcv,
    (SELECT tasa FROM tasas_cambio WHERE fecha = CURRENT_DATE ORDER BY id DESC LIMIT 1) as tasa_paralelo,
    'sistema',
    '127.0.0.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4474.183.110'
ON CONFLICT DO NOTHING;
