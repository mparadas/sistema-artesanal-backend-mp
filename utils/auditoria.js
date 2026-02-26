const db = require('../config/database');

/**
 * Registra un movimiento en la tabla de auditoría
 * @param {string} tabla - Nombre de la tabla (productos, ingredientes, clientes, etc.)
 * @param {number} registroId - ID del registro afectado
 * @param {string} tipoMovimiento - Tipo de movimiento (INSERT, UPDATE, DELETE)
 * @param {string} usuario - Usuario que realizó el movimiento
 * @param {object} detallesAnteriores - Datos anteriores (para UPDATE)
 * @param {object} detallesNuevos - Datos nuevos (para INSERT, UPDATE)
 * @param {string} ipAddress - Dirección IP del cliente
 * @param {string} userAgent - User agent del cliente
 */
async function registrarAuditoria({
  tabla,
  registroId,
  tipoMovimiento,
  usuario = 'sistema',
  detallesAnteriores = null,
  detallesNuevos = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    const query = `
      INSERT INTO auditoria (
        tabla, registro_id, tipo_movimiento, usuario, 
        detalles_anteriores, detalles_nuevos, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, fecha
    `;
    
    const values = [
      tabla,
      registroId,
      tipoMovimiento,
      usuario,
      detallesAnteriores ? JSON.stringify(detallesAnteriores) : null,
      detallesNuevos ? JSON.stringify(detallesNuevos) : null,
      ipAddress,
      userAgent
    ];
    
    const result = await db.query(query, values);
    
    console.log(`🔍 Auditoría registrada: ${tipoMovimiento} en ${tabla} (ID: ${registroId}) por ${usuario}`);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error al registrar auditoría:', error.message);
    // No lanzamos el error para no interrumpir el flujo principal
  }
}

/**
 * Middleware para Express que captura información del cliente
 */
function middlewareAuditoria(req, res, next) {
  // Guardar información del cliente en el request para uso posterior
  req.auditoria = {
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'],
    userAgent: req.headers['user-agent'],
    usuario: req.headers['x-usuario'] || 'sistema' // Podría venir de un token de autenticación
  };
  next();
}

module.exports = {
  registrarAuditoria,
  middlewareAuditoria
};
