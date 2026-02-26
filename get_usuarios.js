const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

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
    
    console.log('\n=== CLAVES POR DEFECTO ===');
    console.log('Usuario: admin');
    console.log('Contraseña: admin123 (o la que esté en variable de entorno ADMIN_PASS)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

getUsuarios();
