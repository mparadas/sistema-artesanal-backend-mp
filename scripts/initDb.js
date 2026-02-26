const db = require('../config/database');

const initSQL = `
-- ============================================
-- INICIALIZACIÓN COMPLETA - SISTEMA ARTESANAL
-- ============================================

-- Eliminar tablas si existen (orden dependiente)
DROP TABLE IF EXISTS venta_pagos CASCADE;
DROP TABLE IF EXISTS venta_detalles CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS pedido_pagos CASCADE;
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS produccion CASCADE;
DROP TABLE IF EXISTS receta_ingredientes CASCADE;
DROP TABLE IF EXISTS recetas CASCADE;
DROP TABLE IF EXISTS ingredientes CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;

-- Tabla de productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'Otros',
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10,3) NOT NULL DEFAULT 10,
    unidad VARCHAR(20) DEFAULT 'kg',
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de ingredientes
CREATE TABLE ingredientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    unidad VARCHAR(20) NOT NULL DEFAULT 'kg',
    stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    stock_minimo DECIMAL(10,3) NOT NULL DEFAULT 10,
    costo DECIMAL(10,2) NOT NULL DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de recetas
CREATE TABLE recetas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    producto_id INTEGER REFERENCES productos(id),
    rendimiento DECIMAL(10,3) NOT NULL DEFAULT 1,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de ingredientes por receta
CREATE TABLE receta_ingredientes (
    id SERIAL PRIMARY KEY,
    receta_id INTEGER REFERENCES recetas(id) ON DELETE CASCADE,
    ingrediente_id INTEGER REFERENCES ingredientes(id),
    cantidad DECIMAL(10,3) NOT NULL
);

-- Tabla de producción (historial)
CREATE TABLE produccion (
    id SERIAL PRIMARY KEY,
    receta_id INTEGER REFERENCES recetas(id),
    cantidad_lotes INTEGER NOT NULL DEFAULT 1,
    cantidad_producida DECIMAL(10,3) NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    notas TEXT
);

-- Tabla de clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    email VARCHAR(150),
    direccion TEXT,
    notas TEXT,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(150),
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_ves DECIMAL(14,2),
    moneda_original VARCHAR(10) DEFAULT 'USD',
    tasa_cambio_usada DECIMAL(12,4) DEFAULT 1,
    tipo_venta VARCHAR(20) DEFAULT 'inmediato',
    metodo_pago VARCHAR(50),
    referencia_pago VARCHAR(100),
    fecha_vencimiento DATE,
    estado_pago VARCHAR(20) DEFAULT 'pagado',
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de detalle de ventas
CREATE TABLE venta_detalles (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad DECIMAL(10,3) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    total_linea DECIMAL(12,2) NOT NULL,
    precio_moneda_original DECIMAL(10,2),
    moneda_original VARCHAR(10) DEFAULT 'USD'
);

-- Tabla de pagos/abonos de ventas
CREATE TABLE venta_pagos (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
    monto DECIMAL(12,2) NOT NULL,
    monto_ves DECIMAL(14,2),
    metodo_pago VARCHAR(50),
    referencia_pago VARCHAR(100),
    tasa_cambio DECIMAL(12,4) DEFAULT 1,
    fecha TIMESTAMP DEFAULT NOW()
);

-- Tabla de pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(150),
    total_estimado DECIMAL(12,2) DEFAULT 0,
    notas TEXT,
    fecha_entrega DATE,
    estado VARCHAR(20) DEFAULT 'pendiente',
    venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    saldo_pendiente DECIMAL(12,2) DEFAULT 0,
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Tabla de items de pedido
CREATE TABLE pedido_items (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad_pedida DECIMAL(10,3) NOT NULL,
    cantidad_entregada DECIMAL(10,3) DEFAULT 0,
    peso_entregado DECIMAL(10,3) DEFAULT 0,
    precio_unitario DECIMAL(10,2) NOT NULL
);

-- Tabla de pagos/abonos de pedidos
CREATE TABLE pedido_pagos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    monto DECIMAL(12,2) NOT NULL,
    metodo_pago VARCHAR(50),
    referencia_pago VARCHAR(100),
    fecha TIMESTAMP DEFAULT NOW()
);

-- Tabla de usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(200) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'vendedor',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW(),
    ultimo_acceso TIMESTAMP
);

-- ============================================
-- DATOS DE EJEMPLO
-- ============================================

-- Productos
INSERT INTO productos (nombre, categoria, precio, stock, stock_minimo, unidad) VALUES
('Chorizo Tradicional', 'Chorizos', 15.50, 25, 10, 'kg'),
('Hamburguesa Artesanal', 'Hamburguesas', 8.00, 50, 20, 'unidad'),
('Queso Mozzarella', 'Quesos', 12.00, 15, 5, 'kg'),
('Chistorra Vasca', 'Chistorras', 18.00, 20, 8, 'kg'),
('Jamón Curado', 'Curados', 25.00, 10, 3, 'kg');

-- Clientes
INSERT INTO clientes (nombre, telefono) VALUES
('Alonso', '04120000000'),
('miguelangel Paradas', '04120450501');

-- Recetas e ingredientes (ejemplo corto)
INSERT INTO ingredientes (nombre, unidad, stock, stock_minimo, costo) VALUES
('Carne de cerdo', 'kg', 100, 20, 8.50),
('Carne de res', 'kg', 80, 15, 12.00),
('Especias mixtas', 'kg', 10, 2, 25.00),
('Tripa natural', 'm', 50, 10, 3.00),
('Leche entera', 'litro', 30, 5, 2.50),
('Cuajo', 'gr', 500, 100, 0.05),
('Sal', 'kg', 20, 5, 1.00),
('Pimienta', 'kg', 5, 1, 15.00);

INSERT INTO recetas (nombre, producto_id, rendimiento) VALUES
('Receta Chorizo Tradicional', 1, 10),
('Receta Hamburguesa', 2, 20),
('Receta Queso Mozzarella', 3, 5);

INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad) VALUES
(1, 1, 8),(1,3,0.5),(1,4,5),(1,7,0.2),
(2,2,10),(2,3,0.3),(2,8,0.1),
(3,5,25),(3,6,10);

-- Usuarios por defecto (passwords se recomienda cambiar en entorno)
INSERT INTO usuarios (nombre, usuario, password, rol) VALUES
('Administrador','admin','admin123','admin');

-- Pedidos de ejemplo que reflejan la UI
INSERT INTO pedidos (cliente_id, cliente_nombre, total_estimado, notas, fecha_entrega, estado, monto_pagado, saldo_pendiente) VALUES
(2,'Alonso',22.50,'', '2026-02-20','facturado',0,0),
(2,'Alonso',88.75,'333','2026-02-21','facturado',0,0),
(2,'Alonso',74.40,'','2026-02-20','facturado',66.00,8.40),
(NULL,'',112.50,'','2026-02-20','pendiente',112.50,0),
(2,'Alonso',26.00,'Casa 30','2026-02-19','facturado',0,0),
(1,'miguelangel Paradas',51.00,'Entregar en su casa','2026-02-20','pendiente',0,51.00);

-- Insertar items para pedidos (simple correspondencia)
-- Pedido 7 -> Chistorra 1.25 kg
INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado, precio_unitario) VALUES
(1,4,1,0,1.25,18.00);
-- Pedido 6 -> 2 items (ids may differ)
INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado, precio_unitario) VALUES
(2,1,1,2.5,0,15.50),(2,5,1,2,0,25.00);
-- Pedido 4 -> ejemplo multiple
INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado, precio_unitario) VALUES
(3,1,2,1.2,0,15.50),(3,1,2,1.2,0,15.50),(3,1,2,1.2,0,15.50);
-- Pedido 3 (index 4 in inserts) simulate 5 items summed to 112.50
INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado, precio_unitario) VALUES
(4,4,1.25,0,0,18.00),(4,4,1.25,0,0,18.00),(4,1,2,0,0,15.50),(4,5,1,0,0,25.00),(4,3,1,0,0,12.00);
-- Pedido 2 and 1
INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado, precio_unitario) VALUES
(5,2,1,0,0,8.00),(5,1,1,0,0,18.00),(6,1,1,0,0,8.00),(6,2,1,0,0,18.00),(6,5,1,0,0,25.00);

-- Pagos/abonos ejemplo para pedido #3 (index 4)
INSERT INTO pedido_pagos (pedido_id, monto, metodo_pago, referencia_pago, fecha) VALUES
(4,15.50,'efectivo',NULL,'2026-02-19T20:00:00'),
(4,1.00,'efectivo','prueba3','2026-02-19T20:10:00'),
(4,1.00,'efectivo','prueba2','2026-02-19T20:12:00'),
(4,2.50,'efectivo','anticipo','2026-02-19T20:20:00'),
(4,2.50,'efectivo',NULL,'2026-02-19T20:24:00');

-- Ajustar montos de pedido según ejemplos
UPDATE pedidos SET monto_pagado = 22.50, saldo_pendiente = total_estimado - 22.50 WHERE id = 4;

-- Si deseas, crear ventas provisionales a partir de pedidos con abonos (opcional)

`;

async function initDatabase() {
    try {
        console.log('🗄️  Conectando a PostgreSQL...');
        console.log(`Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`DB: ${process.env.DB_NAME || 'inventario_artesanal'}`);
        await db.query(initSQL);
        console.log('✅ Base de datos inicializada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al inicializar DB:', error.message);
        process.exit(1);
    }
}

initDatabase();
