const db = require('./config/database');
require('dotenv').config();

async function check() {
  try {
    const res = await db.query("SELECT id, nombre, stock, peso_total, cantidad_piezas FROM productos WHERE nombre ILIKE '%Hamburguesa Chistorra%'");
    console.log('PRODUCT INFO:', JSON.stringify(res.rows, null, 2));
    
    if (res.rows.length > 0) {
      const id = res.rows[0].id;
      const audit = await db.query("SELECT * FROM auditoria WHERE tabla = 'productos' AND registro_id = $1 ORDER BY fecha DESC LIMIT 5", [id]);
      console.log('AUDIT LOGS:', JSON.stringify(audit.rows, null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
