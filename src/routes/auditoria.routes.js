const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { verificarToken } = require('../middlewares/auth.middleware');

// Obtener todos los registros de auditoría
router.get('/', verificarToken, async (req, res) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para ver la auditoría'
      });
    }

    const result = await query(
      `SELECT a.*, u.nombre as usuario_nombre 
       FROM auditoria a
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 500`
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener registros de auditoría'
    });
  }
});

module.exports = router;