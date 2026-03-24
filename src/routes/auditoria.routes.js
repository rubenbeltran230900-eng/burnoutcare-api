const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/', verificarToken, verificarRol('administrador'), async (req, res) => {
  try {
    const result = await query(
      `SELECT a.id, a.empresa_id, a.accion, a.modulo, a.detalles, a.created_at,
              u.nombre as usuario_nombre, u.email as usuario_email, u.rol
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 500`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros de auditoría' });
  }
});

module.exports = router;