const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'inventario_artesanal',
  user: 'postgres',
  password: 'MAP24'
});

async function resetAdminUser() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando usuarios existentes...');
    
    // Verificar usuarios existentes
    const result = await client.query('SELECT * FROM usuarios');
    console.log('📋 Usuarios encontrados:', result.rows.length);
    
    result.rows.forEach(user => {
      console.log(`  - ${user.nombre} (${user.usuario}) - Rol: ${user.rol}`);
    });
    
    // Eliminar usuario admin si existe
    await client.query('DELETE FROM usuarios WHERE usuario = $1', ['admin']);
    console.log('🗑️ Usuario admin eliminado si existía');
    
    // Crear nuevo usuario admin
    const insertResult = await client.query(`
      INSERT INTO usuarios (nombre, usuario, password, rol) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, usuario, rol
    `, ['Administrador', 'admin', 'admin123', 'admin']);
    
    console.log('✅ Nuevo usuario admin creado:', insertResult.rows[0]);
    
    console.log('\n🔑 Credenciales de acceso:');
    console.log('   Usuario: admin');
    console.log('   Contraseña: admin123');
    console.log('   Rol: admin');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdminUser();
