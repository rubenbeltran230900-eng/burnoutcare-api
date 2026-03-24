const { query } = require('../config/database');

const obtenerAuditoria = async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.accion, a.detalle, a.ip, a.created_at,
              u.nombre as usuario_nombre, u.email as usuario_email, u.rol
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 500`,
      []
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener auditoría' });
  }
};

module.exports = { obtenerAuditoria };