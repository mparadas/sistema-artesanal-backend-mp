const db = require('./config/database');
const pool = db.pool;

async function getUsuarios() {
  try {
    const result = await pool.query('SELECT id, nombre, usuario, rol, activo, creado_en FROM usuarios ORDER BY nombre');
    console.log('=== USUARIOS REGISTRADOS ===');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Nombre: ${user.nombre}`);
      console.log(`Usuario: ${user.usuario}`);
      console.log(`Rol: ${user.rol}`);
      console.log(`Activo: ${user.activo ? 'Sí' : 'No'}`);
      console.log(`Creado: ${user.creado_en}`);
      console.log('---');
    });
    
    console.log('\n=== CREDENCIALES ADMIN ===');
    console.log('Usuario: admin');
    console.log('Contraseña: definida por ADMIN_PASS');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

getUsuarios();
