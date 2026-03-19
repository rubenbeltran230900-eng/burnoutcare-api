const { query } = require('../config/database');

// Obtener todas las evaluaciones
const obtenerEvaluaciones = async (req, res) => {
  try {
    const { empresa_id, usuario_id, nivel_riesgo } = req.query;
    
    let sql = `
      SELECT e.*, u.nombre as usuario_nombre, u.area, u.puesto, emp.nombre as empresa_nombre
      FROM evaluaciones e
      JOIN usuarios u ON e.usuario_id = u.id
      JOIN empresas emp ON e.empresa_id = emp.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (empresa_id) {
      sql += ` AND e.empresa_id = $${paramCount++}`;
      params.push(empresa_id);
    }
    
    if (usuario_id) {
      sql += ` AND e.usuario_id = $${paramCount++}`;
      params.push(usuario_id);
    }
    
    if (nivel_riesgo) {
      sql += ` AND e.nivel_riesgo = $${paramCount++}`;
      params.push(nivel_riesgo);
    }
    
    sql += ' ORDER BY e.fecha DESC';
    
    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener evaluaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evaluaciones'
    });
  }
};

// Obtener una evaluación por ID
const obtenerEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT e.*, u.nombre as usuario_nombre, u.area, u.puesto, emp.nombre as empresa_nombre
       FROM evaluaciones e
       JOIN usuarios u ON e.usuario_id = u.id
       JOIN empresas emp ON e.empresa_id = emp.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al obtener evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener evaluación'
    });
  }
};

// Calcular niveles de burnout según CBI (Copenhagen Burnout Inventory)
const calcularNiveles = (puntaje_bp, puntaje_bl, puntaje_bc) => {
  // Función para determinar nivel según puntaje CBI (0-100)
  const determinarNivel = (puntaje) => {
    if (puntaje < 50) return 'Bajo';
    if (puntaje < 75) return 'Medio';
    return 'Alto';
  };

  const nivel_bp = determinarNivel(puntaje_bp);
  const nivel_bl = determinarNivel(puntaje_bl);
  const nivel_bc = determinarNivel(puntaje_bc);

  // Nivel de riesgo general (el mayor de los tres)
  let nivel_riesgo = 'Bajo';
  if (nivel_bp === 'Alto' || nivel_bl === 'Alto' || nivel_bc === 'Alto') {
    nivel_riesgo = 'Alto';
  } else if (nivel_bp === 'Medio' || nivel_bl === 'Medio' || nivel_bc === 'Medio') {
    nivel_riesgo = 'Medio';
  }

  return { nivel_bp, nivel_bl, nivel_bc, nivel_riesgo };
};

// Crear nueva evaluación
const crearEvaluacion = async (req, res) => {
  try {
    const { usuario_id, respuestas, puntaje_bp, puntaje_bl, puntaje_bc } = req.body;

    if (!usuario_id || !respuestas || puntaje_bp === undefined || puntaje_bl === undefined || puntaje_bc === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: usuario_id, respuestas, puntaje_bp, puntaje_bl, puntaje_bc'
      });
    }

    // Obtener empresa_id del usuario
    const usuarioResult = await query('SELECT empresa_id FROM usuarios WHERE id = $1', [usuario_id]);
    
    if (usuarioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    const empresa_id = usuarioResult.rows[0].empresa_id;

    // Calcular niveles
    const { nivel_bp, nivel_bl, nivel_bc, nivel_riesgo } = calcularNiveles(puntaje_bp, puntaje_bl, puntaje_bc);

    const result = await query(
      `INSERT INTO evaluaciones (usuario_id, empresa_id, respuestas, puntaje_bp, puntaje_bl, puntaje_bc, nivel_bp, nivel_bl, nivel_bc, nivel_riesgo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [usuario_id, empresa_id, JSON.stringify(respuestas), puntaje_bp, puntaje_bl, puntaje_bc, nivel_bp, nivel_bl, nivel_bc, nivel_riesgo]
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [empresa_id, req.usuario.id, 'CREATE', 'evaluaciones', JSON.stringify({ usuario_id, nivel_riesgo })]
    );

    res.status(201).json({
      success: true,
      message: 'Evaluación registrada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear evaluación'
    });
  }
};

// Obtener estadísticas de evaluaciones
const obtenerEstadisticas = async (req, res) => {
  try {
    const { empresa_id } = req.query;

    let whereClause = '';
    const params = [];

    if (empresa_id) {
      whereClause = 'WHERE empresa_id = $1';
      params.push(empresa_id);
    }

    // Total de evaluaciones
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM evaluaciones ${whereClause}`,
      params
    );

    // Distribución por nivel de riesgo
    const distribucionResult = await query(
      `SELECT nivel_riesgo, COUNT(*) as cantidad 
       FROM evaluaciones ${whereClause}
       GROUP BY nivel_riesgo`,
      params
    );

    // Promedios de puntajes CBI
    const promediosResult = await query(
      `SELECT 
         ROUND(AVG(puntaje_bp), 1) as promedio_bp,
         ROUND(AVG(puntaje_bl), 1) as promedio_bl,
         ROUND(AVG(puntaje_bc), 1) as promedio_bc
       FROM evaluaciones ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        total: parseInt(totalResult.rows[0].total),
        distribucion: distribucionResult.rows,
        promedios: promediosResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
};

// Eliminar evaluación
const eliminarEvaluacion = async (req, res) => {
  try {
    const { id } = req.params;

    const existe = await query('SELECT id, empresa_id, usuario_id FROM evaluaciones WHERE id = $1', [id]);
    
    if (existe.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Evaluación no encontrada'
      });
    }

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [existe.rows[0].empresa_id, req.usuario.id, 'DELETE', 'evaluaciones', JSON.stringify({ evaluacion_id: id })]
    );

    await query('DELETE FROM evaluaciones WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Evaluación eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar evaluación:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar evaluación'
    });
  }
};

module.exports = {
  obtenerEvaluaciones,
  obtenerEvaluacion,
  crearEvaluacion,
  obtenerEstadisticas,
  eliminarEvaluacion
};