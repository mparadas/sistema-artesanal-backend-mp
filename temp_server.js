const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://192.168.100.224:5173'],
  credentials: true
}));
app.use(express.json());

// Database helper
const db = {
  query: (text, params) => pool.query(text, params),
  pool
};

// Test endpoint
app.get('/api/test-mobile', async (req, res) => {
  try {
    res.json({ 
      status: 'OK', 
      message: 'Conexión exitosa desde móvil',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as fecha');
    res.json({ status: 'OK', database: 'conectada' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'desconectada' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const result = await db.query(
      'SELECT * FROM usuarios WHERE usuario = $1',
      [usuario.trim().toLowerCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign(
      { id: user.id, rol: user.rol, usuario: user.usuario }, 
      'dev_jwt_secret_change_me', 
      { expiresIn: '8h' }
    );

    res.json({
      id: user.id,
      nombre: user.nombre || user.usuario,
      usuario: user.usuario,
      rol: user.rol,
      token
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en login' });
  }
});

// Basic ventas endpoint
app.get('/api/ventas', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.id, v.fecha, v.cliente_id, v.cliente_nombre, v.total, v.estado_pago, 
             v.tipo_venta, v.metodo_pago, v.monto_pagado, v.saldo_pendiente
      FROM ventas v 
      ORDER BY v.fecha DESC 
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Basic clientes endpoint
app.get('/api/clientes', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

// Basic productos endpoint
app.get('/api/productos', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM productos ORDER BY nombre');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// PUT ventas endpoint (para devolver a pendiente)
app.put('/api/ventas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_pago, saldo_pendiente, tipo_venta } = req.body;
    
    const result = await db.query(
      'UPDATE ventas SET estado_pago = COALESCE($1, estado_pago), saldo_pendiente = COALESCE($2, saldo_pendiente), monto_pagado = CASE WHEN $1 = \'pendiente\' THEN 0 ELSE monto_pagado END, actualizado_en = NOW() WHERE id = $3 RETURNING *',
      [estado_pago, saldo_pendiente, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    
    res.json({ mensaje: 'Venta actualizada correctamente', venta: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
});

// Estado de cuenta endpoint
app.get('/api/estado-cuenta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener información del cliente
    const clienteResult = await db.query('SELECT * FROM clientes WHERE id = $1', [id]);
    if (clienteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    
    const cliente = clienteResult.rows[0];
    
    // Obtener ventas del cliente
    const ventasResult = await db.query(`
      SELECT * FROM ventas 
      WHERE cliente_id = $1 OR cliente_nombre = $2 
      ORDER BY fecha DESC
    `, [id, cliente.nombre]);
    
    res.json({
      cliente: cliente,
      ventas: ventasResult.rows,
      resumen: {
        total_ventas: ventasResult.rows.length,
        total_deuda: ventasResult.rows.reduce((sum, v) => sum + parseFloat(v.saldo_pendiente || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error en estado de cuenta:', error);
    res.status(500).json({ error: 'Error al obtener estado de cuenta' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Servidor backend temporal corriendo en http://localhost:${PORT}`);
  console.log(`🌐 Frontend disponible en: http://192.168.100.224:5173`);
});
