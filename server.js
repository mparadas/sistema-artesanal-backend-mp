const express = require('express');
const cors = require('cors');
// require('dotenv').config(); // Eliminado para evitar conflicto
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const db = require('./config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registrarAuditoria, middlewareAuditoria } = require('./utils/auditoria');

const NODE_ENV = process.env.NODE_ENV || 'development';
let JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
    if (NODE_ENV === 'production') {
        throw new Error('JWT_SECRET es obligatorio en producción');
    }
    JWT_SECRET = 'desarrollo_secreto_super_seguro_12345';
    console.warn('⚠️ JWT_SECRET no definido. Usando secreto estático para entorno no productivo.');
}
const MAIL_FROM = process.env.MAIL_FROM || 'Ventas@agromae.com';

const app = express();
const PUBLIC_RATE_WINDOW_MS = 60 * 1000;
const PUBLIC_RATE_MAX = 12;
const publicRateStore = new Map();
const publicOrderDedupStore = new Map();
const PESO_UNIDAD_HAMBURGUESA_KG = 0.150;

const createMailTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER || MAIL_FROM,
      pass: process.env.SMTP_PASS || ''
    }
  });

// Configuración CORS mejorada para móvil y producción
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://192.168.100.224:5173', 
    'http://192.168.100.224:3000',
    'https://agromae.onrender.com',
    'https://sistema-artesanal-frontend-mp.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(middlewareAuditoria); // Middleware para capturar información de auditoría
const uploadsDir = path.join(__dirname, 'uploads');
const uploadsProductosDir = path.join(uploadsDir, 'productos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(uploadsProductosDir)) fs.mkdirSync(uploadsProductosDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const cleanStaleEntries = (store, maxAgeMs) => {
    const now = Date.now();
    for (const [key, value] of store.entries()) {
        const ts = value?.ts || value?.firstTs || 0;
        if (!ts || (now - ts) > maxAgeMs) {
            store.delete(key);
        }
    }
};

const publicRateLimit = (req, res, next) => {
    cleanStaleEntries(publicRateStore, PUBLIC_RATE_WINDOW_MS * 3);
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const current = publicRateStore.get(key);

    if (!current || (now - current.firstTs) > PUBLIC_RATE_WINDOW_MS) {
        publicRateStore.set(key, { firstTs: now, count: 1 });
        return next();
    }

    if (current.count >= PUBLIC_RATE_MAX) {
        return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta nuevamente en 1 minuto.' });
    }

    current.count += 1;
    publicRateStore.set(key, current);
    return next();
};

const verifyTurnstileToken = async (token, remoteIp) => {
    const secret = process.env.TURNSTILE_SECRET_KEY || '';
    if (!secret) return false;
    const body = new URLSearchParams();
    body.append('secret', secret);
    body.append('response', token || '');
    if (remoteIp) body.append('remoteip', String(remoteIp));

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });
    const data = await response.json().catch(() => ({}));
    return !!data?.success;
};

const isValidPhoneVE = (phone) => /^04\d{9}$/.test(String(phone || '').replace(/\D+/g, ''));
const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(String(email || '').trim().toLowerCase());
const normalizePhone = (phone) => String(phone || '').replace(/\D+/g, '');
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeName = (name) => String(name || '').trim();
const hasNameAndSurname = (name) => normalizeName(name).split(/\s+/).filter(Boolean).length >= 2;
const toNumber = (value, fallback = 0) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const isHamburguesaUnidadExacta = (producto = {}) => {
    const tipo = String(producto?.tipo_producto || '').toLowerCase();
    if (tipo === 'corte') return false;
    const categoria = String(producto?.categoria || '').toLowerCase();
    const nombre = String(producto?.nombre || '').toLowerCase();
    return categoria.includes('hamburgues') || nombre.includes('hamburguesa');
};
const normalizarCamposProductoFinal = (datosNuevos = {}, datosActuales = {}) => {
    const merged = { ...datosActuales, ...datosNuevos };
    let stock = toNumber(merged.stock, 0);
    const cantidadPiezasInput = Math.max(0, parseInt(merged.cantidad_piezas || 0, 10) || 0);
    const pesoTotalInput = toNumber(merged.peso_total, 0);
    const esPorUnidad = isHamburguesaUnidadExacta(merged);

    if (esPorUnidad) {
        // Si es hamburguesa, el stock principal ahora representa Kg para consistencia.
        // Si el usuario envió stock, lo tomamos como Kg.
        // Si no envió stock pero sí piezas, calculamos el Kg.
        let peso = stock;
        
        if (datosNuevos.stock === undefined) {
            if (datosNuevos.cantidad_piezas !== undefined) {
                peso = cantidadPiezasInput * PESO_UNIDAD_HAMBURGUESA_KG;
            } else if (datosNuevos.peso_total !== undefined) {
                peso = pesoTotalInput;
            }
        }

        return {
            stock: peso,
            peso_total: peso,
            cantidad_piezas: Math.round(peso / PESO_UNIDAD_HAMBURGUESA_KG)
        };
    }

    // Regla general en productos finales: peso_total y stock deben ser equivalentes (Kg).
    return {
        stock,
        peso_total: stock,
        cantidad_piezas: cantidadPiezasInput
    };
};
const normalizarProductoFinalPorId = async (queryable, productoId) => {
    const result = await queryable.query(
        `SELECT id, nombre, categoria, tipo_producto, stock, cantidad_piezas, peso_total
         FROM productos
         WHERE id = $1 AND activa = TRUE`,
        [productoId]
    );
    if (result.rows.length === 0) return;
    const producto = result.rows[0];
    const normalizado = normalizarCamposProductoFinal(producto, producto);
    const pesoActual = toNumber(producto.peso_total, 0);
    const piezasActuales = parseInt(producto.cantidad_piezas || 0, 10) || 0;
    if (Number(pesoActual) === Number(normalizado.peso_total) && Number(piezasActuales) === Number(normalizado.cantidad_piezas)) {
        return;
    }
    await queryable.query(
        `UPDATE productos
         SET peso_total = $1,
             cantidad_piezas = $2,
             actualizado_en = NOW()
         WHERE id = $3`,
        [normalizado.peso_total, normalizado.cantidad_piezas, productoId]
    );
};
const normalizarImagenProductoPath = (valor) => {
    if (valor === undefined || valor === null) return null;
    const raw = String(valor).trim();
    if (!raw) return null;

    if (raw.startsWith('/uploads/productos/')) return raw;
    if (raw.startsWith('uploads/productos/')) return `/${raw}`;

    const uploadMatch = raw.match(/\/uploads\/productos\/[^?#\s]+/i);
    if (uploadMatch && uploadMatch[0]) {
        return uploadMatch[0];
    }

    return raw;
};

const PUBLIC_MUTATION_ALLOWLIST = [
    '/api/public/pedidos',
    '/api/auth/login',
    '/api/health',
    '/api/test-mobile'
];

const shouldRequireAuthForMutation = (req) => {
    const method = String(req.method || 'GET').toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return false;
    const pathReq = String(req.path || '');
    if (!pathReq.startsWith('/api/')) return false;
    return !PUBLIC_MUTATION_ALLOWLIST.some((allowed) => pathReq === allowed || pathReq.startsWith(`${allowed}/`));
};

app.use((req, res, next) => {
    if (!shouldRequireAuthForMutation(req)) return next();
    return authenticateToken(req, res, next);
});

// ============================================
// SALUD
// ============================================

// Endpoint de prueba para conexión desde móvil
app.get('/api/test-mobile', async (req, res) => {
    try {
        res.json({ 
            status: 'OK', 
            message: 'Conexión exitosa desde móvil',
            server: 'Backend funcionando',
            timestamp: new Date().toISOString(),
            ip: req.ip || 'desconocida'
        });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW() as fecha');
        res.json({ status: 'OK', fecha: new Date(), database: 'conectada', serverTime: result.rows[0].fecha });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'desconectada', error: error.message });
    }
});

// ============================================
// PRODUCTOS
// ============================================

app.post('/api/uploads/productos', authenticateToken, async (req, res) => {
    try {
        // Headers CORS específicos para upload
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Credentials', 'true');
        
        
        if (!req.user || req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'Permiso denegado' });
        }

        const imageData = String(req.body?.image_data || '');
        const fileNameHint = String(req.body?.file_name || 'producto');
        if (!imageData) {
            return res.status(400).json({ error: 'Debes enviar image_data' });
        }

        const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) {
            return res.status(400).json({ error: 'Formato de imagen inválido' });
        }

        const mime = match[1].toLowerCase();
        const base64Content = match[2];
        const extensiones = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif'
        };
        const extension = extensiones[mime];
        if (!extension) {
            return res.status(400).json({ error: 'Tipo de imagen no permitido. Usa JPG, PNG, WEBP o GIF' });
        }

        const buffer = Buffer.from(base64Content, 'base64');
        const maxBytes = 5 * 1024 * 1024;
        if (!buffer || buffer.length === 0) {
            return res.status(400).json({ error: 'Contenido de imagen vacío' });
        }
        if (buffer.length > maxBytes) {
            return res.status(400).json({ error: 'La imagen supera el máximo de 5MB' });
        }

        const safeHint = fileNameHint.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'producto';
        const fileName = `${Date.now()}-${safeHint}-${crypto.randomBytes(4).toString('hex')}.${extension}`;
        const filePath = path.join(uploadsProductosDir, fileName);
        fs.writeFileSync(filePath, buffer);

        const relativeUrl = `/uploads/productos/${fileName}`;
        const absoluteUrl = `${req.protocol}://${req.get('host')}${relativeUrl}`;
        return res.status(201).json({ url: absoluteUrl, relative_url: relativeUrl });
    } catch (error) {
        return res.status(500).json({ error: 'Error al subir imagen', detalle: error.message });
    }
});

app.get('/api/productos', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM productos WHERE activa = TRUE ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos', detalle: error.message });
    }
});

// Catálogo público (sin login)
app.get('/api/public/catalogo', publicRateLimit, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, nombre, categoria, precio, unidad, descripcion, imagen_url,
                    animal_origen, stock, cantidad_piezas, peso_total, precio_canal
             FROM productos
             WHERE activa = TRUE
             ORDER BY nombre`
        );
        res.json({ data: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener catálogo público' });
    }
});

app.post('/api/productos', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const {
            nombre, categoria, precio, stock, stock_minimo, unidad, descripcion,
            tipo_producto, animal_origen, cantidad_piezas, peso_total, precio_canal, imagen_url
        } = req.body;

        const baseProducto = {
            nombre,
            categoria: categoria || 'Otros',
            precio: precio || 0,
            stock: toNumber(stock, 0),
            stock_minimo: stock_minimo || 10,
            unidad: unidad || 'kg',
            descripcion: descripcion || '',
            tipo_producto: tipo_producto || 'producido',
            animal_origen: animal_origen || null,
            cantidad_piezas: parseInt(cantidad_piezas || 0, 10) || 0,
            peso_total: toNumber(peso_total, 0),
            precio_canal: precio_canal || 0,
            imagen_url: normalizarImagenProductoPath(imagen_url)
        };
        const normalizados = normalizarCamposProductoFinal(baseProducto, baseProducto);
        const nuevoProducto = {
            ...baseProducto,
            ...normalizados
        };
        
        const result = await db.query(
            `INSERT INTO productos (
                nombre, categoria, precio, stock, stock_minimo, unidad, descripcion,
                tipo_producto, animal_origen, cantidad_piezas, peso_total, precio_canal, imagen_url
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [
                nuevoProducto.nombre, nuevoProducto.categoria, nuevoProducto.precio, nuevoProducto.stock,
                nuevoProducto.stock_minimo, nuevoProducto.unidad, nuevoProducto.descripcion,
                nuevoProducto.tipo_producto, nuevoProducto.animal_origen, nuevoProducto.cantidad_piezas,
                nuevoProducto.peso_total, nuevoProducto.precio_canal, nuevoProducto.imagen_url
            ]
        );
        
        const productoCreado = result.rows[0];
        console.log('🔍 Producto creado con ID:', productoCreado.id);
        console.log('🔍 Datos completos:', productoCreado);
        
        // Registrar auditoría
        await registrarAuditoria({
            tabla: 'productos',
            registroId: productoCreado.id,
            tipoMovimiento: 'INSERT',
            usuario: req.auditoria?.usuario || 'sistema',
            detallesNuevos: productoCreado,
            ipAddress: req.auditoria?.ipAddress,
            userAgent: req.auditoria?.userAgent
        });
        
        res.status(201).json(productoCreado);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear producto', detalle: error.message });
    }
});

app.put('/api/productos/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const {
            nombre, categoria, precio, stock, stock_minimo, unidad, descripcion,
            tipo_producto, animal_origen, cantidad_piezas, peso_total, precio_canal, imagen_url
        } = req.body;
        
        // Obtener datos anteriores antes de actualizar
        const productoAnterior = await db.query('SELECT * FROM productos WHERE id = $1 AND activa = TRUE', [id]);
        if (productoAnterior.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        
        const datosAnteriores = productoAnterior.rows[0];
        const normalizados = normalizarCamposProductoFinal({
            nombre, categoria, tipo_producto, stock, cantidad_piezas, peso_total
        }, datosAnteriores);
        
        const result = await db.query(
            `UPDATE productos SET
                nombre = COALESCE($1, nombre),
                categoria = COALESCE($2, categoria),
                precio = COALESCE($3, precio),
                stock = COALESCE($4, stock),
                stock_minimo = COALESCE($5, stock_minimo),
                unidad = COALESCE($6, unidad),
                descripcion = COALESCE($7, descripcion),
                tipo_producto = COALESCE($8, tipo_producto),
                animal_origen = COALESCE($9, animal_origen),
                cantidad_piezas = COALESCE($10, cantidad_piezas),
                peso_total = COALESCE($11, peso_total),
                precio_canal = COALESCE($12, precio_canal),
                imagen_url = COALESCE($13, imagen_url),
                actualizado_en = NOW()
             WHERE id = $14 AND activa = TRUE RETURNING *`,
            [
                nombre,
                categoria,
                precio,
                normalizados.stock,
                stock_minimo,
                unidad,
                descripcion,
                tipo_producto,
                animal_origen,
                normalizados.cantidad_piezas,
                normalizados.peso_total,
                precio_canal,
                normalizarImagenProductoPath(imagen_url),
                id
            ]
        );
        
        const productoActualizado = result.rows[0];
        
        // Registrar auditoría
        await registrarAuditoria({
            tabla: 'productos',
            registroId: parseInt(id),
            tipoMovimiento: 'UPDATE',
            usuario: req.auditoria?.usuario || 'sistema',
            detallesAnteriores: datosAnteriores,
            detallesNuevos: productoActualizado,
            ipAddress: req.auditoria?.ipAddress,
            userAgent: req.auditoria?.userAgent
        });
        
        res.json(productoActualizado);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar producto', detalle: error.message });
    }
});

app.delete('/api/productos/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        
        // Obtener datos antes de eliminar
        const productoAEliminar = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
        if (productoAEliminar.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        
        const datosEliminados = productoAEliminar.rows[0];
        
        const result = await db.query('UPDATE productos SET activa = FALSE WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        
        // Registrar auditoría
        await registrarAuditoria({
            tabla: 'productos',
            registroId: parseInt(id),
            tipoMovimiento: 'DELETE',
            usuario: req.auditoria?.usuario || 'sistema',
            detallesAnteriores: datosEliminados,
            ipAddress: req.auditoria?.ipAddress,
            userAgent: req.auditoria?.userAgent
        });
        
        res.json({ mensaje: 'Producto eliminado', producto: datosEliminados });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto', detalle: error.message });
    }
});

app.post('/api/productos/:id/incrementar-corte', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const piezas = parseInt(req.body?.piezas || 0, 10) || 0;
        const pesoKg = parseFloat(req.body?.peso_kg || 0) || 0;
        const precioCanal = (req.body?.precio_canal !== undefined && req.body?.precio_canal !== null && req.body?.precio_canal !== '')
            ? (parseFloat(req.body?.precio_canal) || 0)
            : null;
        if (piezas <= 0 && pesoKg <= 0 && precioCanal === null) {
            return res.status(400).json({ error: 'Debes indicar piezas, peso o precio en canal' });
        }
        const result = await db.query(
            `UPDATE productos SET
                cantidad_piezas = COALESCE(cantidad_piezas, 0) + $1,
                peso_total = COALESCE(peso_total, 0) + $2,
                stock = COALESCE(stock, 0) + $2,
                precio_canal = COALESCE($3, precio_canal),
                actualizado_en = NOW()
             WHERE id = $4 AND activa = TRUE
             RETURNING *`,
            [piezas, pesoKg, precioCanal, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        await normalizarProductoFinalPorId(db, id);
        res.json({ mensaje: 'Corte actualizado', producto: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al incrementar corte', detalle: error.message });
    }
});

app.post('/api/productos/:id/agregar-existencia', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const cantidad = parseFloat(req.body?.cantidad || 0) || 0;
        const piezas = parseInt(req.body?.piezas || 0, 10) || 0;
        const pesoKg = parseFloat(req.body?.peso_kg || 0) || 0;
        const productoResult = await db.query('SELECT id, tipo_producto FROM productos WHERE id = $1 AND activa = TRUE', [id]);
        if (productoResult.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        const tipo = String(productoResult.rows[0].tipo_producto || 'producido').toLowerCase();

        let result;
        if (tipo === 'corte') {
            if (cantidad <= 0 && piezas <= 0 && pesoKg <= 0) {
                return res.status(400).json({ error: 'Debes indicar piezas, peso o cantidad para agregar' });
            }
            result = await db.query(
                `UPDATE productos SET
                    stock = COALESCE(stock, 0) + COALESCE(NULLIF($1, 0), $3),
                    cantidad_piezas = COALESCE(cantidad_piezas, 0) + $2,
                    peso_total = COALESCE(peso_total, 0) + $3,
                    actualizado_en = NOW()
                 WHERE id = $4 AND activa = TRUE
                 RETURNING *`,
                [cantidad, piezas, pesoKg, id]
            );
        } else {
            if (cantidad <= 0) return res.status(400).json({ error: 'Cantidad inválida para agregar existencia' });
            result = await db.query(
                `UPDATE productos
                 SET stock = COALESCE(stock, 0) + $1, actualizado_en = NOW()
                 WHERE id = $2 AND activa = TRUE
                 RETURNING *`,
                [cantidad, id]
            );
        }
        const productoActualizado = result.rows[0];
        
        // Registrar auditoría por incremento de existencia
        await registrarAuditoria({
            tabla: 'productos',
            registroId: parseInt(id),
            tipoMovimiento: 'UPDATE',
            usuario: req.auditoria?.usuario || 'sistema',
            detallesAnteriores: productoResult.rows[0],
            detallesNuevos: productoActualizado,
            ipAddress: req.auditoria?.ipAddress,
            userAgent: req.auditoria?.userAgent
        });

        await normalizarProductoFinalPorId(db, id);
        res.json({ mensaje: 'Existencia agregada', producto: productoActualizado });
    } catch (error) {
        res.status(500).json({ error: 'Error al agregar existencia', detalle: error.message });
    }
});

app.put('/api/productos/:id/mantenimiento', authenticateToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        console.log('🔍 Iniciando mantenimiento para producto ID:', req.params.id);
        console.log('🔍 Usuario:', req.user?.usuario, 'Rol:', req.user?.rol);
        console.log('🔍 Datos recibidos:', req.body);
        
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const precio = req.body?.precio;
        const precio_canal = req.body?.precio_canal;
        const imagen_url = req.body?.imagen_url;
        const usuario = req.user?.usuario || req.auditoria?.usuario || 'sistema';

        await client.query('BEGIN');
        console.log('🔍 Buscando producto con ID:', id);
        
        const actualResult = await client.query(
            `SELECT id, nombre, precio, precio_canal, imagen_url
             FROM productos
             WHERE id = $1 AND activa = TRUE`,
            [id]
        );
        
        console.log('🔍 Producto encontrado:', actualResult.rows.length > 0 ? 'SÍ' : 'NO');
        
        if (actualResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const actual = actualResult.rows[0];
        console.log('🔍 Datos actuales:', actual);
        
        const nuevoPrecio = (precio === undefined || precio === null || precio === '') ? null : (parseFloat(precio) || 0);
        const nuevoPrecioCanal = (precio_canal === undefined || precio_canal === null || precio_canal === '') ? null : (parseFloat(precio_canal) || 0);
        const nuevaImagen = normalizarImagenProductoPath(imagen_url);

        console.log('🔍 Nuevos valores:', { nuevoPrecio, nuevoPrecioCanal, nuevaImagen });

        console.log('🔍 Actualizando producto...');
        const actualizado = await client.query(
            `UPDATE productos SET
                precio = COALESCE($1, precio),
                precio_canal = COALESCE($2, precio_canal),
                imagen_url = COALESCE($3, imagen_url),
                actualizado_en = NOW()
             WHERE id = $4 AND activa = TRUE
             RETURNING *`,
            [nuevoPrecio, nuevoPrecioCanal, nuevaImagen, id]
        );

        const nuevo = actualizado.rows[0];
        console.log('🔍 Producto actualizado:', nuevo);
        
        if (nuevoPrecio !== null && Number(nuevoPrecio) !== Number(actual.precio || 0)) {
            console.log('🔍 Registrando cambio de precio...');
            await client.query(
                `INSERT INTO historial_productos_modificaciones
                (producto_id, producto_nombre, tipo_modificacion, valor_anterior, valor_nuevo, usuario, fecha)
                VALUES ($1,$2,'precio',$3,$4,$5,NOW())`,
                [id, nuevo.nombre, String(actual.precio ?? ''), String(nuevoPrecio), usuario]
            );
        }
        if (nuevoPrecioCanal !== null && Number(nuevoPrecioCanal) !== Number(actual.precio_canal || 0)) {
            console.log('🔍 Registrando cambio de precio canal...');
            await client.query(
                `INSERT INTO historial_productos_modificaciones
                (producto_id, producto_nombre, tipo_modificacion, valor_anterior, valor_nuevo, usuario, fecha)
                VALUES ($1,$2,'precio_canal',$3,$4,$5,NOW())`,
                [id, nuevo.nombre, String(actual.precio_canal ?? ''), String(nuevoPrecioCanal), usuario]
            );
        }
        if (nuevaImagen && String(nuevaImagen) !== String(actual.imagen_url || '')) {
            console.log('🔍 Registrando cambio de imagen...');
            await client.query(
                `INSERT INTO historial_productos_modificaciones
                (producto_id, producto_nombre, tipo_modificacion, valor_anterior, valor_nuevo, usuario, fecha)
                VALUES ($1,$2,'imagen',$3,$4,$5,NOW())`,
                [id, nuevo.nombre, String(actual.imagen_url || ''), String(nuevaImagen), usuario]
            );
        }

        await client.query('COMMIT');
        console.log('✅ Mantenimiento aplicado exitosamente');
        res.json({ mensaje: 'Mantenimiento aplicado', producto: nuevo });
    } catch (error) {
        console.error('❌ Error en mantenimiento:', error);
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error en mantenimiento de producto', detalle: error.message });
    } finally {
        client.release();
    }
});

app.get('/api/productos/mantenimiento/historial', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const limit = parseInt(req.query?.limit || '200', 10) || 200;
        const result = await db.query(
            `SELECT id, producto_id, producto_nombre, tipo_modificacion, valor_anterior, valor_nuevo, usuario, fecha
             FROM historial_productos_modificaciones
             ORDER BY fecha DESC, id DESC
             LIMIT $1`,
            [limit]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial de mantenimiento', detalle: error.message });
    }
});

// ============================================
// INGREDIENTES
// ============================================

const normalizarUnidadProduccion = (unidad) => String(unidad || '').toLowerCase().trim();

const convertirKgAUnidad = (kg, unidad) => {
    const baseKg = Number(kg) || 0;
    const u = normalizarUnidadProduccion(unidad);
    if (['gr', 'g', 'gramo', 'gramos'].includes(u)) return baseKg * 1000;
    if (['kg', 'kilo', 'kilos'].includes(u)) return baseKg;
    if (['ml'].includes(u)) return baseKg * 1000; // densidad asumida 1kg/L
    if (['lt', 'l', 'litro', 'litros'].includes(u)) return baseKg;
    // Para unidades no convertibles con certeza, se usa valor base.
    return baseKg;
};

const redondear3 = (n) => Number((Number(n) || 0).toFixed(3));

app.get('/api/ingredientes', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM ingredientes ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ingredientes', detalle: error.message });
    }
});

app.post('/api/ingredientes', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { nombre, categoria, unidad, stock, stock_minimo, costo } = req.body;
        
        const nuevoIngrediente = {
            nombre,
            categoria: categoria || 'Carnes',
            unidad: unidad || 'kg',
            stock: stock || 0,
            stock_minimo: stock_minimo || 10,
            costo: costo || 0
        };
        
        const result = await db.query(
            `INSERT INTO ingredientes (nombre, categoria, unidad, stock, stock_minimo, costo)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [nuevoIngrediente.nombre, nuevoIngrediente.categoria, nuevoIngrediente.unidad, nuevoIngrediente.stock, nuevoIngrediente.stock_minimo, nuevoIngrediente.costo]
        );
        
        const ingredienteCreado = result.rows[0];
        
        // Registrar auditoría (desactivado temporalmente para depuración)
        /*
        await registrarAuditoria({
            tabla: 'ingredientes',
            registroId: ingredienteCreado.id,
            tipoMovimiento: 'INSERT',
            usuario: req.auditoria?.usuario || 'sistema',
            detallesNuevos: ingredienteCreado,
            ipAddress: req.auditoria?.ipAddress,
            userAgent: req.auditoria?.userAgent
        });
        */
        
        res.status(201).json(ingredienteCreado);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear ingrediente', detalle: error.message });
    }
});

app.put('/api/ingredientes/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const { nombre, categoria, unidad, stock, stock_minimo, costo } = req.body;
        const result = await db.query(
            `UPDATE ingredientes SET
                nombre = COALESCE($1, nombre),
                categoria = COALESCE($2, categoria),
                unidad = COALESCE($3, unidad),
                stock = COALESCE($4, stock),
                stock_minimo = COALESCE($5, stock_minimo),
                costo = COALESCE($6, costo),
                actualizado_en = NOW()
             WHERE id = $7 RETURNING *`,
            [nombre, categoria, unidad, stock, stock_minimo, costo, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Ingrediente no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar ingrediente', detalle: error.message });
    }
});

app.delete('/api/ingredientes/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const enUso = await db.query('SELECT 1 FROM receta_ingredientes WHERE ingrediente_id = $1 LIMIT 1', [id]);
        if (enUso.rows.length > 0) return res.status(400).json({ error: 'No se puede eliminar: está en uso en recetas' });
        const result = await db.query('DELETE FROM ingredientes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Ingrediente no encontrado' });
        res.json({ mensaje: 'Ingrediente eliminado correctamente', ingrediente: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar ingrediente', detalle: error.message });
    }
});

// ============================================
// RECETAS
// ============================================

app.get('/api/recetas', async (req, res) => {
    try {
        const recetasResult = await db.query(`
            SELECT r.*, p.nombre as producto_nombre, p.unidad as producto_unidad
            FROM recetas r
            LEFT JOIN productos p ON r.producto_id = p.id
            WHERE r.activa = TRUE
        `);
        const recetas = [];
        for (const receta of recetasResult.rows) {
            const ingResult = await db.query(`
                SELECT ri.id, ri.ingrediente_id, ri.cantidad, i.nombre, i.unidad, i.stock as stock_disponible
                FROM receta_ingredientes ri
                JOIN ingredientes i ON ri.ingrediente_id = i.id
                WHERE ri.receta_id = $1
            `, [receta.id]);
            const rendimientoBase = Math.max(Number(receta.rendimiento) || 1, 0.0001);
            const ingredientes = ingResult.rows.map((ing) => {
                const porcentaje = Number(ing.cantidad) || 0;
                const kgNecesarios = (porcentaje / 100) * rendimientoBase;
                const cantidadNecesaria = convertirKgAUnidad(kgNecesarios, ing.unidad);
                const stockDisponible = Number(ing.stock_disponible) || 0;
                return {
                    ...ing,
                    cantidad_necesaria: redondear3(cantidadNecesaria),
                    suficiente: stockDisponible >= cantidadNecesaria
                };
            });
            const puedeProducir = ingredientes.every(i => i.suficiente);
            let lotesPosibles = 0;
            if (puedeProducir && ingredientes.length > 0) {
                lotesPosibles = Math.floor(Math.min(...ingredientes.map((i) => {
                    const requerido = Number(i.cantidad_necesaria) || 0;
                    if (requerido <= 0) return 0;
                    return (Number(i.stock_disponible) || 0) / requerido;
                })));
            }
            recetas.push({ ...receta, ingredientes, puede_producir: puedeProducir, lotes_posibles: lotesPosibles });
        }
        res.json(recetas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener recetas', detalle: error.message });
    }
});

app.post('/api/recetas', authenticateToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        await client.query('BEGIN');
        const { nombre, productoId, rendimiento, ingredientes } = req.body;
        if (!nombre || !Array.isArray(ingredientes) || ingredientes.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Nombre e ingredientes son requeridos' });
        }
        
        // Determinar si es una categoría o un producto específico
        let productoFinalId = null;
        let productoNombre = '';
        
        if (isNaN(productoId)) {
            // Es una categoría (string)
            // Buscar un producto de esa categoría
            const productoDeCategoria = await client.query(
                'SELECT id, nombre FROM productos WHERE categoria = $1 ORDER BY stock DESC LIMIT 1',
                [productoId]
            );
            
            if (productoDeCategoria.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `No hay productos disponibles en la categoría ${productoId}` 
                });
            }
            
            productoFinalId = productoDeCategoria.rows[0].id;
            productoNombre = productoDeCategoria.rows[0].nombre;
        } else {
            // Es un producto específico (ID numérico)
            productoFinalId = parseInt(productoId);
            // Verificar que el producto exista
            const productoExistente = await client.query(
                'SELECT nombre FROM productos WHERE id = $1',
                [productoFinalId]
            );
            
            if (productoExistente.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: `Producto con ID ${productoFinalId} no encontrado` 
                });
            }
            
            productoNombre = productoExistente.rows[0].nombre;
        }

        // Crear la receta con el ID del producto final (no mueve inventario)
        const recetaResult = await client.query(
            `INSERT INTO recetas (nombre, producto_id, rendimiento) VALUES ($1,$2,$3) RETURNING *`,
            [nombre, productoFinalId, rendimiento || 1]
        );
        const recetaId = recetaResult.rows[0].id;

        // Insertar ingredientes de la receta
        for (const ing of ingredientes) {
            const ingredienteId = Number(ing.ingredienteId);
            const cantidadIng = Number(ing.cantidad);
            if (!Number.isInteger(ingredienteId) || ingredienteId <= 0 || !Number.isFinite(cantidadIng) || cantidadIng <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Ingredientes inválidos en la receta' });
            }
            await client.query(
                `INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad) VALUES ($1,$2,$3)`,
                [recetaId, ingredienteId, cantidadIng]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ 
            ...recetaResult.rows[0], 
            ingredientes,
            producto_nombre: productoNombre,
            mensaje: 'Receta creada correctamente'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al crear receta', detalle: error.message });
    } finally {
        client.release();
    }
});

app.put('/api/recetas/:id', authenticateToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        await client.query('BEGIN');
        const { id } = req.params;
        const { nombre, productoId, rendimiento, ingredientes } = req.body;
        const result = await client.query(
            `UPDATE recetas SET
                nombre = COALESCE($1, nombre),
                producto_id = COALESCE($2, producto_id),
                rendimiento = COALESCE($3, rendimiento)
             WHERE id = $4 RETURNING *`,
            [nombre, productoId, rendimiento, id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Receta no encontrada' });
        }
        if (ingredientes && Array.isArray(ingredientes)) {
            await client.query('DELETE FROM receta_ingredientes WHERE receta_id = $1', [id]);
            for (const ing of ingredientes) {
                await client.query(
                    'INSERT INTO receta_ingredientes (receta_id, ingrediente_id, cantidad) VALUES ($1,$2,$3)',
                    [id, ing.ingredienteId, ing.cantidad]
                );
            }
        }
        await client.query('COMMIT');
        res.json({ mensaje: 'Receta actualizada correctamente', receta: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al actualizar receta', detalle: error.message });
    } finally {
        client.release();
    }
});

app.delete('/api/recetas/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const result = await db.query('UPDATE recetas SET activa = FALSE WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Receta no encontrada' });
        res.json({ mensaje: 'Receta eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar receta', detalle: error.message });
    }
});

const ejecutarProduccion = async (client, { recetaId, cantidadKg, usuario }) => {
    const recetaResult = await client.query(
        `SELECT r.*, p.nombre as producto_nombre, p.unidad as producto_unidad, p.categoria as producto_categoria
         FROM recetas r
         JOIN productos p ON r.producto_id = p.id
         WHERE r.id = $1 AND r.activa = TRUE`,
        [recetaId]
    );
    if (recetaResult.rows.length === 0) throw new Error('Receta no encontrada o inactiva');
    const receta = recetaResult.rows[0];

    const ingredientesResult = await client.query(
        `SELECT ri.ingrediente_id, ri.cantidad as porcentaje, i.nombre as ingrediente_nombre, i.unidad as ingrediente_unidad, i.stock as stock_actual, i.costo
         FROM receta_ingredientes ri
         JOIN ingredientes i ON ri.ingrediente_id = i.id
         WHERE ri.receta_id = $1`,
        [recetaId]
    );
    if (ingredientesResult.rows.length === 0) throw new Error('La receta no tiene ingredientes definidos');

    const rendimientoRecetaKg = Math.max(Number(receta.rendimiento) || 1, 0.0001);
    const factorEscala = (Number(cantidadKg) || 0) / rendimientoRecetaKg;
    if (!Number.isFinite(factorEscala) || factorEscala <= 0) throw new Error('Cantidad inválida para producir');

    let costoTotalReceta = 0;
    const detalleIngredientes = [];
    const faltantes = [];
    const capacidadesKg = [];
    for (const ing of ingredientesResult.rows) {
        const porcentaje = Number(ing.porcentaje) || 0;
        const kgConsumidos = (porcentaje / 100) * Number(cantidadKg || 0);
        const consumoUnidad = convertirKgAUnidad(kgConsumidos, ing.ingrediente_unidad);
        const consumoUnidadPorKg = convertirKgAUnidad((porcentaje / 100), ing.ingrediente_unidad);
        const stockActual = Number(ing.stock_actual) || 0;
        if (consumoUnidadPorKg > 0) {
            capacidadesKg.push(stockActual / consumoUnidadPorKg);
        }
        if (stockActual < consumoUnidad) {
            faltantes.push({
                nombre: ing.ingrediente_nombre,
                unidad: ing.ingrediente_unidad || 'kg',
                stockActual,
                requerido: redondear3(consumoUnidad)
            });
        }
        const costoUnitario = Number(ing.costo) || 0;
        const costoTotal = consumoUnidad * costoUnitario;
        costoTotalReceta += costoTotal;
        detalleIngredientes.push({
            ingrediente_id: ing.ingrediente_id,
            ingrediente_nombre: ing.ingrediente_nombre,
            ingrediente_unidad: ing.ingrediente_unidad,
            porcentaje,
            cantidad_consumida: redondear3(consumoUnidad),
            costo_unitario: redondear3(costoUnitario),
            costo_total: redondear3(costoTotal)
        });
    }
    if (faltantes.length > 0) {
        const maxKgPosibles = capacidadesKg.length > 0 ? Math.max(0, Math.min(...capacidadesKg)) : 0;
        const detalleFaltantes = faltantes
            .map((f) => `${f.nombre} (disp: ${redondear3(f.stockActual)} ${f.unidad}, req: ${f.requerido} ${f.unidad})`)
            .join(', ');
        throw new Error(`Stock insuficiente. Faltantes: ${detalleFaltantes}. Puedes producir hasta ${redondear3(maxKgPosibles)} kg con el stock actual.`);
    }

    // Bloqueo y descuento condicional para evitar carreras de stock.
    for (const det of detalleIngredientes) {
        const updateRes = await client.query(
            `UPDATE ingredientes
             SET stock = stock - $1, actualizado_en = NOW()
             WHERE id = $2 AND stock >= $1
             RETURNING id`,
            [det.cantidad_consumida, det.ingrediente_id]
        );
        if (updateRes.rows.length === 0) {
            throw new Error(`No se pudo descontar stock de ${det.ingrediente_nombre} por concurrencia. Intenta nuevamente.`);
        }
    }

    let cantidadFinal = Number(cantidadKg) || 0;
    let unidadFinal = receta.producto_unidad || 'kg';
    let notasProduccion = `Producción: ${redondear3(cantidadKg)} ${unidadFinal} de ${receta.producto_nombre}`;
    if (String(receta.producto_categoria || '').toLowerCase() === 'hamburguesas' || String(receta.producto_nombre || '').toLowerCase().includes('hamburguesa')) {
        const pesoPorUnidad = 0.150;
        cantidadFinal = Math.floor((Number(cantidadKg) || 0) / pesoPorUnidad);
        unidadFinal = 'unidad';
        notasProduccion = `Producción: ${redondear3(cantidadKg)} kg convertidos a ${cantidadFinal} unidades de 150gr de ${receta.producto_nombre}`;
    }

    await client.query(
        `UPDATE productos SET stock = stock + $1, actualizado_en = NOW() WHERE id = $2`,
        [cantidadFinal, receta.producto_id]
    );
    await normalizarProductoFinalPorId(client, receta.producto_id);

    const lote = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(recetaId).padStart(3, '0')}-${Date.now().toString().slice(-5)}`;
    const prodInsert = await client.query(
        `INSERT INTO produccion (
            receta_id, cantidad_lotes, cantidad_producida, costo_total_receta, lote, usuario_proceso, fecha_elaboracion, unidad_producida, notas
         ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8)
         RETURNING *`,
        [recetaId, 1, redondear3(cantidadFinal), redondear3(costoTotalReceta), lote, usuario || 'sistema', unidadFinal, notasProduccion]
    );
    const produccion = prodInsert.rows[0];

    for (const det of detalleIngredientes) {
        await client.query(
            `INSERT INTO produccion_detalle (
                produccion_id, ingrediente_id, ingrediente_nombre, ingrediente_unidad, porcentaje, cantidad_consumida, costo_unitario, costo_total
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
                produccion.id,
                det.ingrediente_id,
                det.ingrediente_nombre,
                det.ingrediente_unidad,
                det.porcentaje,
                det.cantidad_consumida,
                det.costo_unitario,
                det.costo_total
            ]
        );
    }

    return {
        produccion,
        receta,
        costoTotalReceta: redondear3(costoTotalReceta),
        detalleIngredientes
    };
};

// Endpoint para producción directa
app.post('/api/produccion', authenticateToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        if (!req.user) return res.status(401).json({ error: 'Token requerido' });
        await client.query('BEGIN');
        const { receta_id, cantidad } = req.body;
        const recetaIdNum = Number(receta_id);
        const cantidadKg = Number(cantidad);
        if (!Number.isInteger(recetaIdNum) || recetaIdNum <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Receta inválida' });
        }
        if (!Number.isFinite(cantidadKg) || cantidadKg <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cantidad inválida' });
        }

        const resultado = await ejecutarProduccion(client, {
            recetaId: recetaIdNum,
            cantidadKg,
            usuario: req.user?.usuario || 'sistema'
        });
        await client.query('COMMIT');

        res.status(201).json({ 
            mensaje: 'Producción completada exitosamente',
            receta: resultado.receta.nombre,
            producto: resultado.receta.producto_nombre,
            lote: resultado.produccion.lote,
            cantidad_producida: resultado.produccion.cantidad_producida,
            cantidad_lotes: resultado.produccion.cantidad_lotes,
            unidad: resultado.produccion.unidad_producida || resultado.receta.producto_unidad || 'kg',
            costo_total_receta: resultado.costoTotalReceta,
            usuario_proceso: resultado.produccion.usuario_proceso || req.user?.usuario || 'sistema',
            fecha_elaboracion: resultado.produccion.fecha_elaboracion || resultado.produccion.fecha,
            ingredientes_utilizados: resultado.detalleIngredientes.length
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        const status = /inválid|insuficiente|no encontrada|no tiene ingredientes/i.test(String(error.message || '')) ? 400 : 500;
        res.status(status).json({ error: 'Error en el proceso de producción', detalle: error.message });
    } finally {
        client.release();
    }
});

// ============================================
// AUDITORÍA
// ============================================

app.get('/api/auditoria', async (req, res) => {
    try {
        const { tabla, tipo_movimiento, usuario, fecha_inicio, fecha_fin, limite = 100 } = req.query;
        
        let query = 'SELECT * FROM auditoria WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (tabla) {
            query += ` AND tabla = $${paramIndex}`;
            params.push(tabla);
            paramIndex++;
        }
        
        if (tipo_movimiento) {
            query += ` AND tipo_movimiento = $${paramIndex}`;
            params.push(tipo_movimiento);
            paramIndex++;
        }
        
        if (usuario) {
            query += ` AND usuario ILIKE $${paramIndex}`;
            params.push(`%${usuario}%`);
            paramIndex++;
        }
        
        if (fecha_inicio) {
            query += ` AND fecha >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }
        
        if (fecha_fin) {
            query += ` AND fecha <= $${paramIndex}`;
            params.push(fecha_fin + 'T23:59:59');
            paramIndex++;
        }
        
        query += ` ORDER BY fecha DESC LIMIT $${paramIndex}`;
        params.push(limite);
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener auditorías', detalle: error.message });
    }
});

// Endpoint para obtener estadísticas de auditoría
app.get('/api/auditoria/estadisticas', async (req, res) => {
    try {
        const query = `
            SELECT 
                tabla,
                tipo_movimiento,
                COUNT(*) as cantidad,
                DATE(fecha) as fecha,
                usuario
            FROM auditoria 
            WHERE fecha >= NOW() - INTERVAL '30 days'
            GROUP BY tabla, tipo_movimiento, DATE(fecha), usuario
            ORDER BY fecha DESC, cantidad DESC
        `;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas', detalle: error.message });
    }
});

// ============================================
// PRODUCCIÓN
// ============================================

app.post('/api/produccion/fabricar', authenticateToken, async (req, res) => {
    const client = await db.pool.connect();
    try {
        if (!req.user) return res.status(401).json({ error: 'Token requerido' });
        await client.query('BEGIN');
        const { receta_id, cantidad_lotes = 1 } = req.body;
        const recetaIdNum = Number(receta_id);
        const lotes = parseInt(cantidad_lotes);
        if (!Number.isInteger(recetaIdNum) || recetaIdNum <= 0) throw new Error('Receta inválida');
        if (isNaN(lotes) || lotes <= 0) throw new Error('Cantidad de lotes inválida');
        const recetaBase = await client.query('SELECT id, rendimiento FROM recetas WHERE id = $1 AND activa = TRUE', [recetaIdNum]);
        if (recetaBase.rows.length === 0) throw new Error('Receta no encontrada o inactiva');
        const cantidadKg = (Number(recetaBase.rows[0].rendimiento) || 1) * lotes;
        const resultado = await ejecutarProduccion(client, {
            recetaId: recetaIdNum,
            cantidadKg,
            usuario: req.user?.usuario || 'sistema'
        });

        await client.query('COMMIT');
        res.json({
            exito: true,
            mensaje: `✅ Producción exitosa: ${resultado.produccion.cantidad_producida} ${resultado.produccion.unidad_producida || 'unidades'} de ${resultado.receta.producto_nombre}`,
            produccion: { ...resultado.produccion, receta_nombre: resultado.receta.nombre, producto_nombre: resultado.receta.producto_nombre },
            ingredientes_usados: resultado.detalleIngredientes.map((ing) => ({ nombre: ing.ingrediente_nombre, cantidad: ing.cantidad_consumida }))
        });
    } catch (error) {
        await client.query('ROLLBACK');
        const status = /inválid|insuficiente|no encontrada|no tiene ingredientes/i.test(String(error.message || '')) ? 400 : 500;
        res.status(status).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.get('/api/produccion/historial', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, r.nombre as receta_nombre, prod.nombre as producto_nombre, prod.unidad as producto_unidad
            FROM produccion p
            JOIN recetas r ON p.receta_id = r.id
            JOIN productos prod ON r.producto_id = prod.id
            ORDER BY p.fecha DESC LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener historial', detalle: error.message });
    }
});

app.get('/api/produccion/detalle/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const prodResult = await db.query(`
            SELECT p.*, r.nombre as receta_nombre, prod.nombre as producto_nombre, prod.unidad as producto_unidad
            FROM produccion p
            JOIN recetas r ON p.receta_id = r.id
            JOIN productos prod ON r.producto_id = prod.id
            WHERE p.id = $1
            LIMIT 1
        `, [id]);
        if (prodResult.rows.length === 0) return res.status(404).json({ error: 'Producción no encontrada' });

        const detalle = await db.query(`
            SELECT
                id,
                ingrediente_id,
                ingrediente_nombre,
                ingrediente_unidad,
                porcentaje,
                cantidad_consumida,
                ROUND(cantidad_consumida * 1000, 3) as gramos,
                costo_unitario,
                costo_total
            FROM produccion_detalle
            WHERE produccion_id = $1
            ORDER BY id ASC
        `, [id]);

        const produccion = prodResult.rows[0];
        res.json({
            produccion,
            costo_total_receta: produccion.costo_total_receta || 0,
            ingredientes: detalle.rows
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar detalle de producción', detalle: error.message });
    }
});

app.get('/api/produccion/config-proteinas', async (req, res) => {
    try {
        const result = await db.query('SELECT id, patron, descripcion, activo, creado_en, actualizado_en FROM produccion_config_proteinas ORDER BY patron ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener configuración de proteínas', detalle: error.message });
    }
});

app.post('/api/produccion/config-proteinas', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const patron = String(req.body?.patron || '').trim().toLowerCase();
        const descripcion = String(req.body?.descripcion || '').trim() || null;
        const activo = req.body?.activo !== false;
        if (!patron) return res.status(400).json({ error: 'Patrón requerido' });
        const result = await db.query(
            `INSERT INTO produccion_config_proteinas (patron, descripcion, activo)
             VALUES ($1, $2, $3)
             RETURNING id, patron, descripcion, activo, creado_en, actualizado_en`,
            [patron, descripcion, activo]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (String(error.message || '').includes('duplicate key')) {
            return res.status(409).json({ error: 'Ese patrón ya existe' });
        }
        res.status(500).json({ error: 'Error al crear patrón', detalle: error.message });
    }
});

app.put('/api/produccion/config-proteinas/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const patron = req.body?.patron !== undefined ? String(req.body.patron || '').trim().toLowerCase() : null;
        const descripcion = req.body?.descripcion !== undefined ? String(req.body.descripcion || '').trim() : null;
        const activo = req.body?.activo;
        const result = await db.query(
            `UPDATE produccion_config_proteinas
             SET patron = COALESCE($1, patron),
                 descripcion = COALESCE($2, descripcion),
                 activo = COALESCE($3, activo),
                 actualizado_en = NOW()
             WHERE id = $4
             RETURNING id, patron, descripcion, activo, creado_en, actualizado_en`,
            [patron && patron.length > 0 ? patron : null, descripcion, activo !== undefined ? Boolean(activo) : null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Patrón no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar patrón', detalle: error.message });
    }
});

app.delete('/api/produccion/config-proteinas/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const result = await db.query('DELETE FROM produccion_config_proteinas WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Patrón no encontrado' });
        res.json({ mensaje: 'Patrón eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar patrón', detalle: error.message });
    }
});

// ============================================
// VENTAS
// ============================================

app.post('/api/ventas', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { cliente_id, cliente_nombre, items, moneda, tasa_cambio, tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento } = req.body;
        if (!items || items.length === 0) throw new Error('La venta debe tener al menos un producto');

        for (const item of items) {
            const stockResult = await client.query('SELECT stock, nombre FROM productos WHERE id = $1 AND activa = TRUE', [item.producto_id]);
            if (stockResult.rows.length === 0) throw new Error(`Producto ID ${item.producto_id} no encontrado`);
            const { stock, nombre } = stockResult.rows[0];
            if (stock < item.cantidad) throw new Error(`Stock insuficiente para "${nombre}". Disponible: ${stock}, Solicitado: ${item.cantidad}`);
        }

        const total = items.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
        
        // Lógica corregida: si el estado es pendiente o parcial, debe ser crédito
        const esCredito = tipo_venta === 'credito' || (tipo_venta === 'inmediato' && !metodo_pago);
        const estado_pago = esCredito ? 'pendiente' : 'pagado';
        const monto_pagado = esCredito ? 0 : total;
        const saldo_pendiente = esCredito ? total : 0;
        const total_ves = (moneda === 'VES' && tasa_cambio) ? total : null;

        const ventaResult = await client.query(
            `INSERT INTO ventas (cliente_id, cliente_nombre, total, total_ves, moneda_original, tasa_cambio_usada, tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento, estado_pago, monto_pagado, saldo_pendiente)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [cliente_id || null, cliente_nombre || 'Cliente general', total, total_ves, moneda || 'USD', tasa_cambio || 1, tipo_venta || 'inmediato', metodo_pago || null, referencia_pago || null, fecha_vencimiento || null, estado_pago, monto_pagado, saldo_pendiente]
        );
        const ventaId = ventaResult.rows[0].id;

        for (const item of items) {
            console.log('🔍 DEBUG - Item de venta:', {
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                tipo_cantidad: typeof item.cantidad,
                precio_unitario: item.precio_unitario,
                item_completo: item
            });
            
            // Convertir cantidad a número y validar
            const cantidadNumerica = parseFloat(item.cantidad) || 0;
            console.log('🔢 Cantidad convertida:', cantidadNumerica, 'tipo:', typeof cantidadNumerica);
            
            if (cantidadNumerica <= 0) {
                console.warn('⚠️ Cantidad inválida, saltando item:', item);
                continue;
            }
            
            await client.query(
                `INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total_linea, precio_moneda_original, moneda_original)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [ventaId, item.producto_id, cantidadNumerica, item.precio_unitario, cantidadNumerica * item.precio_unitario, item.precio_unitario, moneda || 'USD']
            );
            
            // Verificar stock antes de descontar
            const stockAntes = await client.query(`SELECT stock, nombre FROM productos WHERE id = $1`, [item.producto_id]);
            console.log('📦 Stock ANTES de descontar:', stockAntes.rows[0]);
            
            await client.query(`UPDATE productos SET stock = stock - $1, actualizado_en = NOW() WHERE id = $2`, [cantidadNumerica, item.producto_id]);
            await normalizarProductoFinalPorId(client, item.producto_id);
            
            // Verificar stock después de descontar
            const stockDespues = await client.query(`SELECT stock, nombre FROM productos WHERE id = $1`, [item.producto_id]);
            console.log('📦 Stock DESPUÉS de descontar:', stockDespues.rows[0]);
        }

        await client.query('COMMIT');
        res.status(201).json({
            exito: true,
            mensaje: esCredito ? 'Venta a credito registrada' : 'Venta registrada correctamente',
            venta: ventaResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

app.post('/api/ventas/:id/pagos', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { monto_ves, metodo_pago, referencia_pago, tasa_cambio, moneda_original, monto_original } = req.body;
        
        console.log('🔍 Backend recibiendo abono:', {
            id,
            monto_ves,
            metodo_pago,
            referencia_pago,
            tasa_cambio,
            body: req.body
        });
        
        const monto = parseFloat(monto_ves);
        if (isNaN(monto) || monto <= 0) throw new Error('Monto invalido');

        const ventaResult = await client.query('SELECT * FROM ventas WHERE id = $1', [id]);
        if (ventaResult.rows.length === 0) throw new Error('Venta no encontrada');
        const venta = ventaResult.rows[0];
        
        console.log('🔍 TODOS los campos de la venta:', venta);
        
        const totalVenta = parseFloat(venta.total) || 0;
        const montoPagadoActual = parseFloat(venta.monto_pagado) || 0;
        const saldoPendienteOriginal = parseFloat(venta.saldo_pendiente) || 0;
        
        console.log('🔍 Valores extraídos:', {
            totalVenta,
            montoPagadoActual,
            saldoPendienteOriginal,
            moneda_original: venta.moneda_original,
            total_ves: venta.total_ves,
            tasa_cambio_usada: venta.tasa_cambio_usada
        });
        
        // Determinar moneda y tasa de cambio vigente desde tabla de tasas
        const monedaOriginal = venta.moneda_original || 'USD';
        const tasaActivaResult = await client.query(
            'SELECT tasa_bcv FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC, id DESC LIMIT 1'
        );
        const tasaTabla = tasaActivaResult.rows.length > 0
            ? parseFloat(tasaActivaResult.rows[0].tasa_bcv)
            : NaN;
        const tasaCambio = Number.isFinite(tasaTabla) && tasaTabla > 0
            ? tasaTabla
            : (parseFloat(tasa_cambio) || parseFloat(venta.tasa_cambio_usada) || 40);
        
        console.log('🔍 Moneda y tasa:', { monedaOriginal, tasaCambio });
        
        // Convertir saldo pendiente a VES
        let saldoActualEnVES;
        if (monedaOriginal === 'USD') {
            saldoActualEnVES = saldoPendienteOriginal * tasaCambio;
        } else {
            saldoActualEnVES = saldoPendienteOriginal;
        }
        
        console.log('🔍 Conversión:', {
            saldoPendienteOriginal,
            monedaOriginal,
            tasaCambio,
            saldoActualEnVES
        });
        
        if (saldoActualEnVES <= 0.001) throw new Error('Esta venta ya esta completamente pagada');
        const montoAplicar = Math.min(monto, saldoActualEnVES + 0.02);
        if (montoAplicar <= 0) throw new Error('Monto invalido');

        const nuevoSaldo = Math.max(0, saldoActualEnVES - montoAplicar);
        const nuevoEstado = nuevoSaldo <= 0.001 ? 'pagado' : 'parcial';
        const nuevoMontoPagado = montoPagadoActual + montoAplicar;
        
        // Convertir el nuevo saldo de vuelta a la moneda original para guardarlo
        let nuevoSaldoParaGuardar;
        if (venta.moneda_original === 'USD') {
            nuevoSaldoParaGuardar = nuevoSaldo / tasaCambio;
        } else {
            nuevoSaldoParaGuardar = nuevoSaldo;
        }
        
        console.log('🔍 Actualizando venta:', {
            nuevoSaldoEnVES: nuevoSaldo,
            nuevoSaldoParaGuardar: nuevoSaldoParaGuardar,
            nuevoEstado,
            nuevoMontoPagado
        });

        await client.query(
            `UPDATE ventas SET saldo_pendiente = $1, estado_pago = $2, monto_pagado = $3, actualizado_en = NOW() WHERE id = $4`,
            [nuevoSaldoParaGuardar, nuevoEstado, nuevoMontoPagado, id]
        );
        const montoOriginalNum = parseFloat(monto_original);
        const montoOriginalRegistro = Number.isFinite(montoOriginalNum) && montoOriginalNum > 0
            ? montoOriginalNum
            : (monedaOriginal === 'USD' ? (montoAplicar / tasaCambio) : montoAplicar);
        const montoBsRegistro = Number(montoAplicar.toFixed(2));
        const montoUsdRegistro = Number((montoAplicar / Math.max(tasaCambio, 1)).toFixed(2));
        await client.query(
            `INSERT INTO venta_pagos (venta_id, monto, monto_ves, monto_bs, monto_usd, metodo_pago, referencia_pago, tasa_cambio, moneda_original, monto_original)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [id, montoAplicar, montoAplicar, montoBsRegistro, montoUsdRegistro, metodo_pago, referencia_pago || null, tasaCambio, monedaOriginal, montoOriginalRegistro]
        );

        await client.query('COMMIT');
        console.log('✅ Abono procesado correctamente:', { nuevoSaldoEnVES: nuevoSaldo, nuevoSaldoParaGuardar, nuevoEstado, nuevoMontoPagado });
        res.json({ mensaje: `Abono registrado. Saldo pendiente: ${nuevoSaldoParaGuardar.toFixed(2)}`, saldo_pendiente: nuevoSaldoParaGuardar, estado_pago: nuevoEstado });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error en abono:', error.message);
        console.error('❌ Detalles del error:', error);
        res.status(400).json({ error: error.message, debug: 'Error en procesamiento de abono' });
    } finally {
        client.release();
    }
});

// ============================================
// ESTADOS DE VENTA
// ============================================

// Obtener todos los estados de venta
app.get('/api/estados-venta', async (req, res) => {
    try {
        // Primero verificar si existe la tabla estados_venta
        const tableExists = await db.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'sistema_artesanal' 
            AND table_name = 'estados_venta'
        `);

        if (tableExists.rows[0].count === 0) {
            // Si no existe la tabla, crearla
            await db.query(`
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
                )
            `);

            // Insertar estados básicos
            await db.query(`
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
                    updated_at = CURRENT_TIMESTAMP
            `);
        }

        // Obtener todos los estados activos
        const result = await db.query(`
            SELECT * FROM estados_venta 
            WHERE activo = TRUE 
            ORDER BY orden ASC
        `);

        res.json({
            success: true,
            data: result.rows,
            message: 'Estados obtenidos correctamente'
        });

    } catch (error) {
        console.error('Error al obtener estados:', error);
        res.status(500).json({ 
            error: 'Error al obtener estados de venta',
            details: error.message 
        });
    }
});

app.get('/api/ventas', async (req, res) => {
    try {
        const { periodo, fecha_inicio, fecha_fin, tipo_venta, estado_pago, cliente_id, limit = 50 } = req.query;
        
        let query = `
            SELECT v.id, v.fecha, v.cliente_id, v.cliente_nombre, v.total, v.total_ves,
                v.moneda_original, v.tasa_cambio_usada, v.tipo_venta, v.metodo_pago,
                v.referencia_pago, v.fecha_vencimiento, v.estado_pago, v.monto_pagado, v.saldo_pendiente,
                c.nombre as cliente_nombre_completo, c.telefono as cliente_telefono
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Agregar filtros
        if (tipo_venta) {
            query += ` AND v.tipo_venta = $${paramIndex}`;
            params.push(tipo_venta);
            paramIndex++;
        }
        
        if (estado_pago) {
            query += ` AND v.estado_pago = $${paramIndex}`;
            params.push(estado_pago);
            paramIndex++;
        }
        
        if (cliente_id) {
            query += ` AND v.cliente_id = $${paramIndex}`;
            params.push(cliente_id);
            paramIndex++;
        }
        
        if (periodo === 'dia') {
            const fecha = fecha_inicio || new Date().toISOString().split('T')[0];
            query += ` AND DATE(v.fecha) = DATE($${paramIndex})`;
            params.push(fecha);
            paramIndex++;
        } else if (periodo === 'semana') {
            if (fecha_inicio && fecha_fin) {
                query += ` AND v.fecha >= $${paramIndex} AND v.fecha <= $${paramIndex}`;
                params.push(fecha_inicio, fecha_fin);
                paramIndex++;
            } else {
                const semanaAtras = new Date();
                semanaAtras.setDate(semanaAtras.getDate() - 7);
                query += ` AND v.fecha >= $${paramIndex}`;
                params.push(semanaAtras.toISOString().split('T')[0]);
                paramIndex++;
            }
        } else if (periodo === 'mes') {
            if (fecha_inicio && fecha_fin) {
                query += ` AND v.fecha >= $${paramIndex} AND v.fecha <= $${paramIndex}`;
                params.push(fecha_inicio, fecha_fin);
                paramIndex++;
            } else {
                const mesAtras = new Date();
                mesAtras.setMonth(mesAtras.getMonth() - 1);
                query += ` AND v.fecha >= $${paramIndex}`;
                params.push(mesAtras.toISOString().split('T')[0]);
                paramIndex++;
            }
        } else if (fecha_inicio) {
            query += ` AND v.fecha >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        } else if (fecha_fin) {
            query += ` AND v.fecha <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }
        
        query += ` ORDER BY v.fecha DESC LIMIT $${paramIndex}`;
        params.push(limit);
        
        const result = await db.query(query, params);
        
        // Obtener los detalles de cada venta por separado
        const ventasConDetalles = await Promise.all(
            result.rows.map(async (venta) => {
                const detalles = await db.query(`
                    SELECT vd.producto_id, vd.cantidad, vd.precio_unitario, vd.total_linea,
                           p.nombre as producto_nombre, p.unidad as producto_unidad
                    FROM venta_detalles vd
                    LEFT JOIN productos p ON vd.producto_id = p.id
                    WHERE vd.venta_id = $1
                    ORDER BY vd.id
                `, [venta.id]);
                
                return {
                    ...venta,
                    items: detalles.rows
                };
            })
        );
        
        res.json(ventasConDetalles);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ventas', detalle: error.message });
    }
});

app.put('/api/ventas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento, estado_pago, saldo_pendiente } = req.body;
        const ventaActual = await db.query('SELECT tipo_venta, estado_pago, fecha, total FROM ventas WHERE id = $1', [id]);
        if (ventaActual.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });
        const { tipo_venta: tipoActual, estado_pago: estadoActual, fecha, total } = ventaActual.rows[0];
        const diffDias = (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24);
        if (estadoActual === 'pagado' && diffDias > 5) return res.status(400).json({ error: 'No se puede editar una venta pagada con mas de 5 dias de antiguedad' });
        const cambiaAcredito = tipo_venta === 'credito' && tipoActual === 'inmediato' && estadoActual === 'pagado';
        const totalNum = parseFloat(total) || 0;
        let result;
        
        // Si se está devolviendo a pendiente, actualizar los campos correspondientes
        if (estado_pago === 'pendiente') {
            result = await db.query(
                'UPDATE ventas SET tipo_venta=COALESCE($1,tipo_venta), metodo_pago=NULL, referencia_pago=NULL, fecha_vencimiento=COALESCE($2,fecha_vencimiento), estado_pago=$3, monto_pagado=0, saldo_pendiente=COALESCE($4,$5), actualizado_en=NOW() WHERE id=$6 RETURNING *',
                [tipo_venta, fecha_vencimiento, estado_pago, saldo_pendiente, totalNum, id]
            );
        } else if (cambiaAcredito) {
            result = await db.query(
                'UPDATE ventas SET tipo_venta=$1, metodo_pago=NULL, referencia_pago=NULL, fecha_vencimiento=COALESCE($2,fecha_vencimiento), estado_pago=\'pendiente\', monto_pagado=0, saldo_pendiente=$3, actualizado_en=NOW() WHERE id=$4 RETURNING *',
                [tipo_venta, fecha_vencimiento, totalNum, id]
            );
        } else {
            result = await db.query(
                'UPDATE ventas SET tipo_venta=COALESCE($1,tipo_venta), metodo_pago=COALESCE($2,metodo_pago), referencia_pago=COALESCE($3,referencia_pago), fecha_vencimiento=COALESCE($4,fecha_vencimiento), estado_pago=COALESCE($5,estado_pago), actualizado_en=NOW() WHERE id=$6 RETURNING *',
                [tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento, estado_pago, id]
            );
        }
        res.json({ mensaje: 'Venta actualizada correctamente', venta: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar venta', detalle: error.message });
    }
});

// Endpoint específico para devolver venta a pedidos (usando solo campos existentes)
app.put('/api/ventas/:id/devolver-a-pedidos', async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { id } = req.params;
        console.log('🔄 Devolver venta a pedidos ID:', id);

        await client.query('BEGIN');

        // 1) Validar venta y obtener sus datos
        const ventaActual = await client.query(
            `SELECT id, cliente_id, cliente_nombre, estado_pago, total, monto_pagado, saldo_pendiente, fecha_vencimiento
             FROM ventas WHERE id = $1`,
            [id]
        );
        if (ventaActual.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        const venta = ventaActual.rows[0];

        // 2) Obtener detalle de la venta para crear/restaurar pedido
        const detalleVenta = await client.query(
            `SELECT producto_id, cantidad
             FROM venta_detalles
             WHERE venta_id = $1
             ORDER BY id ASC`,
            [id]
        );
        if (detalleVenta.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'La venta no tiene detalles para devolver a pedidos' });
        }

        // 3) Buscar si ya existe pedido vinculado a esta venta
        let pedidoId = null;
        const pedidoExistente = await client.query(
            `SELECT id FROM pedidos WHERE venta_id = $1 ORDER BY id DESC LIMIT 1`,
            [id]
        );

        if (pedidoExistente.rows.length > 0) {
            pedidoId = pedidoExistente.rows[0].id;

            // Restaurar pedido existente
            await client.query(
                `UPDATE pedidos
                 SET estado = 'pendiente',
                     venta_id = NULL,
                     actualizado_en = NOW()
                 WHERE id = $1`,
                [pedidoId]
            );
            await client.query(`DELETE FROM pedido_items WHERE pedido_id = $1`, [pedidoId]);
        } else {
            const pedidoNotas = `Devuelto desde venta #${id} el ${new Date().toISOString()}`;
            const nuevoPedido = await client.query(
                `INSERT INTO pedidos (cliente_id, cliente_nombre, notas, estado, venta_id)
                 VALUES ($1, $2, $3, 'pendiente', NULL)
                 RETURNING id`,
                [venta.cliente_id || null, venta.cliente_nombre || 'Cliente general', pedidoNotas]
            );
            pedidoId = nuevoPedido.rows[0].id;
        }

        // 4) Cargar items del pedido desde la venta
        for (const item of detalleVenta.rows) {
            await client.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado)
                 VALUES ($1, $2, $3, 0, 0)`,
                [pedidoId, item.producto_id, item.cantidad]
            );
        }

        // 5) Marcar venta como devuelta
        const result = await client.query(
            `UPDATE ventas SET
                total = 0,
                monto_pagado = 0,
                saldo_pendiente = 0,
                estado_pago = 'devuelta_a_pedidos',
                actualizado_en = NOW()
             WHERE id = $1
             RETURNING id, estado_pago, total, monto_pagado, saldo_pendiente, actualizado_en`,
            [id]
        );
        const ventaDespues = result.rows[0];

        if (!ventaDespues || ventaDespues.estado_pago !== 'devuelta_a_pedidos') {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'No se pudo actualizar el estado de la venta' });
        }

        await client.query('COMMIT');

        res.json({
            mensaje: 'Venta devuelta a pedidos correctamente',
            pedido_id: pedidoId,
            ventaDevuelta: {
                id: ventaDespues.id,
                estado: ventaDespues.estado_pago,
                total: ventaDespues.total,
                monto_pagado: ventaDespues.monto_pagado,
                saldo_pendiente: ventaDespues.saldo_pendiente,
                actualizado_en: ventaDespues.actualizado_en
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ ERROR al devolver venta a pedidos:', error);
        res.status(500).json({ error: 'Error al devolver venta a pedidos', detalle: error.message });
    } finally {
        client.release();
    }
});

app.delete('/api/ventas/:id', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const detalles = await client.query('SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = $1', [id]);
        for (const item of detalles.rows) {
            await client.query('UPDATE productos SET stock = stock + $1, actualizado_en = NOW() WHERE id = $2', [item.cantidad, item.producto_id]);
            await normalizarProductoFinalPorId(client, item.producto_id);
        }
        await client.query('DELETE FROM venta_detalles WHERE venta_id = $1', [id]);
        const result = await client.query('DELETE FROM ventas WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        await client.query('COMMIT');
        res.json({ mensaje: 'Venta anulada y stock devuelto', venta: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error al anular venta', detalle: error.message });
    } finally {
        client.release();
    }
});

app.get('/api/ventas/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Query principal sin pagos
        const result = await db.query(`
            SELECT
                v.*,
                c.nombre as cliente_nombre_completo,
                c.telefono as cliente_telefono,
                c.email as cliente_email,
                COALESCE((
                    SELECT json_agg(
                        json_build_object(
                            'producto_id', vd.producto_id,
                            'cantidad', vd.cantidad,
                            'precio_unitario', vd.precio_unitario,
                            'total_linea', vd.total_linea,
                            'producto_nombre', p.nombre,
                            'producto_unidad', p.unidad
                        ) ORDER BY vd.id
                    )
                    FROM venta_detalles vd
                    LEFT JOIN productos p ON vd.producto_id = p.id
                    WHERE vd.venta_id = v.id
                ), '[]'::json) as items
            FROM ventas v
            LEFT JOIN clientes c ON v.cliente_id = c.id
            WHERE v.id = $1
        `, [id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Venta no encontrada' });

        const venta = result.rows[0];

        // Query de pagos por separado para no romper si la tabla no existe
        let pagos = [];
        try {
            const pagosResult = await db.query(`
                SELECT id, fecha, monto, monto_ves, monto_bs, monto_usd, metodo_pago, referencia_pago, tasa_cambio, moneda_original, monto_original
                FROM venta_pagos
                WHERE venta_id = $1
                ORDER BY fecha ASC
            `, [id]);
            pagos = pagosResult.rows;
        } catch (e) {
            console.error('Error al obtener pagos (tabla puede no existir):', e.message);
        }

        res.json({ ...venta, pagos });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener venta', detalle: error.message });
    }
});

// ============================================
// ESTADO DE CUENTA
// ============================================

app.get('/api/estado-cuenta', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                c.id,
                c.nombre,
                c.telefono,
                c.email,
                COUNT(v.id) as ventas_pendientes,
                COALESCE(SUM(v.saldo_pendiente), 0) as saldo_pendiente_usd,
                COALESCE(SUM(v.monto_pagado), 0) as total_pagado,
                COUNT(CASE WHEN v.fecha_vencimiento < NOW() AND v.estado_pago != 'pagado' THEN 1 END) as ventas_vencidas
            FROM clientes c
            INNER JOIN ventas v ON c.id = v.cliente_id
            WHERE v.tipo_venta = 'credito'
            GROUP BY c.id, c.nombre, c.telefono, c.email
            ORDER BY saldo_pendiente_usd DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estado de cuenta', detalle: error.message });
    }
});

app.post('/api/estado-cuenta/enviar-general-email', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                c.id,
                c.nombre,
                c.email,
                COALESCE(SUM(v.total), 0) AS total_ventas,
                COALESCE(SUM(v.saldo_pendiente), 0) AS saldo_pendiente
            FROM clientes c
            INNER JOIN ventas v ON c.id = v.cliente_id
            WHERE c.email IS NOT NULL
              AND TRIM(c.email) <> ''
            GROUP BY c.id, c.nombre, c.email
            HAVING COALESCE(SUM(v.saldo_pendiente), 0) > 0
            ORDER BY c.nombre
        `);

        if (!result.rows.length) {
            return res.json({ mensaje: 'No hay clientes con saldo pendiente y correo registrado', enviados: 0, errores: [] });
        }

        const transporter = createMailTransporter();
        const enviados = [];
        const errores = [];

        for (const cliente of result.rows) {
            const totalVentas = parseFloat(cliente.total_ventas) || 0;
            const saldoPendiente = parseFloat(cliente.saldo_pendiente) || 0;
            const totalPagado = Math.max(0, totalVentas - saldoPendiente);
            const porcentajePagado = totalVentas > 0 ? ((totalPagado / totalVentas) * 100) : 0;

            const subject = `Estado de cuenta - ${cliente.nombre}`;
            const text = [
                `Estimado(a) ${cliente.nombre},`,
                '',
                'Este es su estado de cuenta general:',
                `- Total ventas: $${totalVentas.toFixed(2)}`,
                `- Total pagado: $${totalPagado.toFixed(2)}`,
                `- Saldo pendiente: $${saldoPendiente.toFixed(2)}`,
                `- Porcentaje pagado: ${porcentajePagado.toFixed(1)}%`,
                '',
                'Gracias por su confianza.',
                'AgroMAE'
            ].join('\n');

            try {
                await transporter.sendMail({
                    from: MAIL_FROM,
                    to: cliente.email,
                    subject,
                    text
                });
                enviados.push({ cliente_id: cliente.id, nombre: cliente.nombre, email: cliente.email });
            } catch (e) {
                errores.push({ cliente_id: cliente.id, nombre: cliente.nombre, email: cliente.email, error: e.message });
            }
        }

        res.json({
            mensaje: `Correos enviados: ${enviados.length}${errores.length ? ` | Errores: ${errores.length}` : ''}`,
            enviados: enviados.length,
            errores
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar correos de estado de cuenta', detalle: error.message });
    }
});

app.post('/api/estado-cuenta/:cliente_id/enviar-email', async (req, res) => {
    try {
        const { cliente_id } = req.params;
        const clienteResult = await db.query(
            `SELECT id, nombre, email FROM clientes WHERE id = $1`,
            [cliente_id]
        );
        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        const cliente = clienteResult.rows[0];
        if (!cliente.email || !String(cliente.email).trim()) {
            return res.status(400).json({ error: 'El cliente no tiene correo registrado' });
        }

        const resumenResult = await db.query(`
            SELECT
                COALESCE(SUM(v.total), 0) AS total_ventas,
                COALESCE(SUM(v.saldo_pendiente), 0) AS saldo_pendiente
            FROM ventas v
            WHERE v.cliente_id = $1
        `, [cliente_id]);

        const totalVentas = parseFloat(resumenResult.rows[0]?.total_ventas) || 0;
        const saldoPendiente = parseFloat(resumenResult.rows[0]?.saldo_pendiente) || 0;
        const totalPagado = Math.max(0, totalVentas - saldoPendiente);
        const porcentajePagado = totalVentas > 0 ? ((totalPagado / totalVentas) * 100) : 0;

        const ventasPendientesResult = await db.query(`
            SELECT id, fecha, total, saldo_pendiente, estado_pago
            FROM ventas
            WHERE cliente_id = $1 AND saldo_pendiente > 0
            ORDER BY fecha ASC, id ASC
        `, [cliente_id]);

        const detallePendientes = ventasPendientesResult.rows.length > 0
            ? ventasPendientesResult.rows.map(v => {
                const fecha = new Date(v.fecha).toLocaleDateString('es-ES');
                const total = parseFloat(v.total) || 0;
                const saldo = parseFloat(v.saldo_pendiente) || 0;
                return `- Venta #${v.id} (${fecha}) | Total: $${total.toFixed(2)} | Saldo: $${saldo.toFixed(2)} | Estado: ${v.estado_pago}`;
            }).join('\n')
            : '- Sin ventas pendientes';

        const subject = `Estado de cuenta - ${cliente.nombre}`;
        const text = [
            `Estimado(a) ${cliente.nombre},`,
            '',
            'Este es su estado de cuenta:',
            `- Total ventas: $${totalVentas.toFixed(2)}`,
            `- Total pagado: $${totalPagado.toFixed(2)}`,
            `- Saldo pendiente: $${saldoPendiente.toFixed(2)}`,
            `- Porcentaje pagado: ${porcentajePagado.toFixed(1)}%`,
            '',
            'Detalle de ventas pendientes:',
            detallePendientes,
            '',
            'Gracias por su confianza.',
            'AgroMAE'
        ].join('\n');

        const transporter = createMailTransporter();
        await transporter.sendMail({
            from: MAIL_FROM,
            to: cliente.email,
            subject,
            text
        });

        res.json({
            mensaje: `Correo enviado a ${cliente.nombre} (${cliente.email})`,
            cliente: {
                id: cliente.id,
                nombre: cliente.nombre,
                email: cliente.email
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al enviar correo del cliente', detalle: error.message });
    }
});

app.get('/api/estado-cuenta/:cliente_id', async (req, res) => {
    try {
        const { cliente_id } = req.params;
        const clienteResult = await db.query('SELECT * FROM clientes WHERE id = $1', [cliente_id]);
        if (clienteResult.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });

        // Obtener TODAS las ventas del cliente (inmediatas + crédito)
        const todasLasVentasResult = await db.query(`
            SELECT v.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'producto_id', vd.producto_id,
                            'cantidad', vd.cantidad,
                            'precio_unitario', vd.precio_unitario,
                            'total_linea', vd.total_linea,
                            'producto_nombre', p.nombre,
                            'producto_unidad', p.unidad
                        ) ORDER BY vd.id
                    ) FILTER (WHERE vd.id IS NOT NULL),
                    '[]'
                ) as items
            FROM ventas v
            LEFT JOIN venta_detalles vd ON v.id = vd.venta_id
            LEFT JOIN productos p ON vd.producto_id = p.id
            WHERE v.cliente_id = $1
            GROUP BY v.id
            ORDER BY v.fecha DESC
        `, [cliente_id]);

        // Obtener todos los pagos del cliente
        const pagosResult = await db.query(
            `SELECT * FROM venta_pagos WHERE venta_id IN (SELECT id FROM ventas WHERE cliente_id = $1) ORDER BY fecha DESC`,
            [cliente_id]
        );

        // Calcular resumen completo basado en TODAS las ventas
        const resumenResult = await db.query(`
            SELECT 
                COUNT(*) as total_ventas,
                COUNT(CASE WHEN tipo_venta = 'credito' THEN 1 END) as total_ventas_credito,
                COUNT(CASE WHEN tipo_venta = 'inmediato' THEN 1 END) as total_ventas_inmediato,
                COUNT(CASE WHEN estado_pago = 'pagado' THEN 1 END) as total_ventas_pagadas,
                COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as total_ventas_pendientes,
                COUNT(CASE WHEN estado_pago = 'parcial' THEN 1 END) as total_ventas_parciales,
                COALESCE(SUM(total), 0) as total_ventas_monto,
                COALESCE(SUM(monto_pagado), 0) as total_pagado,
                COALESCE(SUM(saldo_pendiente), 0) as saldo_pendiente,
                COUNT(CASE WHEN tipo_venta = 'credito' AND fecha_vencimiento < NOW() AND estado_pago != 'pagado' THEN 1 END) as ventas_vencidas
            FROM ventas 
            WHERE cliente_id = $1
        `, [cliente_id]);

        const resumen = resumenResult.rows[0];
        
        // Separar ventas por tipo para mejor visualización
        const ventasInmediatas = todasLasVentasResult.rows.filter(v => v.tipo_venta === 'inmediato');
        const ventasCredito = todasLasVentasResult.rows.filter(v => v.tipo_venta === 'credito');
        const ventasPendientes = todasLasVentasResult.rows.filter(v => v.estado_pago !== 'pagado');
        
        res.json({
            cliente: clienteResult.rows[0],
            todas_las_ventas: todasLasVentasResult.rows,
            ventas_inmediatas: ventasInmediatas,
            ventas_credito: ventasCredito,
            ventas_pendientes: ventasPendientes,
            historial_pagos: pagosResult.rows,
            resumen: {
                total_ventas: parseInt(resumen.total_ventas) || 0,
                total_ventas_credito: parseInt(resumen.total_ventas_credito) || 0,
                total_ventas_inmediato: parseInt(resumen.total_ventas_inmediato) || 0,
                total_ventas_pagadas: parseInt(resumen.total_ventas_pagadas) || 0,
                total_ventas_pendientes: parseInt(resumen.total_ventas_pendientes) || 0,
                total_ventas_parciales: parseInt(resumen.total_ventas_parciales) || 0,
                total_ventas_monto: parseFloat(resumen.total_ventas_monto) || 0,
                total_pagado: parseFloat(resumen.total_pagado) || 0,
                saldo_pendiente: parseFloat(resumen.saldo_pendiente) || 0,
                ventas_vencidas: parseInt(resumen.ventas_vencidas) || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estado de cuenta', detalle: error.message });
    }
});

// ============================================
// CLIENTES
// ============================================

app.get('/api/clientes', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM clientes ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener clientes', detalle: error.message });
    }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, telefono, email, direccion, notas } = req.body;
        const result = await db.query(
            `INSERT INTO clientes (nombre, telefono, email, direccion, notas) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [nombre, telefono || null, email || null, direccion || null, notas || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear cliente', detalle: error.message });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono, email, direccion, notas, categoria } = req.body;
        const result = await db.query(
            `UPDATE clientes SET nombre=COALESCE($1,nombre), telefono=COALESCE($2,telefono), email=COALESCE($3,email), direccion=COALESCE($4,direccion), notas=COALESCE($5,notas), categoria=COALESCE($6,categoria), actualizado_en=NOW() WHERE id=$7 RETURNING *`,
            [nombre, telefono, email, direccion, notas, categoria, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar cliente', detalle: error.message });
    }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM clientes WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
        res.json({ mensaje: 'Cliente eliminado correctamente', cliente: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar cliente', detalle: error.message });
    }
});

// ============================================
// PEDIDOS
// ============================================

app.get('/api/pedidos', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, c.nombre as cliente_nombre_rel,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pd.id,
                               'producto_id', pd.producto_id,
                               'producto_nombre', pr.nombre,
                               'cantidad_pedida', pd.cantidad_pedida,
                               'cantidad_entregada', pd.cantidad_entregada,
                               'peso_entregado', pd.peso_entregado,
                               'unidad', pr.unidad
                           ) ORDER BY pd.id
                       ) FILTER (WHERE pd.id IS NOT NULL),
                       '[]'::json
                   ) as items,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pp.id,
                               'monto', pp.monto,
                               'metodo_pago', pp.metodo_pago,
                               'referencia_pago', pp.referencia_pago,
                               'fecha', pp.fecha
                           ) ORDER BY pp.fecha DESC
                       ) FILTER (WHERE pp.id IS NOT NULL),
                       '[]'::json
                   ) as pagos
            FROM pedidos p
            LEFT JOIN clientes c ON p.cliente_id = c.id
            LEFT JOIN pedido_items pd ON pd.pedido_id = p.id
            LEFT JOIN productos pr ON pd.producto_id = pr.id
            LEFT JOIN pedido_pagos pp ON pp.pedido_id = p.id
            GROUP BY p.id, c.nombre
            ORDER BY p.creado_en DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pedidos', detalle: error.message });
    }
});

app.post('/api/pedidos', async (req, res) => {
    try {
        const { cliente_id, cliente_nombre, items, notas, fecha_entrega } = req.body;
        if (!items || items.length === 0) return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });

        // Crear pedido sin cálculos de costo
        const pedido = await db.query(
            `INSERT INTO pedidos (cliente_id, cliente_nombre, notas, fecha_entrega, estado, estado_procesamiento)
             VALUES ($1, $2, $3, $4, 'pendiente', 'pendiente') RETURNING *`,
            [cliente_id || null, cliente_nombre || '', notas || '', fecha_entrega || null]
        );
        const pedidoId = pedido.rows[0].id;

        // Insertar items del pedido sin precio_unitario
        for (const item of items) {
            await db.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado)
                 VALUES ($1, $2, $3, 0, 0)`,
                [pedidoId, item.producto_id, item.cantidad_pedida]
            );
        }
        res.status(201).json(pedido.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear pedido', detalle: error.message });
    }
});

// Pedido público desde catálogo (sin login)
app.post('/api/public/pedidos', publicRateLimit, async (req, res) => {
    try {
        const { cliente, items, notas, turnstileToken } = req.body || {};
        const nombre = normalizeName(cliente?.nombre);
        const telefono = normalizePhone(cliente?.telefono);
        const email = normalizeEmail(cliente?.email);

        if (!nombre) return res.status(400).json({ error: 'Nombre y apellido requeridos' });
        if (!hasNameAndSurname(nombre)) return res.status(400).json({ error: 'Debes ingresar nombre y apellido' });
        if (!isValidPhoneVE(telefono)) return res.status(400).json({ error: 'Teléfono inválido (usa 04xx1234567)' });
        if (!isValidEmail(email)) return res.status(400).json({ error: 'Correo inválido' });
        if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Debes enviar al menos un producto' });

        const captchaRequired = String(process.env.PUBLIC_CAPTCHA_REQUIRED || 'false') === 'true';
        if (captchaRequired) {
            const ok = await verifyTurnstileToken(turnstileToken, req.ip);
            if (!ok) return res.status(400).json({ error: 'Validación anti-bot no superada' });
        }

        const cleanedItems = items
            .map((it) => ({
                producto_id: parseInt(it?.producto_id, 10),
                cantidad_pedida: parseFloat(it?.cantidad_pedida)
            }))
            .filter((it) => Number.isInteger(it.producto_id) && it.producto_id > 0 && Number.isFinite(it.cantidad_pedida) && it.cantidad_pedida > 0);

        if (cleanedItems.length === 0) return res.status(400).json({ error: 'No hay items válidos para el pedido' });
        if (cleanedItems.length > 40) return res.status(400).json({ error: 'El pedido supera el máximo de 40 líneas' });

        const productIds = cleanedItems.map((it) => it.producto_id);
        const productosDb = await db.query(
            `SELECT id, nombre, activa, stock, cantidad_piezas
             FROM productos
             WHERE id = ANY($1::int[])`,
            [productIds]
        );
        const activos = new Set(productosDb.rows.filter((p) => p.activa).map((p) => Number(p.id)));
        if (activos.size !== cleanedItems.length) {
            return res.status(400).json({ error: 'Uno o más productos no están activos' });
        }
        const productosMap = new Map(productosDb.rows.map((p) => [Number(p.id), p]));
        for (const item of cleanedItems) {
            const producto = productosMap.get(Number(item.producto_id));
            if (!producto) {
                return res.status(400).json({ error: `Producto inválido: ${item.producto_id}` });
            }
            const piezasDisponibles = toNumber(producto.cantidad_piezas, 0);
            const stockDisponible = toNumber(producto.stock, 0);
            const disponibleParaComparar = piezasDisponibles > 0 ? piezasDisponibles : stockDisponible;
            if (disponibleParaComparar <= 0) {
                return res.status(400).json({ error: `Sin disponibilidad para "${producto.nombre}"` });
            }
            if (item.cantidad_pedida > disponibleParaComparar) {
                return res.status(400).json({
                    error: `Cantidad solicitada supera la disponibilidad de "${producto.nombre}". Disponible: ${disponibleParaComparar}`
                });
            }
        }

        // Anti-duplicado simple por 120s
        cleanStaleEntries(publicOrderDedupStore, 2 * 60 * 1000);
        const signaturePayload = JSON.stringify({
            telefono,
            email,
            items: cleanedItems.map((i) => [i.producto_id, Number(i.cantidad_pedida.toFixed(3))]).sort((a, b) => a[0] - b[0])
        });
        const signature = crypto.createHash('sha256').update(signaturePayload).digest('hex');
        if (publicOrderDedupStore.has(signature)) {
            return res.status(409).json({ error: 'Pedido duplicado detectado. Ya fue recibido hace unos segundos.' });
        }
        publicOrderDedupStore.set(signature, { ts: Date.now() });

        const notaAutoguardado = 'Autoguardado por el mismo cliente desde catálogo público';

        // Upsert cliente por teléfono/correo
        const existingClient = await db.query(
            `SELECT * FROM clientes
             WHERE REPLACE(COALESCE(telefono,''), ' ', '') = $1
                OR LOWER(TRIM(COALESCE(email,''))) = $2
             ORDER BY id DESC
             LIMIT 1`,
            [telefono, email]
        );

        let clienteFinal;
        if (existingClient.rows.length > 0) {
            const prev = existingClient.rows[0];
            const notasPrev = (prev.notas || '').trim();
            const notasFinales = notasPrev ? `${notasPrev}\n${notaAutoguardado}` : notaAutoguardado;
            const updated = await db.query(
                `UPDATE clientes
                 SET nombre = $1, telefono = $2, email = $3, notas = $4, actualizado_en = NOW()
                 WHERE id = $5
                 RETURNING *`,
                [nombre, telefono, email, notasFinales, prev.id]
            );
            clienteFinal = updated.rows[0];
        } else {
            const created = await db.query(
                `INSERT INTO clientes (nombre, telefono, email, notas)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [nombre, telefono, email, notaAutoguardado]
            );
            clienteFinal = created.rows[0];
        }

        const pedido = await db.query(
            `INSERT INTO pedidos (cliente_id, cliente_nombre, notas, estado, estado_procesamiento)
             VALUES ($1, $2, $3, 'pendiente', 'pendiente')
             RETURNING *`,
            [
                clienteFinal.id,
                clienteFinal.nombre,
                `${notaAutoguardado}${notas ? ` | ${String(notas).slice(0, 300)}` : ''}`
            ]
        );

        for (const item of cleanedItems) {
            await db.query(
                `INSERT INTO pedido_items (pedido_id, producto_id, cantidad_pedida, cantidad_entregada, peso_entregado)
                 VALUES ($1, $2, $3, 0, 0)`,
                [pedido.rows[0].id, item.producto_id, item.cantidad_pedida]
            );
        }

        res.status(201).json({
            mensaje: 'Pedido recibido correctamente',
            pedido_id: pedido.rows[0].id
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear pedido público', detalle: error.message });
    }
});

// Actualizar cantidades entregadas de un pedido
app.put('/api/pedidos/:id/entregar', async (req, res) => {
    try {
        const { id } = req.params;
        const { items } = req.body; // [{pedido_item_id, cantidad_entregada}]

        for (const item of items) {
            await db.query(
                `UPDATE pedido_items SET cantidad_entregada = $1, peso_entregado = COALESCE($2, peso_entregado) WHERE id = $3 AND pedido_id = $4`,
                [item.cantidad_entregada, item.peso_entregado !== undefined ? item.peso_entregado : null, item.pedido_item_id, id]
            );
        }

        // Verificar si está completo
        const check = await db.query(
            `SELECT COUNT(*) as total,
                    COUNT(CASE WHEN cantidad_entregada >= cantidad_pedida THEN 1 END) as completos
             FROM pedido_items WHERE pedido_id = $1`, [id]
        );
        const { total, completos } = check.rows[0];
        const nuevoEstado = parseInt(completos) === parseInt(total) ? 'listo' :
                            parseInt(completos) > 0 ? 'parcial' : 'pendiente';

        await db.query(`UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2`, [nuevoEstado, id]);
        res.json({ mensaje: 'Actualizado', estado: nuevoEstado });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar entrega', detalle: error.message });
    }
});

// Convertir pedido en venta
app.post('/api/pedidos/:id/convertir-venta', async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento, moneda, tasa_cambio } = req.body;

        const pedido = await db.query(`SELECT * FROM pedidos WHERE id = $1`, [id]);
        if (pedido.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        const p = pedido.rows[0];

        // Obtener pagos del pedido
        const pagosResult = await db.query(`SELECT COALESCE(SUM(monto), 0) as total_pagado FROM pedido_pagos WHERE pedido_id = $1`, [id]);
        const totalAbonos = parseFloat(pagosResult.rows[0].total_pagado) || 0;

        const items = await db.query(
            `SELECT pi.*, pr.nombre as producto_nombre FROM pedido_items pi
             JOIN productos pr ON pi.producto_id = pr.id WHERE pi.pedido_id = $1`, [id]
        );

        const totalBruto = items.rows.reduce((s, i) => {
            // CORRECCIÓN: Usar siempre kg para el cálculo del total
            const kg = parseFloat(i.peso_entregado) > 0 ? parseFloat(i.peso_entregada) : parseFloat(i.cantidad_entregada) || parseFloat(i.cantidad_pedida);
            console.log('🔢 CORRECCIÓN TOTAL - Item:', {
                producto: i.producto_nombre,
                cantidad_pedida: i.cantidad_pedida,
                cantidad_entregada: i.cantidad_entregada,
                peso_entregado: i.peso_entregado,
                kg_usado: kg,
                precio_unitario: i.precio_unitario,
                subtotal: kg * parseFloat(i.precio_unitario)
            });
            return s + (parseFloat(i.precio_unitario) * kg);
        }, 0);

        // Descontar abonos del total
        const total = Math.max(0, totalBruto - totalAbonos);
        const monedaOrig = moneda || 'USD';
        const tasa = parseFloat(tasa_cambio) || 1;
        const totalVes = monedaOrig === 'VES' ? total : total * tasa;

        // Determinar estado de pago basado en abonos
        let estadoPago = 'pendiente';
        let montoPagado = 0;
        let saldoPendiente = total;

        if (totalAbonos >= totalBruto || total <= 0.001) {
            estadoPago = 'pagado';
            montoPagado = total;
            saldoPendiente = 0;
        } else if (totalAbonos > 0) {
            estadoPago = 'parcial';
            montoPagado = totalAbonos;
            saldoPendiente = totalBruto - totalAbonos;
        }

        const venta = await db.query(
            `INSERT INTO ventas (cliente_id, cliente_nombre, total, total_ves, moneda_original, tasa_cambio_usada,
              tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento, estado_pago, monto_pagado, saldo_pendiente)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [p.cliente_id, p.cliente_nombre, total, totalVes, monedaOrig, tasa,
             tipo_venta || 'inmediato', metodo_pago || 'efectivo', referencia_pago || '',
             fecha_vencimiento || null, estadoPago, montoPagado, saldoPendiente]
        );
        const ventaId = venta.rows[0].id;

        for (const item of items.rows) {
            const cant = parseFloat(item.cantidad_entregada) > 0 ? parseFloat(item.cantidad_entregada) : parseFloat(item.cantidad_pedida);
            const kg = parseFloat(item.peso_entregado) > 0 ? parseFloat(item.peso_entregado) : cant;
            
            console.log('🔍 DEBUG - Pedido a Venta:', {
                producto_id: item.producto_id,
                producto_nombre: item.producto_nombre,
                cantidad_pedida: item.cantidad_pedida,
                cantidad_entregada: item.cantidad_entregada,
                peso_entregado: item.peso_entregado,
                cant_final: cant,
                kg_final: kg,
                precio_unitario: item.precio_unitario
            });
            
            // CORRECCIÓN: Usar siempre kg para stock y venta (no cantidad)
            const cantidadParaVenta = kg;
            const cantidadParaStock = kg;
            
            console.log('🔢 CORRECCIÓN - Usando kg en lugar de cantidad:', {
                cantidad_para_venta: cantidadParaVenta,
                cantidad_para_stock: cantidadParaStock
            });
            
            await db.query(
                `INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total_linea, moneda_original)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
                [ventaId, item.producto_id, cantidadParaVenta, item.precio_unitario, cantidadParaVenta * parseFloat(item.precio_unitario), monedaOrig]
            );
            
            // Verificar stock antes de descontar
            const stockAntes = await db.query(`SELECT stock, nombre FROM productos WHERE id = $1`, [item.producto_id]);
            console.log('📦 Stock ANTES de descontar (pedido→venta):', stockAntes.rows[0]);
            
            // Descontar stock por kg despachados (CORREGIDO)
            await db.query(`UPDATE productos SET stock = stock - $1, actualizado_en = NOW() WHERE id = $2`, [cantidadParaStock, item.producto_id]);
            await normalizarProductoFinalPorId(db, item.producto_id);
            
            // Verificar stock después de descontar
            const stockDespues = await db.query(`SELECT stock, nombre FROM productos WHERE id = $1`, [item.producto_id]);
            console.log('📦 Stock DESPUÉS de descontar (pedido→venta):', stockDespues.rows[0]);
        }

        // Marcar pedido como facturado
        await db.query(`UPDATE pedidos SET estado = 'facturado', venta_id = $1, actualizado_en = NOW() WHERE id = $2`, [ventaId, id]);

        // Migrar pagos del pedido a la venta (si existen)
        try {
            const pagosRows = await db.query(`SELECT * FROM pedido_pagos WHERE pedido_id = $1 ORDER BY fecha ASC`, [id]);
            for (const pago of pagosRows.rows) {
                await db.query(
                    `INSERT INTO venta_pagos (venta_id, monto, monto_ves, monto_bs, monto_usd, metodo_pago, referencia_pago, tasa_cambio, fecha)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [ventaId, pago.monto, pago.monto, pago.monto, pago.monto, pago.metodo_pago || null, pago.referencia_pago || null, 1, pago.fecha || null]
                );
            }
            if (pagosRows.rows.length > 0) {
                console.log(`Migrados ${pagosRows.rows.length} pagos de pedido ${id} a venta ${ventaId}`);
            }
        } catch (e) {
            console.warn('No se pudieron migrar pagos del pedido a la venta:', e.message);
        }

        res.json({ mensaje: 'Venta creada correctamente', venta_id: ventaId, total_abonos_aplicados: totalAbonos, total_final: total });
    } catch (error) {
        console.error('Error al convertir pedido en venta:', error.message);
        res.status(500).json({ error: 'Error al convertir pedido en venta', detalle: error.message });
    }
});

// TEST ENDPOINT - Simplificado para depuración
app.post('/api/pedidos/:id/test-despachar', async (req, res) => {
    const { id } = req.params;
    const { items_despachados } = req.body;
    
    console.log('🧪 TEST DESPACHAR:', { id, items_despachados });
    
    try {
        // Simular respuesta exitosa sin tocar DB
        res.json({
            mensaje: 'Test despachar OK',
            venta_id: 999,
            total: 100.00,
            items_despachados: items_despachados?.length || 0
        });
    } catch (error) {
        console.error('❌ Error en test despachar:', error.message);
        res.status(500).json({ error: 'Error en test despachar', detalle: error.message });
    }
});

// DESPACHAR PEDIDO (crear venta automáticamente) - Versión final robusta
app.post('/api/pedidos/:id/despachar', async (req, res) => {
    const { id } = req.params;
    const { items_despachados, tipo_venta, metodo_pago } = req.body;
    const tipoVentaNormalizado = String(tipo_venta || '').toLowerCase() === 'credito' ? 'credito' : 'inmediato';
    const metodoPagoNormalizado = tipoVentaNormalizado === 'credito' ? null : (metodo_pago || 'efectivo');
    
    console.log('🚀 DESPACHAR PEDIDO (versión final):', { id, items_despachados });
    
    try {
        // 1. Validación básica
        if (!items_despachados || !Array.isArray(items_despachados) || items_despachados.length === 0) {
            console.log('❌ Error: items_despachados vacío');
            return res.status(400).json({ error: 'Se deben especificar los items despachados' });
        }
        
        console.log('✅ Validación básica pasada');
        
        // 2. Obtener información del pedido para obtener cliente
        let pedidoInfo = null;
        try {
            const pedidoResult = await db.query(`SELECT * FROM pedidos WHERE id = $1`, [id]);
            if (pedidoResult.rows.length > 0) {
                pedidoInfo = pedidoResult.rows[0];
                console.log('📋 Pedido obtenido:', pedidoInfo.id, 'Cliente:', pedidoInfo.cliente_nombre);
            } else {
                console.warn('⚠️ Pedido no encontrado, usando cliente genérico');
            }
        } catch (error) {
            console.warn('⚠️ Error obteniendo pedido:', error.message);
        }
        
        // 3. Obtener productos para obtener precios reales
        const productosIds = items_despachados.map(item => item.producto_id);
        let productosMap = {};
        
        try {
            const productosResult = await db.query(
                `SELECT id, precio FROM productos WHERE id = ANY($1)`,
                [productosIds]
            );
            
            productosResult.rows.forEach(p => {
                productosMap[p.id] = parseFloat(p.precio) || 10; // Default $10 si no tiene precio
            });
            
            console.log('📦 Precios obtenidos:', productosMap);
        } catch (error) {
            console.warn('⚠️ Error obteniendo precios, usando $10 por defecto:', error.message);
            // Usar $10 por defecto si no se pueden obtener los precios
            items_despachados.forEach(item => {
                productosMap[item.producto_id] = 10;
            });
        }
        
        // 4. Calcular total con precios reales
        const total = items_despachados.reduce((sum, item) => {
            const precio = productosMap[item.producto_id] || 10;
            const cantidad = parseFloat(item.peso_entregado) || 0;
            return sum + (cantidad * precio);
        }, 0);
        
        console.log('💰 Total calculado:', total);
        
        // 5. Crear venta simple sin transacción
        let ventaId = null;
        try {
            const ventaResult = await db.query(`
                INSERT INTO ventas (cliente_id, cliente_nombre, total, moneda_original, 
                                  tipo_venta, metodo_pago, estado_pago, monto_pagado, saldo_pendiente)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `, [
                pedidoInfo?.cliente_id || null, 
                pedidoInfo?.cliente_nombre || 'Cliente Desconocido', 
                total, 
                'USD', 
                tipoVentaNormalizado, 
                metodoPagoNormalizado, 
                'pendiente', 
                0, 
                total
            ]);
            
            ventaId = ventaResult.rows[0].id;
            console.log('🧾 Venta creada:', ventaId);
        } catch (error) {
            console.error('❌ Error creando venta:', error.message);
            // Si falla la venta, responder con simulación
            return res.json({
                mensaje: 'Pedido despachado (simulado - error en DB)',
                venta_id: Date.now(),
                total: total,
                items_despachados: items_despachados.length,
                error_db: error.message
            });
        }
        
        // 4. Crear detalles de venta y descontar stock
        try {
            for (const item of items_despachados) {
                const cantidad = parseFloat(item.peso_entregado) || 0;
                const precio_unitario = productosMap[item.producto_id] || 10;
                const total_linea = cantidad * precio_unitario;
                
                // Insertar detalle de venta
                await db.query(`
                    INSERT INTO venta_detalles (venta_id, producto_id, cantidad, precio_unitario, total_linea, moneda_original)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `, [ventaId, item.producto_id, cantidad, precio_unitario, total_linea, 'USD']);
                
                // DESCUENTAR STOCK DEL PRODUCTO
                await db.query(`
                    UPDATE productos 
                    SET stock = stock - $1, actualizado_en = NOW() 
                    WHERE id = $2
                `, [cantidad, item.producto_id]);
                await normalizarProductoFinalPorId(db, item.producto_id);
            }
            console.log('📝 Detalles de venta creados y stock descontado');
        } catch (error) {
            console.warn('⚠️ Error creando detalles (continuando):', error.message);
        }
        
        // 5. Actualizar pedido (opcional)
        try {
            await db.query(`
                UPDATE pedidos 
                SET estado = 'despachado', 
                    estado_procesamiento = 'venta por procesar',
                    venta_id = $1,
                    actualizado_en = NOW()
                WHERE id = $2
            `, [ventaId, id]);
            console.log('📦 Pedido actualizado');
        } catch (error) {
            console.warn('⚠️ Error actualizando pedido (continuando):', error.message);
        }
        
        console.log('✅ Despacho completado con éxito');
        
        res.json({
            mensaje: 'Pedido despachado correctamente',
            venta_id: ventaId,
            total: total,
            items_despachados: items_despachados.length
        });
        
    } catch (error) {
        console.error('❌ Error general al despachar pedido:', error.message);
        res.status(500).json({ error: 'Error al despachar pedido', detalle: error.message });
    }
});

app.delete('/api/pedidos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(`DELETE FROM pedido_items WHERE pedido_id = $1`, [id]);
        const result = await db.query(`DELETE FROM pedidos WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
        res.json({ mensaje: 'Pedido eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar pedido', detalle: error.message });
    }
});

// Obtener pagos de un pedido
app.get('/api/pedidos/:id/pagos', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT * FROM pedido_pagos WHERE pedido_id = $1 ORDER BY fecha DESC`,
            [id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener pagos', detalle: error.message });
    }
});

// Registrar abono en pedido
app.post('/api/pedidos/:id/pagos', async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        const { monto, metodo_pago, referencia_pago } = req.body;
        console.log('Registrando abono:', { id, monto, metodo_pago, referencia_pago });
        const montoNum = parseFloat(monto);
        if (isNaN(montoNum) || montoNum <= 0) throw new Error('Monto invalido');

        // Obtener pedido y calcular saldo
        const pedidoResult = await client.query(
            'SELECT total_estimado, monto_pagado, saldo_pendiente FROM pedidos WHERE id = $1',
            [id]
        );
        if (pedidoResult.rows.length === 0) throw new Error('Pedido no encontrado');
        const pedido = pedidoResult.rows[0];
        const totalPedido = parseFloat(pedido.total_estimado) || 0;
        const montoPagadoActual = parseFloat(pedido.monto_pagado) || 0;
        let saldoActual = parseFloat(pedido.saldo_pendiente);
        // Si `saldo_pendiente` no está definido o parece inicializado incorrectamente (0) mientras
        // el pedido tiene total > 0 y no hay pagos registrados, recalculamos desde total - pagado.
        if (isNaN(saldoActual) || pedido.saldo_pendiente === null || (saldoActual === 0 && montoPagadoActual === 0 && totalPedido > 0)) {
            saldoActual = Math.max(0, totalPedido - montoPagadoActual);
        }
        console.log('Saldo actual:', saldoActual, 'Monto a registrar:', montoNum);

        if (saldoActual <= 0.001) throw new Error('Este pedido ya esta completamente pagado');
        if (montoNum > saldoActual + 0.001) throw new Error(`El abono no puede superar el saldo pendiente ($${saldoActual.toFixed(2)})`);

        const nuevoSaldo = Math.max(0, saldoActual - montoNum);
        const nuevoMontoPagado = montoPagadoActual + montoNum;

        // Insertar pago
        const insertResult = await client.query(
            `INSERT INTO pedido_pagos (pedido_id, monto, metodo_pago, referencia_pago)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [id, montoNum, metodo_pago, referencia_pago || null]
        );
        console.log('Pago insertado:', insertResult.rows[0]);

        // Actualizar pedido
        const updateResult = await client.query(
            `UPDATE pedidos SET monto_pagado = $1, saldo_pendiente = $2, actualizado_en = NOW() WHERE id = $3 RETURNING *`,
            [nuevoMontoPagado, nuevoSaldo, id]
        );
        console.log('Pedido actualizado:', updateResult.rows[0]);
        // Ajustar estado del pedido según saldo (marcar como pagado si se cubre el total)
        let nuevoEstadoPedido = (nuevoSaldo <= 0.001) ? 'pagado' : (nuevoMontoPagado > 0 ? 'parcial' : updateResult.rows[0].estado || 'pendiente');
        if (nuevoEstadoPedido !== updateResult.rows[0].estado) {
            try {
                await client.query(`UPDATE pedidos SET estado = $1, actualizado_en = NOW() WHERE id = $2`, [nuevoEstadoPedido, id]);
                console.log('Estado de pedido actualizado a:', nuevoEstadoPedido);
            } catch (e) {
                console.warn('No se pudo actualizar estado de pedido:', e.message);
            }
        }

        // Si el pedido está vinculado a una venta, reflejar el abono en la venta
        let ventaId = updateResult.rows[0].venta_id;
        // Si no existe venta vinculada, crear una venta provisional para que los abonos queden registrados
        if (!ventaId) {
            try {
                const pedidoInfo = await client.query('SELECT cliente_id, cliente_nombre FROM pedidos WHERE id = $1', [id]);
                const clienteId = pedidoInfo.rows[0]?.cliente_id || null;
                const clienteNombre = pedidoInfo.rows[0]?.cliente_nombre || '';
                const ventaIns = await client.query(
                    `INSERT INTO ventas (cliente_id, cliente_nombre, total, total_ves, moneda_original, tasa_cambio_usada, tipo_venta, metodo_pago, referencia_pago, fecha_vencimiento, estado_pago, monto_pagado, saldo_pendiente)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
                    [clienteId, clienteNombre, totalPedido, totalPedido, 'USD', 1, 'inmediato', null, null, null, 'pendiente', 0, totalPedido]
                );
                ventaId = ventaIns.rows[0].id;
                await client.query('UPDATE pedidos SET venta_id = $1, actualizado_en = NOW() WHERE id = $2', [ventaId, id]);
                console.log('Venta provisional creada para pedido:', { pedido_id: id, ventaId });
            } catch (e) {
                console.warn('No se pudo crear venta provisional para pedido:', e.message);
            }
        }
        if (ventaId) {
            const ventaRow = await client.query('SELECT id, total, monto_pagado, saldo_pendiente FROM ventas WHERE id = $1 FOR UPDATE', [ventaId]);
            if (ventaRow.rows.length > 0) {
                const venta = ventaRow.rows[0];
                const totalVenta = parseFloat(venta.total) || 0;
                const montoPagadoVentaActual = parseFloat(venta.monto_pagado) || 0;
                let saldoVentaActual = parseFloat(venta.saldo_pendiente);
                if (isNaN(saldoVentaActual) || venta.saldo_pendiente === null) {
                    saldoVentaActual = Math.max(0, totalVenta - montoPagadoVentaActual);
                }
                // Validaciones similares a las de ventas
                if (saldoVentaActual <= 0.001) {
                    throw new Error('La venta asociada ya está completamente pagada');
                }
                if (montoNum > saldoVentaActual + 0.001) {
                    throw new Error(`El abono supera el saldo pendiente de la venta asociada ($${saldoVentaActual.toFixed(2)})`);
                }

                // calcular nuevos valores y normalizar por redondeo
                let nuevoSaldoVenta = saldoVentaActual - montoNum;
                let nuevoMontoPagadoVenta = montoPagadoVentaActual + montoNum;
                // Si por redondeo o por pagar exactamente llega a (o debajo de) 0, marcar pagado y ajustar montos exactamente
                if (nuevoSaldoVenta <= 0.001) {
                    nuevoSaldoVenta = 0;
                    nuevoMontoPagadoVenta = totalVenta; // asegurar que monto_pagado igual al total
                }
                const nuevoEstadoVenta = nuevoSaldoVenta <= 0 ? 'pagado' : 'parcial';

                await client.query(
                    `INSERT INTO venta_pagos (venta_id, monto, monto_ves, monto_bs, monto_usd, metodo_pago, referencia_pago, tasa_cambio)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                    [ventaId, montoNum, montoNum, montoNum, montoNum, metodo_pago || null, referencia_pago || null, 1]
                );

                await client.query(
                    `UPDATE ventas SET monto_pagado = $1, saldo_pendiente = $2, estado_pago = $3, actualizado_en = NOW() WHERE id = $4`,
                    [nuevoMontoPagadoVenta, nuevoSaldoVenta, nuevoEstadoVenta, ventaId]
                );
                console.log('Venta actualizada por abono de pedido:', { ventaId, nuevoMontoPagadoVenta, nuevoSaldoVenta, nuevoEstadoVenta });
            } else {
                console.warn('Pedido vinculado a venta inexistente:', ventaId);
            }
        }

        await client.query('COMMIT');

        // Preparar payload de respuesta con totales
        const responsePayload = {
            mensaje: `Abono registrado. Saldo pendiente: ${nuevoSaldo.toFixed(2)}`,
            pedido_id: id,
            total_pedido: totalPedido,
            monto_pagado_pedido: nuevoMontoPagado,
            saldo_pendiente_pedido: nuevoSaldo
        };

        // Si hay venta vinculada, adjuntar resumen de la venta
        if (ventaId) {
            try {
                const ventaFinal = await client.query('SELECT id, total, monto_pagado, saldo_pendiente, estado_pago FROM ventas WHERE id = $1', [ventaId]);
                if (ventaFinal.rows.length > 0) {
                    const v = ventaFinal.rows[0];
                    responsePayload.venta = {
                        venta_id: v.id,
                        total_venta: parseFloat(v.total) || 0,
                        monto_pagado_venta: parseFloat(v.monto_pagado) || 0,
                        saldo_pendiente_venta: parseFloat(v.saldo_pendiente) || 0,
                        estado_pago: v.estado_pago
                    };
                }
            } catch (e) {
                console.warn('No se pudo obtener resumen de venta para respuesta:', e.message);
            }
        }

        res.json(responsePayload);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error en abono pedido:', error);
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
});

// ============================================
// USUARIOS Y AUTENTICACIÓN
// ============================================

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { usuario, password } = req.body;
        if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

        const result = await db.query(
            `SELECT * FROM usuarios WHERE usuario = $1`,
            [usuario.trim().toLowerCase()]
        );
        if (result.rows.length === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

        const user = result.rows[0];
        // Comparación segura con bcrypt
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

        // Actualizar último acceso
        await db.query(`UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1`, [user.id]);

        const token = jwt.sign({ id: user.id, rol: user.rol, usuario: user.usuario }, JWT_SECRET, { expiresIn: '8h' });

        res.json({
            id: user.id,
            nombre: user.nombre,
            usuario: user.usuario,
            rol: user.rol,
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Error en login', detalle: error.message });
    }
});

// Middleware para verificar JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token requerido. Inicia sesión nuevamente.' });
    jwt.verify(token, JWT_SECRET, (err, payload) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
            }
            return res.status(401).json({ error: 'Token inválido. Inicia sesión nuevamente.' });
        }
        req.user = payload;
        next();
    });
}

// ============================================
// FINANCIERO
// ============================================

app.get('/api/financiero/gastos', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { fecha_inicio, fecha_fin, limit = 80 } = req.query;
        const where = [];
        const params = [];
        let idx = 1;
        if (fecha_inicio) {
            where.push(`fecha >= $${idx}`);
            params.push(fecha_inicio);
            idx++;
        }
        if (fecha_fin) {
            where.push(`fecha <= $${idx}`);
            params.push(`${fecha_fin}T23:59:59`);
            idx++;
        }
        params.push(parseInt(limit, 10) || 80);
        const sql = `
            SELECT id, concepto, categoria, monto_usd, monto_bs, metodo_pago, referencia_pago, tasa_aplicada, notas, usuario_registro, fecha
            FROM gastos_operativos
            ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
            ORDER BY fecha DESC, id DESC
            LIMIT $${idx}
        `;
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener gastos operativos', detalle: error.message });
    }
});

app.post('/api/financiero/gastos', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { concepto, categoria, monto_usd, monto_bs, metodo_pago, referencia_pago, tasa_aplicada, notas } = req.body || {};
        const conceptoLimpio = String(concepto || '').trim();
        const montoUsdNum = parseFloat(monto_usd) || 0;
        const montoBsNum = parseFloat(monto_bs) || 0;
        const metodoPago = String(metodo_pago || 'bs');
        const requiereReferencia = ['transferencia', 'pago_movil'].includes(metodoPago);
        const referencia = requiereReferencia ? String(referencia_pago || '').trim() : '';
        const tasaAplicadaNum = parseFloat(tasa_aplicada);
        if (!conceptoLimpio) return res.status(400).json({ error: 'Concepto es obligatorio' });
        if (montoUsdNum <= 0 && montoBsNum <= 0) return res.status(400).json({ error: 'Debe indicar un monto en USD o Bs' });
        if (requiereReferencia && !referencia) return res.status(400).json({ error: 'Referencia obligatoria para pago móvil o transferencia' });
        const result = await db.query(`
            INSERT INTO gastos_operativos (
                concepto, categoria, monto_usd, monto_bs, metodo_pago, referencia_pago, tasa_aplicada, notas, usuario_registro, fecha, creado_en
            ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW()
            ) RETURNING *
        `, [
            conceptoLimpio,
            String(categoria || 'general'),
            montoUsdNum,
            montoBsNum,
            metodoPago,
            requiereReferencia ? referencia : null,
            Number.isFinite(tasaAplicadaNum) && tasaAplicadaNum > 0 ? tasaAplicadaNum : null,
            notas || null,
            req.user.usuario || 'sistema'
        ]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear gasto operativo', detalle: error.message });
    }
});

app.delete('/api/financiero/gastos/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const result = await db.query('DELETE FROM gastos_operativos WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Gasto no encontrado' });
        res.json({ mensaje: 'Gasto eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar gasto operativo', detalle: error.message });
    }
});

app.get('/api/financiero/movimientos', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { fecha_inicio, fecha_fin } = req.query;
        const params = [];
        let idx = 1;
        const whereV = [];
        const whereG = [];
        const whereP = [];

        if (fecha_inicio) {
            whereV.push(`v.fecha >= $${idx}`);
            whereG.push(`g.fecha >= $${idx}`);
            whereP.push(`p.fecha >= $${idx}`);
            params.push(fecha_inicio);
            idx++;
        }
        if (fecha_fin) {
            whereV.push(`v.fecha <= $${idx}`);
            whereG.push(`g.fecha <= $${idx}`);
            whereP.push(`p.fecha <= $${idx}`);
            params.push(`${fecha_fin}T23:59:59`);
            idx++;
        }
        const whereVentas = whereV.length ? `WHERE ${whereV.join(' AND ')}` : '';
        const whereGastos = whereG.length ? `WHERE ${whereG.join(' AND ')}` : '';
        const whereProduccion = whereP.length ? `WHERE ${whereP.join(' AND ')}` : '';

        const result = await db.query(`
            SELECT * FROM (
                SELECT
                    'ingreso' AS tipo,
                    'ventas' AS origen,
                    v.id,
                    v.fecha,
                    COALESCE(v.total, 0) AS monto_usd,
                    CONCAT('Venta #', v.id, ' - ', COALESCE(v.cliente_nombre, 'Cliente')) AS concepto
                FROM ventas v
                ${whereVentas}
                UNION ALL
                SELECT
                    'egreso' AS tipo,
                    'gastos_operativos' AS origen,
                    g.id,
                    g.fecha,
                    COALESCE(g.monto_usd, 0) AS monto_usd,
                    CONCAT('Gasto operativo: ', g.concepto) AS concepto
                FROM gastos_operativos g
                ${whereGastos}
                UNION ALL
                SELECT
                    'egreso' AS tipo,
                    'materia_prima' AS origen,
                    p.id,
                    p.fecha,
                    COALESCE(SUM((ri.cantidad * p.cantidad_lotes) * COALESCE(i.costo, 0)), 0) AS monto_usd,
                    CONCAT('Costo producción #', p.id) AS concepto
                FROM produccion p
                JOIN receta_ingredientes ri ON ri.receta_id = p.receta_id
                JOIN ingredientes i ON i.id = ri.ingrediente_id
                ${whereProduccion}
                GROUP BY p.id, p.fecha
            ) mov
            ORDER BY fecha DESC
            LIMIT 400
        `, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener movimientos financieros', detalle: error.message });
    }
});

app.get('/api/financiero/resumen', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { fecha_inicio, fecha_fin } = req.query;
        const params = [];
        let idx = 1;
        const wVentas = [];
        const wGastos = [];
        const wProd = [];

        if (fecha_inicio) {
            wVentas.push(`fecha >= $${idx}`);
            wGastos.push(`fecha >= $${idx}`);
            wProd.push(`p.fecha >= $${idx}`);
            params.push(fecha_inicio);
            idx++;
        }
        if (fecha_fin) {
            wVentas.push(`fecha <= $${idx}`);
            wGastos.push(`fecha <= $${idx}`);
            wProd.push(`p.fecha <= $${idx}`);
            params.push(`${fecha_fin}T23:59:59`);
            idx++;
        }

        const sqlIngresos = `
            SELECT COALESCE(SUM(total), 0) AS total
            FROM ventas
            ${wVentas.length ? `WHERE ${wVentas.join(' AND ')}` : ''}
        `;
        const sqlGastosOperativos = `
            SELECT COALESCE(SUM(monto_usd), 0) AS total
            FROM gastos_operativos
            ${wGastos.length ? `WHERE ${wGastos.join(' AND ')}` : ''}
        `;
        const sqlMateriaPrima = `
            SELECT COALESCE(SUM((ri.cantidad * p.cantidad_lotes) * COALESCE(i.costo, 0)), 0) AS total
            FROM produccion p
            JOIN receta_ingredientes ri ON ri.receta_id = p.receta_id
            JOIN ingredientes i ON i.id = ri.ingrediente_id
            ${wProd.length ? `WHERE ${wProd.join(' AND ')}` : ''}
        `;

        const [ingRes, gasRes, matRes] = await Promise.all([
            db.query(sqlIngresos, params),
            db.query(sqlGastosOperativos, params),
            db.query(sqlMateriaPrima, params)
        ]);

        const ingresos = parseFloat(ingRes.rows[0]?.total || 0);
        const gastosOperativos = parseFloat(gasRes.rows[0]?.total || 0);
        const costoMateriaPrima = parseFloat(matRes.rows[0]?.total || 0);
        const egresosTotales = gastosOperativos + costoMateriaPrima;
        const ingresoBruto = ingresos - costoMateriaPrima;
        const ingresoNeto = ingresoBruto - gastosOperativos;

        res.json({
            ingresos_totales_usd: ingresos,
            egresos_totales_usd: egresosTotales,
            gastos_operativos_usd: gastosOperativos,
            costo_materia_prima_usd: costoMateriaPrima,
            ingreso_bruto_usd: ingresoBruto,
            ingreso_neto_usd: ingresoNeto
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener resumen financiero', detalle: error.message });
    }
});

app.get('/api/financiero/ganancia-por-producto', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { fecha_inicio, fecha_fin } = req.query;
        const params = [];
        let idx = 1;
        const where = [];
        if (fecha_inicio) {
            where.push(`v.fecha >= $${idx}`);
            params.push(fecha_inicio);
            idx++;
        }
        if (fecha_fin) {
            where.push(`v.fecha <= $${idx}`);
            params.push(`${fecha_fin}T23:59:59`);
            idx++;
        }
        const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const query = `
            SELECT
                p.id AS producto_id,
                p.nombre AS producto_nombre,
                COALESCE(p.categoria, 'Otros') AS categoria,
                COALESCE(p.tipo_producto, 'producido') AS tipo_producto,
                COALESCE(p.precio, 0) AS precio_venta_actual,
                COALESCE(p.precio_canal, 0) AS precio_canal,
                COALESCE(SUM(vd.cantidad), 0) AS cantidad_vendida,
                COALESCE(SUM(vd.total_linea), 0) AS ingresos_venta,
                CASE
                    WHEN COALESCE(p.tipo_producto, 'producido') = 'corte'
                        THEN COALESCE(SUM(vd.cantidad * COALESCE(NULLIF(p.precio_canal, 0), p.precio, 0)), 0)
                    ELSE COALESCE(SUM(vd.cantidad * (
                        SELECT COALESCE(SUM(ri.cantidad * COALESCE(i.costo, 0)), 0)
                        FROM recetas r
                        JOIN receta_ingredientes ri ON ri.receta_id = r.id
                        JOIN ingredientes i ON i.id = ri.ingrediente_id
                        WHERE r.producto_id = p.id AND r.activa = TRUE
                    )), 0)
                END AS costo_estimado_total
            FROM venta_detalles vd
            JOIN ventas v ON v.id = vd.venta_id
            JOIN productos p ON p.id = vd.producto_id
            ${whereSql}
            GROUP BY p.id, p.nombre, p.categoria, p.tipo_producto, p.precio, p.precio_canal
            ORDER BY ingresos_venta DESC, producto_nombre ASC
        `;

        const result = await db.query(query, params);
        const data = (result.rows || []).map((r) => {
            const ingresos = parseFloat(r.ingresos_venta || 0);
            const costo = parseFloat(r.costo_estimado_total || 0);
            const ganancia = ingresos - costo;
            const margen = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;
            return {
                ...r,
                ingresos_venta: ingresos,
                costo_estimado_total: costo,
                ganancia_estimada: ganancia,
                margen_porcentaje: parseFloat(margen.toFixed(2))
            };
        });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error al calcular ganancia por producto', detalle: error.message });
    }
});

// Listar usuarios
app.get('/api/usuarios', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const result = await db.query(
            `SELECT id, nombre, usuario, rol, activo, creado_en, ultimo_acceso FROM usuarios ORDER BY nombre`
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Crear usuario
app.post('/api/usuarios', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { nombre, usuario, password, rol } = req.body;
        if (!nombre || !usuario || !password || !rol) return res.status(400).json({ error: 'Todos los campos son requeridos' });

        const existe = await db.query(`SELECT id FROM usuarios WHERE usuario = $1`, [usuario.trim().toLowerCase()]);
        if (existe.rows.length > 0) return res.status(400).json({ error: 'El nombre de usuario ya existe' });

        const hashed = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO usuarios (nombre, usuario, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, usuario, rol, activo, creado_en`,
            [nombre, usuario.trim().toLowerCase(), hashed, rol]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear usuario', detalle: error.message });
    }
});

// Actualizar usuario
app.put('/api/usuarios/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const { nombre, password, rol, activo } = req.body;
        let hashed = null;
        if (password && password !== '') {
            hashed = await bcrypt.hash(password, 10);
        }
        const result = await db.query(
            `UPDATE usuarios SET
                nombre = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE nombre END,
                password = CASE WHEN $2::text IS NOT NULL AND $2 != '' THEN $2 ELSE password END,
                rol = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE rol END,
                activo = CASE WHEN $4::boolean IS NOT NULL THEN $4 ELSE activo END
             WHERE id = $5 RETURNING id, nombre, usuario, rol, activo`,
            [nombre || null, hashed || null, rol || null, activo !== undefined ? activo : null, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar usuario:', error.message);
        res.status(500).json({ error: 'Error al actualizar usuario', detalle: error.message });
    }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', authenticateToken, async (req, res) => {
    try {
        if (!req.user || req.user.rol !== 'admin') return res.status(403).json({ error: 'Permiso denegado' });
        const { id } = req.params;
        const result = await db.query(`DELETE FROM usuarios WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json({ mensaje: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// ============================================
// INICIO DEL SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;

// ============================================
// TASAS DE CAMBIO
// ============================================

function getVenezuelaNow() {
    const ahora = new Date();
    return new Date(ahora.getTime() + (ahora.getTimezoneOffset() * 60000) - (4 * 3600000));
}

function obtenerFechaVenezuelaISO(fecha = getVenezuelaNow()) {
    return fecha.toISOString().split('T')[0];
}

function normalizarFechaTasaInput(rawFecha) {
    const value = String(rawFecha || '').trim();
    if (!value) return null;

    // Caso ISO o formato con hora: YYYY-MM-DDTHH:mm:ss...
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }

    // Caso DD/MM/YY o DD/MM/YYYY
    const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (slash) {
        const day = slash[1].padStart(2, '0');
        const month = slash[2].padStart(2, '0');
        const yearRaw = slash[3];
        const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
        return `${year}-${month}-${day}`;
    }

    return null;
}

async function ejecutarActualizacionTasaDiaria({ forzarHorario = false, ipAddress = 'sistema', userAgent = 'scheduler' } = {}) {
    const ahoraVzla = getVenezuelaNow();
    const diaSemana = ahoraVzla.getDay(); // 0 domingo, 6 sábado
    const minutosActuales = (ahoraVzla.getHours() * 60) + ahoraVzla.getMinutes();
    const minutosCorte = (14 * 60) + 30; // 2:30 PM
    const esDiaHabil = diaSemana >= 1 && diaSemana <= 5;
    const enHorarioPermitido = esDiaHabil && minutosActuales >= minutosCorte;
    const fechaHoyVzla = obtenerFechaVenezuelaISO(ahoraVzla);
    const horaActualVzla = `${ahoraVzla.getHours().toString().padStart(2, '0')}:${ahoraVzla.getMinutes().toString().padStart(2, '0')}`;

    if (!forzarHorario && !enHorarioPermitido) {
        const actual = await db.query(
            'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC, id DESC LIMIT 1'
        );

        return {
            statusCode: 200,
            payload: {
                mensaje: 'Consulta omitida: la corrida automática es de lunes a viernes desde las 2:30 PM (hora Venezuela)',
                accion: 'omitida_horario',
                horario: {
                    hora_actual: horaActualVzla,
                    fecha_actual: fechaHoyVzla,
                    dia_semana: diaSemana,
                    regla: 'Lunes a viernes desde 14:30'
                },
                tasa_actual: actual.rows[0] ? {
                    tasa: parseFloat(actual.rows[0].tasa_bcv),
                    fecha: actual.rows[0].fecha,
                    fuente: actual.rows[0].fuente
                } : null
            }
        };
    }

    const { obtenerTasaDiaria } = require('./services/tasa_bcv_service');
    const { registrarTasaDiariaAutomatica } = require('./utils/tasa_cambio_diaria');
    const tasaData = await obtenerTasaDiaria();

    const fechaHoy = fechaHoyVzla;
    const nuevaTasa = parseFloat(tasaData.tasa);
    if (!Number.isFinite(nuevaTasa) || nuevaTasa <= 0) {
        return {
            statusCode: 400,
            payload: {
                error: 'La tasa consultada no es válida',
                accion: 'tasa_invalida'
            }
        };
    }

    // Regla explícita: misma fecha + mismo monto => no insertar/actualizar
    const duplicadoMismaFechaMonto = await db.query(
        `SELECT id, fecha, tasa_bcv
         FROM tasas_cambio
         WHERE fecha = $1
           AND ABS(CAST(tasa_bcv AS NUMERIC) - $2::NUMERIC) < 0.0001
         ORDER BY id DESC
         LIMIT 1`,
        [fechaHoy, nuevaTasa]
    );
    if (duplicadoMismaFechaMonto.rows.length > 0) {
        return {
            statusCode: 200,
            payload: {
                mensaje: 'La tasa consultada ya existe para la misma fecha. No se insertó registro.',
                tasa: nuevaTasa,
                fuente: tasaData.fuente,
                fecha: fechaHoy,
                accion: 'sin_cambios'
            }
        };
    }

    const existente = await db.query(
        'SELECT id, tasa_bcv FROM tasas_cambio WHERE fecha = $1',
        [fechaHoy]
    );

    if (existente.rows.length > 0) {
        const tasaActual = parseFloat(existente.rows[0].tasa_bcv);
        const mismaTasa = Number.isFinite(tasaActual) && Math.abs(tasaActual - nuevaTasa) < 0.0001;

        if (mismaTasa) {
            return {
                statusCode: 200,
                payload: {
                    mensaje: 'La tasa consultada es igual a la registrada. No se realizaron cambios.',
                    tasa: nuevaTasa,
                    fuente: tasaData.fuente,
                    fecha: fechaHoy,
                    accion: 'sin_cambios'
                }
            };
        }

        // Mantener una sola tasa activa: desactivar las demás
        await db.query('UPDATE tasas_cambio SET activa = false WHERE activa = true AND fecha <> $1', [fechaHoy]);
        await db.query(
            'UPDATE tasas_cambio SET tasa_bcv = $1, fuente = $2, activa = true, actualizado_en = NOW() WHERE fecha = $3',
            [nuevaTasa, tasaData.fuente, fechaHoy]
        );
        await registrarTasaDiariaAutomatica(nuevaTasa, 'auto_bcv', ipAddress, userAgent);

        return {
            statusCode: 200,
            payload: {
                mensaje: 'Tasa actualizada correctamente',
                tasa: nuevaTasa,
                fuente: tasaData.fuente,
                fecha: fechaHoy,
                accion: 'actualizada'
            }
        };
    }

    // Mantener una sola tasa activa: desactivar las anteriores
    await db.query('UPDATE tasas_cambio SET activa = false WHERE activa = true');
    await db.query(
        'INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente, activa) VALUES ($1, $2, $3, true)',
        [fechaHoy, nuevaTasa, tasaData.fuente]
    );
    await registrarTasaDiariaAutomatica(nuevaTasa, 'auto_bcv', ipAddress, userAgent);

    return {
        statusCode: 200,
        payload: {
            mensaje: 'Tasa insertada correctamente',
            tasa: nuevaTasa,
            fuente: tasaData.fuente,
            fecha: fechaHoy,
            accion: 'insertada'
        }
    };
}

// Obtener tasa de cambio actual (con lógica de horario del BCV)
app.get('/api/tasas-cambio/actual', async (req, res) => {
    try {
        const horaVenezuela = getVenezuelaNow();
        const horaActual = horaVenezuela.getHours();
        const fechaActual = obtenerFechaVenezuelaISO(horaVenezuela);
        
        // El BCV publica a las 4:00 PM y aplica al día siguiente hábil
        const yaPublicadoHoy = horaActual >= 16; // Después de las 4 PM
        
        let fechaAplicacion;
        if (yaPublicadoHoy) {
            // Si ya se publicó hoy, la tasa aplica para mañana
            const manana = new Date(horaVenezuela);
            manana.setDate(manana.getDate() + 1);
            
            // Si mañana es sábado, pasar a lunes
            if (manana.getDay() === 6) {
                manana.setDate(manana.getDate() + 2);
            }
            // Si mañana es domingo, pasar a lunes
            else if (manana.getDay() === 0) {
                manana.setDate(manana.getDate() + 1);
            }
            
            fechaAplicacion = manana.toISOString().split('T')[0];
        } else {
            // Si aún no se publica, la tasa aplica para hoy
            fechaAplicacion = fechaActual;
        }
        
        console.log(' Lógica horario BCV:', {
            hora_actual: horaActual,
            ya_publicado_hoy: yaPublicadoHoy,
            fecha_aplicacion: fechaAplicacion
        });
        
        // Buscar tasa para la fecha de aplicación
        const result = await db.query(
            'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY creado_en DESC LIMIT 1',
            [fechaAplicacion]
        );
        
        if (result.rows.length > 0) {
            const tasa = result.rows[0];
            const respuesta = {
                tasa: parseFloat(tasa.tasa_bcv),
                fecha: tasa.fecha,
                fuente: tasa.fuente,
                desde_tabla: true,
                fecha_aplicacion: fechaAplicacion,
                fecha_actual: fechaActual,
                hora_actual: `${horaActual.toString().padStart(2, '0')}:${horaVenezuela.getMinutes().toString().padStart(2, '0')}`,
                ya_publicado_hoy: yaPublicadoHoy,
                es_tasa_manana: yaPublicadoHoy,
                nota: yaPublicadoHoy ? 'Tasa publicada hoy, aplica para mañana' : 'Tasa vigente de hoy'
            };
            
            console.log(' Tasa vigente:', respuesta);
            res.json(respuesta);
        } else {
            // Si no hay tasa, buscar la más reciente
            const resultReciente = await db.query(
                'SELECT * FROM tasas_cambio WHERE activa = true ORDER BY fecha DESC LIMIT 1'
            );
            
            if (resultReciente.rows.length > 0) {
                const tasa = resultReciente.rows[0];
                res.json({
                    tasa: parseFloat(tasa.tasa_bcv),
                    fecha: tasa.fecha,
                    fuente: tasa.fuente,
                    desde_tabla: true,
                    fecha_aplicacion: fechaAplicacion,
                    fecha_actual: fechaActual,
                    hora_actual: `${horaActual.toString().padStart(2, '0')}:${horaVenezuela.getMinutes().toString().padStart(2, '0')}`,
                    ya_publicado_hoy: yaPublicadoHoy,
                    es_tasa_manana: yaPublicadoHoy,
                    nota: `Usando tasa más reciente (${tasa.fecha})`
                });
            } else {
                // Valor por defecto
                res.json({
                    tasa: 40.00,
                    fecha: fechaAplicacion,
                    fuente: 'Valor por defecto',
                    desde_tabla: false,
                    fecha_aplicacion: fechaAplicacion,
                    fecha_actual: fechaActual,
                    hora_actual: `${horaActual.toString().padStart(2, '0')}:${horaVenezuela.getMinutes().toString().padStart(2, '0')}`,
                    ya_publicado_hoy: yaPublicadoHoy,
                    es_tasa_manana: yaPublicadoHoy,
                    nota: 'Sin tasas registradas, usando valor por defecto'
                });
            }
        }
    } catch (error) {
        console.error('Error obteniendo tasa actual:', error);
        res.status(500).json({ error: 'Error al obtener tasa de cambio' });
    }
});

// Obtener estado de publicación del BCV
app.get('/api/tasas-cambio/estado-publicacion', async (req, res) => {
    try {
        const horaVenezuela = getVenezuelaNow();
        const horaActual = horaVenezuela.getHours();
        const fechaActual = obtenerFechaVenezuelaISO(horaVenezuela);
        
        const yaPublicadoHoy = horaActual >= 16;
        const horaPublicacion = '16:00';
        const minutosRestantes = yaPublicadoHoy ? 0 : (16 * 60) - (horaActual * 60) - horaVenezuela.getMinutes();
        
        const estado = {
            fecha_actual: fechaActual,
            hora_actual: `${horaActual.toString().padStart(2, '0')}:${horaVenezuela.getMinutes().toString().padStart(2, '0')}`,
            hora_publicacion: horaPublicacion,
            ya_publicado_hoy: yaPublicadoHoy,
            minutos_para_publicacion: Math.max(0, minutosRestantes),
            proxima_publicacion: yaPublicadoHoy ? 'mañana a las 4:00 PM' : `hoy a las 4:00 PM`
        };
        
        console.log('📊 Estado de publicación BCV:', estado);
        res.json(estado);
    } catch (error) {
        console.error('Error obteniendo estado de publicación:', error);
        res.status(500).json({ error: 'Error al obtener estado de publicación' });
    }
});

// Obtener todas las tasas con filtros
app.get('/api/tasas-cambio', async (req, res) => {
    try {
        const { periodo, fecha_inicio, fecha_fin } = req.query;
        let query = 'SELECT * FROM tasas_cambio WHERE 1=1';
        const params = [];
        
        if (periodo === 'dia') {
            const fecha = fecha_inicio || new Date().toISOString().split('T')[0];
            query += ' AND DATE(fecha) = DATE($1)';
            params.push(fecha);
        } else if (periodo === 'semana') {
            if (fecha_inicio) {
                query += ' AND fecha >= $1 AND fecha <= $2';
                params.push(fecha_inicio, fecha_fin);
            } else {
                // Última semana
                const semanaAtras = new Date();
                semanaAtras.setDate(semanaAtras.getDate() - 7);
                query += ' AND fecha >= $1';
                params.push(semanaAtras.toISOString().split('T')[0]);
            }
        } else if (periodo === 'mes') {
            if (fecha_inicio) {
                query += ' AND fecha >= $1 AND fecha <= $2';
                params.push(fecha_inicio, fecha_fin);
            } else {
                // Último mes
                const mesAtras = new Date();
                mesAtras.setMonth(mesAtras.getMonth() - 1);
                query += ' AND fecha >= $1';
                params.push(mesAtras.toISOString().split('T')[0]);
            }
        } else if (periodo === 'año') {
            if (fecha_inicio) {
                query += ' AND fecha >= $1 AND fecha <= $2';
                params.push(fecha_inicio, fecha_fin);
            } else {
                // Último año
                const añoAtras = new Date();
                añoAtras.setFullYear(añoAtras.getFullYear() - 1);
                query += ' AND fecha >= $1';
                params.push(añoAtras.toISOString().split('T')[0]);
            }
        }
        
        query += ' ORDER BY fecha DESC';
        
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tasas:', error);
        res.status(500).json({ error: 'Error al obtener tasas de cambio' });
    }
});

// Crear o actualizar tasa de cambio
app.post('/api/tasas-cambio', async (req, res) => {
    try {
        const { fecha, tasa_bcv, fuente } = req.body;
        const ip_address = req.ip;
        const user_agent = req.get('User-Agent');
        const fechaNormalizada = normalizarFechaTasaInput(fecha);
        
        if (!fechaNormalizada || !tasa_bcv) {
            return res.status(400).json({ error: 'Fecha y tasa son requeridos' });
        }
        
        // Verificar si ya existe una tasa para esa fecha
        const existente = await db.query(
            'SELECT id FROM tasas_cambio WHERE DATE(fecha) = DATE($1)',
            [fechaNormalizada]
        );
        
        if (existente.rows.length > 0) {
            // Mantener una sola tasa activa: desactivar las demás
            await db.query('UPDATE tasas_cambio SET activa = false WHERE activa = true AND DATE(fecha) <> DATE($1)', [fechaNormalizada]);

            // Actualizar tasa existente
            await db.query(
                'UPDATE tasas_cambio SET tasa_bcv = $1, fuente = $2, activa = true, actualizado_en = NOW() WHERE DATE(fecha) = DATE($3)',
                [tasa_bcv, fuente || 'BCV', fechaNormalizada]
            );
            
            // También actualizar en la tabla diaria
            const { registrarTasaDiariaAutomatica } = require('./utils/tasa_cambio_diaria');
            await registrarTasaDiariaAutomatica(tasa_bcv, 'manual', ip_address, user_agent);
            
            res.json({ mensaje: 'Tasa actualizada correctamente' });
        } else {
            // Mantener una sola tasa activa: desactivar las anteriores
            await db.query('UPDATE tasas_cambio SET activa = false WHERE activa = true');

            // Crear nueva tasa
            await db.query(
                'INSERT INTO tasas_cambio (fecha, tasa_bcv, fuente, activa) VALUES ($1, $2, $3, true)',
                [fechaNormalizada, tasa_bcv, fuente || 'BCV']
            );
            
            // También registrar en la tabla diaria
            const { registrarTasaDiariaAutomatica } = require('./utils/tasa_cambio_diaria');
            await registrarTasaDiariaAutomatica(tasa_bcv, 'manual', ip_address, user_agent);
            
            res.json({ mensaje: 'Tasa creada correctamente' });
        }
    } catch (error) {
        console.error('Error guardando tasa:', error);
        res.status(500).json({ error: 'Error al guardar tasa de cambio' });
    }
});

// Eliminar tasa de cambio
app.delete('/api/tasas-cambio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query('DELETE FROM tasas_cambio WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tasa no encontrada' });
        }
        
        res.json({ mensaje: 'Tasa eliminada correctamente' });
    } catch (error) {
        console.error('Error eliminando tasa:', error);
        res.status(500).json({ error: 'Error al eliminar tasa de cambio' });
    }
});

// Actualizar tasa diaria automáticamente
app.post('/api/tasas-cambio/actualizar-diaria', async (req, res) => {
    try {
        const result = await ejecutarActualizacionTasaDiaria({
            forzarHorario: false,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        return res.status(result.statusCode).json(result.payload);
    } catch (error) {
        console.error('Error actualizando tasa diaria:', error);
        res.status(500).json({ 
            error: 'Error al actualizar tasa diaria',
            detalle: error.message 
        });
    }
});

// Obtener resumen semanal de tasas
app.get('/api/tasas-cambio/resumen-semanal', async (req, res) => {
    try {
        const { obtenerResumenSemanal } = require('./services/tasa_semanal_service');
        
        const resumen = await obtenerResumenSemanal(db);
        
        console.log('📈 Resumen semanal:', resumen);
        
        res.json(resumen);
    } catch (error) {
        console.error('Error obteniendo resumen semanal:', error);
        res.status(500).json({ error: 'Error al obtener resumen semanal' });
    }
});

// ============================================

async function initDb() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS clientes (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(150) NOT NULL,
                telefono VARCHAR(30),
                email VARCHAR(150),
                direccion TEXT,
                notas TEXT,
                creado_en TIMESTAMP DEFAULT NOW(),
                actualizado_en TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS ventas (
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
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS venta_detalles (
                id SERIAL PRIMARY KEY,
                venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
                producto_id INTEGER REFERENCES productos(id),
                cantidad DECIMAL(10,3) NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL,
                total_linea DECIMAL(12,2) NOT NULL,
                precio_moneda_original DECIMAL(10,2),
                moneda_original VARCHAR(10) DEFAULT 'USD'
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS venta_pagos (
                id SERIAL PRIMARY KEY,
                venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
                monto DECIMAL(12,2) NOT NULL,
                monto_ves DECIMAL(14,2),
                monto_bs DECIMAL(14,2),
                monto_usd DECIMAL(14,2),
                metodo_pago VARCHAR(50),
                referencia_pago VARCHAR(100),
                tasa_cambio DECIMAL(12,4) DEFAULT 1,
                fecha TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS pedido_pagos (
                id SERIAL PRIMARY KEY,
                pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                monto DECIMAL(12,2) NOT NULL,
                metodo_pago VARCHAR(50),
                referencia_pago VARCHAR(100),
                fecha TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS gastos_operativos (
                id SERIAL PRIMARY KEY,
                concepto VARCHAR(220) NOT NULL,
                categoria VARCHAR(60) DEFAULT 'general',
                monto_usd DECIMAL(14,2) DEFAULT 0,
                monto_bs DECIMAL(14,2) DEFAULT 0,
                metodo_pago VARCHAR(30) DEFAULT 'bs',
                referencia_pago VARCHAR(120),
                tasa_aplicada DECIMAL(14,4),
                notas TEXT,
                usuario_registro VARCHAR(120) DEFAULT 'sistema',
                fecha TIMESTAMP DEFAULT NOW(),
                creado_en TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS historial_productos_modificaciones (
                id SERIAL PRIMARY KEY,
                producto_id INTEGER NOT NULL,
                producto_nombre VARCHAR(180),
                tipo_modificacion VARCHAR(30) NOT NULL,
                valor_anterior TEXT,
                valor_nuevo TEXT,
                usuario VARCHAR(120) DEFAULT 'sistema',
                fecha TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS produccion (
                id SERIAL PRIMARY KEY,
                receta_id INTEGER REFERENCES recetas(id),
                cantidad_lotes INTEGER NOT NULL DEFAULT 1,
                cantidad_producida DECIMAL(10,3) NOT NULL DEFAULT 0,
                costo_total_receta DECIMAL(12,2) DEFAULT 0,
                lote VARCHAR(80),
                usuario_proceso VARCHAR(120) DEFAULT 'sistema',
                fecha_elaboracion TIMESTAMP DEFAULT NOW(),
                unidad_producida VARCHAR(20) DEFAULT 'kg',
                fecha TIMESTAMP DEFAULT NOW(),
                notas TEXT
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS produccion_detalle (
                id SERIAL PRIMARY KEY,
                produccion_id INTEGER REFERENCES produccion(id) ON DELETE CASCADE,
                ingrediente_id INTEGER REFERENCES ingredientes(id),
                ingrediente_nombre VARCHAR(180),
                ingrediente_unidad VARCHAR(20),
                porcentaje DECIMAL(10,3) DEFAULT 0,
                cantidad_consumida DECIMAL(12,3) DEFAULT 0,
                costo_unitario DECIMAL(12,4) DEFAULT 0,
                costo_total DECIMAL(12,2) DEFAULT 0
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS produccion_config_proteinas (
                id SERIAL PRIMARY KEY,
                patron VARCHAR(120) NOT NULL UNIQUE,
                descripcion TEXT,
                activo BOOLEAN DEFAULT TRUE,
                creado_en TIMESTAMP DEFAULT NOW(),
                actualizado_en TIMESTAMP DEFAULT NOW()
            )
        `);
        // Migraciones: agregar columnas faltantes si la tabla ya existe
        const migrations = [
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS total_ves DECIMAL(14,2)`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(10) DEFAULT 'USD'`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tasa_cambio_usada DECIMAL(12,4) DEFAULT 1`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS tipo_venta VARCHAR(20) DEFAULT 'inmediato'`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(50)`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(100)`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS estado_pago VARCHAR(20) DEFAULT 'pagado'`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(12,2) DEFAULT 0`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(12,2) DEFAULT 0`,
            `ALTER TABLE ventas ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP DEFAULT NOW()`,
            `ALTER TABLE venta_detalles ADD COLUMN IF NOT EXISTS precio_moneda_original DECIMAL(10,2)`,
            `ALTER TABLE venta_detalles ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(10) DEFAULT 'USD'`,
            `ALTER TABLE venta_pagos ADD COLUMN IF NOT EXISTS monto_bs DECIMAL(14,2)`,
            `ALTER TABLE venta_pagos ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(14,2)`,
            `ALTER TABLE venta_pagos ADD COLUMN IF NOT EXISTS moneda_original VARCHAR(10) DEFAULT 'USD'`,
            `ALTER TABLE venta_pagos ADD COLUMN IF NOT EXISTS monto_original DECIMAL(14,2)`,
            `ALTER TABLE pedido_items ADD COLUMN IF NOT EXISTS peso_entregado DECIMAL(10,3) DEFAULT 0`,
            `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(12,2) DEFAULT 0`,
            `ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(12,2) DEFAULT 0`,
            `ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto VARCHAR(20) DEFAULT 'producido'`,
            `ALTER TABLE productos ADD COLUMN IF NOT EXISTS animal_origen VARCHAR(40)`,
            `ALTER TABLE productos ADD COLUMN IF NOT EXISTS cantidad_piezas INTEGER DEFAULT 0`,
            `ALTER TABLE productos ADD COLUMN IF NOT EXISTS peso_total DECIMAL(12,3) DEFAULT 0`,
            `ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_canal DECIMAL(12,2) DEFAULT 0`,
            `ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagen_url TEXT`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS categoria VARCHAR(60) DEFAULT 'general'`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS monto_usd DECIMAL(14,2) DEFAULT 0`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS monto_bs DECIMAL(14,2) DEFAULT 0`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(30) DEFAULT 'bs'`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS referencia_pago VARCHAR(120)`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS tasa_aplicada DECIMAL(14,4)`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS notas TEXT`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS usuario_registro VARCHAR(120) DEFAULT 'sistema'`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS fecha TIMESTAMP DEFAULT NOW()`,
            `ALTER TABLE gastos_operativos ADD COLUMN IF NOT EXISTS creado_en TIMESTAMP DEFAULT NOW()`,
            `ALTER TABLE produccion ADD COLUMN IF NOT EXISTS costo_total_receta DECIMAL(12,2) DEFAULT 0`,
            `ALTER TABLE produccion ADD COLUMN IF NOT EXISTS lote VARCHAR(80)`,
            `ALTER TABLE produccion ADD COLUMN IF NOT EXISTS usuario_proceso VARCHAR(120) DEFAULT 'sistema'`,
            `ALTER TABLE produccion ADD COLUMN IF NOT EXISTS fecha_elaboracion TIMESTAMP DEFAULT NOW()`,
            `ALTER TABLE produccion ADD COLUMN IF NOT EXISTS unidad_producida VARCHAR(20) DEFAULT 'kg'`,
        ];
        for (const sql of migrations) {
            try { await db.query(sql); } catch (e) { /* columna ya existe */ }
        }
        try {
            const cfgCount = await db.query('SELECT COUNT(*)::int AS total FROM produccion_config_proteinas');
            if ((cfgCount.rows?.[0]?.total || 0) === 0) {
                await db.query(`
                    INSERT INTO produccion_config_proteinas (patron, descripcion, activo)
                    VALUES
                        ('pollo', 'Patron base proteina', TRUE),
                        ('cerdo', 'Patron base proteina', TRUE),
                        ('res', 'Patron base proteina', TRUE),
                        ('cordero', 'Patron base proteina', TRUE),
                        ('manteca', 'Patron base proteina', TRUE)
                    ON CONFLICT (patron) DO NOTHING
                `);
            }
        } catch (e) {
            console.warn('No se pudo inicializar produccion_config_proteinas:', e.message);
        }
        try {
            await db.query(`
                UPDATE venta_pagos
                SET monto_bs = COALESCE(monto_bs, monto_ves, monto)
                WHERE monto_bs IS NULL
            `);
            await db.query(`
                UPDATE venta_pagos
                SET monto_usd = COALESCE(
                    monto_usd,
                    CASE
                        WHEN COALESCE(tasa_cambio, 0) > 0 THEN COALESCE(monto_bs, monto_ves, monto) / tasa_cambio
                        ELSE COALESCE(monto_original, monto)
                    END
                )
                WHERE monto_usd IS NULL
            `);
        } catch (e) {
            console.warn('No se pudo completar backfill de montos USD/BS en venta_pagos:', e.message);
        }
        // Tabla de pedidos
        await db.query(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id SERIAL PRIMARY KEY,
                cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
                cliente_nombre VARCHAR(150),
                total_estimado DECIMAL(12,2) DEFAULT 0,
                notas TEXT,
                fecha_entrega DATE,
                estado VARCHAR(20) DEFAULT 'pendiente',
                venta_id INTEGER REFERENCES ventas(id) ON DELETE SET NULL,
                creado_en TIMESTAMP DEFAULT NOW(),
                actualizado_en TIMESTAMP DEFAULT NOW()
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS pedido_items (
                id SERIAL PRIMARY KEY,
                pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
                producto_id INTEGER REFERENCES productos(id),
                cantidad_pedida DECIMAL(10,3) NOT NULL,
                cantidad_entregada DECIMAL(10,3) DEFAULT 0,
                peso_entregado DECIMAL(10,3) DEFAULT 0,
                precio_unitario DECIMAL(10,2) NOT NULL
            )
        `);
        // Tabla de usuarios
        await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                usuario VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(100) NOT NULL,
                rol VARCHAR(20) NOT NULL DEFAULT 'vendedor',
                activo BOOLEAN DEFAULT TRUE,
                creado_en TIMESTAMP DEFAULT NOW(),
                ultimo_acceso TIMESTAMP
            )
        `);
        // Migrar contraseñas en texto plano a bcrypt (usuarios existentes)
        const usuariosPlanos = await db.query(`SELECT id, password FROM usuarios`);
        for (const u of usuariosPlanos.rows) {
            if (!u.password.startsWith('$2')) {
                const hashed = await bcrypt.hash(u.password, 10);
                await db.query(`UPDATE usuarios SET password = $1 WHERE id = $2`, [hashed, u.id]);
                console.log(`Contraseña hasheada para usuario id=${u.id}`);
            }
        }

        // Usuario admin por defecto si no existe ninguno
        const adminExiste = await db.query(`SELECT id FROM usuarios WHERE usuario = 'admin'`);
        if (adminExiste.rows.length === 0) {
            let adminPass = process.env.ADMIN_PASS || '';
            if (!adminPass) {
                if (NODE_ENV === 'production') {
                    throw new Error('ADMIN_PASS es obligatorio en producción cuando no existe usuario admin');
                }
                adminPass = crypto.randomBytes(10).toString('base64url');
                console.warn('⚠️ ADMIN_PASS no definido. Se generó una contraseña temporal para admin en entorno no productivo.');
            }
            const hashedAdmin = await bcrypt.hash(adminPass, 10);
            await db.query(
                `INSERT INTO usuarios (nombre, usuario, password, rol) VALUES ($1, $2, $3, $4)`,
                ['Administrador', 'admin', hashedAdmin, 'admin']
            );
            console.log(`Usuario admin creado: usuario=admin, password=${adminPass}`);
        }
        console.log('Tablas verificadas/creadas correctamente');
    } catch (error) {
        console.error('Error al inicializar DB:', error.message);
    }
}

// PAGAR VENTA (marcar como pagada)
app.post('/api/ventas/:id/pagar', async (req, res) => {
    const { id } = req.params;
    const { metodo_pago, referencia_pago, tasa_cambio } = req.body;
    
    console.log('💳 PAGAR VENTA:', { id, metodo_pago, referencia_pago, tasa_cambio });
    
    try {
        // 1. Obtener información de la venta
        const ventaResult = await db.query(`SELECT * FROM ventas WHERE id = $1`, [id]);
        if (ventaResult.rows.length === 0) {
            console.log('❌ Venta no encontrada:', id);
            return res.status(404).json({ error: 'Venta no encontrada' });
        }
        
        const venta = ventaResult.rows[0];
        console.log('📋 Venta encontrada:', { id: venta.id, estado_pago: venta.estado_pago, total: venta.total });
        
        if (venta.estado_pago === 'pagado') {
            console.log('❌ Venta ya está pagada:', venta.id);
            return res.status(400).json({ error: 'Esta venta ya está pagada' });
        }
        
        // 2. Actualizar venta a pagada
        await db.query(`
            UPDATE ventas 
            SET estado_pago = 'pagado',
                monto_pagado = total,
                saldo_pendiente = 0,
                metodo_pago = $1,
                referencia_pago = $2,
                actualizado_en = NOW()
            WHERE id = $3
        `, [metodo_pago || 'efectivo', referencia_pago || null, id]);
        
        console.log('✅ Venta marcada como pagada:', id);
        
        res.json({
            mensaje: 'Venta pagada correctamente',
            venta_id: parseInt(id),
            metodo_pago: metodo_pago || 'efectivo'
        });
        
    } catch (error) {
        console.error('❌ Error al pagar venta:', error.message);
        res.status(500).json({ error: 'Error al pagar venta', detalle: error.message });
    }
});

// ============================================
// ENDPOINTS PARA TASAS DE CAMBIO DIARIAS
// ============================================

// Obtener todas las tasas de cambio diarias
app.get('/api/tasas-cambio-diarias', async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT * FROM tasas_cambio_diarias 
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (fecha_inicio) {
            query += ` AND fecha >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }
        
        if (fecha_fin) {
            query += ` AND fecha <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }
        
        query += ` ORDER BY fecha DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        
        const result = await db.query(query, params);
        
        // Obtener conteo total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM tasas_cambio_diarias 
            WHERE 1=1
            ${fecha_inicio ? `AND fecha >= '${fecha_inicio}'` : ''}
            ${fecha_fin ? `AND fecha <= '${fecha_fin}'` : ''}
        `;
        const countResult = await db.query(countQuery);
        
        res.json({
            tasas: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (error) {
        console.error('❌ Error al obtener tasas de cambio diarias:', error.message);
        res.status(500).json({ error: 'Error al obtener tasas de cambio diarias' });
    }
});

// Obtener tasa de cambio de un día específico
app.get('/api/tasas-cambio-diarias/:fecha', async (req, res) => {
    try {
        const { fecha } = req.params;
        
        const result = await db.query(
            'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
            [fecha]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay tasa de cambio para esa fecha' });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('❌ Error al obtener tasa de cambio diaria:', error.message);
        res.status(500).json({ error: 'Error al obtener tasa de cambio diaria' });
    }
});

// Crear o actualizar tasa de cambio diaria
app.post('/api/tasas-cambio-diarias', async (req, res) => {
    try {
        const { fecha, tasa_bcv, tasa_paralelo, usuario } = req.body;
        const ip_address = req.ip;
        const user_agent = req.get('User-Agent');
        
        if (!fecha || !tasa_bcv || !tasa_paralelo) {
            return res.status(400).json({ error: 'Fecha, tasa_bcv y tasa_paralelo son requeridos' });
        }
        
        // Verificar si ya existe una tasa para esa fecha
        const existing = await db.query(
            'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
            [fecha]
        );
        
        if (existing.rows.length > 0) {
            // Actualizar existente
            const result = await db.query(`
                UPDATE tasas_cambio_diarias 
                SET tasa_bcv = $1, tasa_paralelo = $2, usuario = $3, ip_address = $4, user_agent = $5, actualizado_en = CURRENT_TIMESTAMP
                WHERE fecha = $6
                RETURNING *
            `, [tasa_bcv, tasa_paralelo, usuario || 'manual', ip_address, user_agent, fecha]);
            
            console.log('✅ Tasa de cambio diaria actualizada:', result.rows[0]);
            res.json(result.rows[0]);
        } else {
            // Crear nueva
            const result = await db.query(`
                INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [fecha, tasa_bcv, tasa_paralelo, usuario || 'manual', ip_address, user_agent]);
            
            console.log('✅ Tasa de cambio diaria creada:', result.rows[0]);
            res.status(201).json(result.rows[0]);
        }
        
    } catch (error) {
        console.error('❌ Error al guardar tasa de cambio diaria:', error.message);
        res.status(500).json({ error: 'Error al guardar tasa de cambio diaria' });
    }
});

// ============================================
// DASHBOARD - Estadísticas principales
// ============================================

app.get('/api/dashboard/stats', async (req, res) => {
    try {
        console.log('🔍 Obteniendo estadísticas del dashboard...');
        
        // Estadísticas de ventas (corregido para manejar el campo total como texto)
        const ventasStats = await db.query(`
            SELECT 
                COUNT(*) as total_ventas,
                COALESCE(SUM(CAST(REPLACE(REPLACE(total, ',', '.'), '"', '') AS NUMERIC)), 0) as total_ingresos,
                COALESCE(AVG(CAST(REPLACE(REPLACE(total, ',', '.'), '"', '') AS NUMERIC)), 0) as promedio_venta,
                COUNT(CASE WHEN estado_pago = 'pagado' THEN 1 END) as ventas_pagadas,
                COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) as ventas_pendientes,
                COUNT(CASE WHEN DATE(fecha) = CURRENT_DATE THEN 1 END) as ventas_hoy,
                COALESCE(SUM(CASE WHEN DATE(fecha) = CURRENT_DATE THEN CAST(REPLACE(REPLACE(total, ',', '.'), '"', '') AS NUMERIC) ELSE 0 END), 0) as total_hoy
            FROM ventas 
            WHERE DATE(fecha) >= CURRENT_DATE - INTERVAL '30 days'
        `);
        
        // Estadísticas de productos
        const productosStats = await db.query(`
            SELECT 
                COUNT(*) as total_productos,
                COUNT(CASE WHEN activa = true THEN 1 END) as productos_activos,
                COUNT(CASE WHEN stock <= stock_minimo THEN 1 END) as stock_bajo,
                COALESCE(SUM(stock), 0) as total_stock
            FROM productos
        `);
        
        // Estadísticas de pedidos
        const pedidosStats = await db.query(`
            SELECT 
                COUNT(*) as total_pedidos,
                COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pedidos_pendientes,
                COUNT(CASE WHEN estado = 'despachado' THEN 1 END) as pedidos_despachados,
                COUNT(CASE WHEN DATE(fecha_pedido) = CURRENT_DATE THEN 1 END) as pedidos_hoy
            FROM pedidos
            WHERE DATE(fecha_pedido) >= CURRENT_DATE - INTERVAL '30 days'
        `);
        
        // Ventas recientes
        const ventasRecientes = await db.query(`
            SELECT 
                id,
                fecha,
                cliente_nombre,
                CAST(REPLACE(REPLACE(total, ',', '.'), '"', '') AS NUMERIC) as total_limpio,
                estado_pago,
                tipo_venta
            FROM ventas 
            ORDER BY fecha DESC 
            LIMIT 5
        `);
        
        console.log('✅ Estadísticas obtenidas correctamente');
        
        res.json({
            ventas: {
                total_ventas: parseInt(ventasStats.rows[0].total_ventas),
                total_ingresos: parseFloat(ventasStats.rows[0].total_ingresos),
                promedio_venta: parseFloat(ventasStats.rows[0].promedio_venta),
                ventas_pagadas: parseInt(ventasStats.rows[0].ventas_pagadas),
                ventas_pendientes: parseInt(ventasStats.rows[0].ventas_pendientes),
                ventas_hoy: parseInt(ventasStats.rows[0].ventas_hoy),
                total_hoy: parseFloat(ventasStats.rows[0].total_hoy)
            },
            productos: {
                total_productos: parseInt(productosStats.rows[0].total_productos),
                productos_activos: parseInt(productosStats.rows[0].productos_activos),
                stock_bajo: parseInt(productosStats.rows[0].stock_bajo),
                total_stock: parseFloat(productosStats.rows[0].total_stock)
            },
            pedidos: {
                total_pedidos: parseInt(pedidosStats.rows[0].total_pedidos),
                pedidos_pendientes: parseInt(pedidosStats.rows[0].pedidos_pendientes),
                pedidos_despachados: parseInt(pedidosStats.rows[0].pedidos_despachados),
                pedidos_hoy: parseInt(pedidosStats.rows[0].pedidos_hoy)
            },
            ventas_recientes: ventasRecientes.rows
        });
        
    } catch (error) {
        console.error('❌ Error al obtener estadísticas del dashboard:', error.message);
        res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
    }
});

// Obtener estadísticas de tasas de cambio
app.get('/api/tasas-cambio-diarias/estadisticas', async (req, res) => {
    try {
        const { dias = 30 } = req.query;
        
        // Estadísticas generales
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_registros,
                AVG(tasa_bcv) as promedio_bcv,
                AVG(tasa_paralelo) as promedio_paralelo,
                MIN(tasa_bcv) as min_bcv,
                MAX(tasa_bcv) as max_bcv,
                MIN(tasa_paralelo) as min_paralelo,
                MAX(tasa_paralelo) as max_paralelo
            FROM tasas_cambio_diarias 
            WHERE fecha >= CURRENT_DATE - INTERVAL '${dias} days'
        `);
        
        // Tasas de los últimos días
        const ultimas_tasas = await db.query(`
            SELECT fecha, tasa_bcv, tasa_paralelo
            FROM tasas_cambio_diarias 
            WHERE fecha >= CURRENT_DATE - INTERVAL '${dias} days'
            ORDER BY fecha DESC
            LIMIT 7
        `);
        
        // Tendencia (comparación con el día anterior)
        const tendencia = await db.query(`
            SELECT 
                (SELECT tasa_bcv FROM tasas_cambio_diarias WHERE fecha = CURRENT_DATE) as hoy,
                (SELECT tasa_bcv FROM tasas_cambio_diarias WHERE fecha = CURRENT_DATE - INTERVAL '1 day') as ayer,
                (SELECT tasa_bcv FROM tasas_cambio_diarias WHERE fecha = CURRENT_DATE - INTERVAL '7 days') as semana_pasada
        `);
        
        res.json({
            estadisticas: stats.rows[0],
            ultimas_tasas: ultimas_tasas.rows,
            tendencia: tendencia.rows[0],
            periodo_analizado: `${dias} días`
        });
        
    } catch (error) {
        console.error('❌ Error al obtener estadísticas de tasas:', error.message);
        res.status(500).json({ error: 'Error al obtener estadísticas de tasas' });
    }
});

// Endpoint para registrar automáticamente la tasa del día
app.post('/api/tasas-cambio-diarias/auto-registrar', async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const ip_address = req.ip;
        const user_agent = req.get('User-Agent');
        
        // Verificar si ya existe para hoy
        const existing = await db.query(
            'SELECT * FROM tasas_cambio_diarias WHERE fecha = $1',
            [hoy]
        );
        
        if (existing.rows.length > 0) {
            return res.json({ 
                mensaje: 'Ya existe una tasa de cambio para hoy',
                tasa: existing.rows[0]
            });
        }
        
        // Obtener la tasa actual de la tabla tasas_cambio
        const currentRate = await db.query(
            'SELECT * FROM tasas_cambio WHERE fecha = $1 AND activa = true ORDER BY id DESC LIMIT 1',
            [hoy]
        );
        
        if (currentRate.rows.length > 0) {
            const rate = currentRate.rows[0];
            const result = await db.query(`
                INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                hoy,
                rate.tasa_bcv || 0,
                rate.tasa_bcv || 0,
                'sistema',
                ip_address,
                user_agent
            ]);
            
            console.log('✅ Tasa de cambio del día registrada automáticamente:', result.rows[0]);
            res.json({ 
                mensaje: 'Tasa de cambio del día registrada automáticamente',
                tasa: result.rows[0]
            });
        } else {
            // Insertar tasa por defecto
            const result = await db.query(`
                INSERT INTO tasas_cambio_diarias (fecha, tasa_bcv, tasa_paralelo, usuario, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                hoy,
                50.00,
                52.00,
                'sistema',
                ip_address,
                user_agent
            ]);
            
            console.log('✅ Tasa de cambio por defecto registrada automáticamente:', result.rows[0]);
            res.json({ 
                mensaje: 'Tasa de cambio por defecto registrada automáticamente',
                tasa: result.rows[0]
            });
        }
        
    } catch (error) {
        console.error('❌ Error al registrar automáticamente tasa:', error.message);
        res.status(500).json({ error: 'Error al registrar automáticamente tasa' });
    }
});

// Manejador global de errores: siempre responder JSON (evitar HTML en rutas /api)
app.use((err, req, res, next) => {
    console.error('Error no capturado en ruta:', err?.message || err);
    if (res.headersSent) return next(err);
    res.status(500).json({
        error: 'Error interno del servidor',
        detalle: err?.message || String(err)
    });
});

// Health check endpoint para Render
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

let ultimaEjecucionAutoTasaFecha = null;
const INTERVALO_AUTO_TASA_MS = 60 * 1000; // revisar cada minuto
const HORA_OBJETIVO_AUTO_TASA_MIN = (14 * 60) + 30; // 2:30 PM Venezuela

const iniciarProgramadorTasaDiaria = () => {
    const tick = async () => {
        try {
            const ahoraVzla = getVenezuelaNow();
            const diaSemana = ahoraVzla.getDay();
            const fechaHoyVzla = obtenerFechaVenezuelaISO(ahoraVzla);
            const minutosActuales = (ahoraVzla.getHours() * 60) + ahoraVzla.getMinutes();
            const esDiaHabil = diaSemana >= 1 && diaSemana <= 5;
            const yaEsHora = minutosActuales >= HORA_OBJETIVO_AUTO_TASA_MIN;

            if (!esDiaHabil || !yaEsHora) return;
            if (ultimaEjecucionAutoTasaFecha === fechaHoyVzla) return;

            const result = await ejecutarActualizacionTasaDiaria({
                forzarHorario: true,
                ipAddress: 'scheduler',
                userAgent: 'scheduler:auto-14:30'
            });

            ultimaEjecucionAutoTasaFecha = fechaHoyVzla;
            console.log(`⏰ Auto tasa 14:30 (${fechaHoyVzla}):`, result.payload?.accion || result.payload?.mensaje || 'ok');
        } catch (error) {
            console.error('❌ Error en programador automático de tasa:', error.message);
        }
    };

    // Arranque inmediato por si el servicio reinicia después de las 2:30 PM.
    setTimeout(tick, 8000);
    setInterval(tick, INTERVALO_AUTO_TASA_MS);
    console.log('🕒 Programador de tasa diaria activado (L-V desde 14:30, hora Venezuela)');
};

initDb().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
        console.log(`🌐 Servidor accesible en red: http://192.168.100.224:${PORT}`);
        console.log(`📱 Móvil puede conectar a: http://192.168.100.224:${PORT}`);
        iniciarProgramadorTasaDiaria();
    });
});
