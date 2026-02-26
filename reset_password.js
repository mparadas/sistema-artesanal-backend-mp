const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'inventario_artesanal',
  password: 'MAP24',
  port: 5432
});

async function resetPassword() {
  try {
    const newPassword = 'mercedes123'; // Nueva contraseña
    const hashed = await bcrypt.hash(newPassword, 10);
    
    const result = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE usuario = $2',
      [hashed, 'mercedezacp']
    );
    
    console.log('✅ Contraseña actualizada para mercedezacp');
    console.log('Nueva contraseña: ' + newPassword);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetPassword();
