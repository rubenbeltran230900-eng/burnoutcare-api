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
    const { usuario_id, respuestas, puntaje_bp, puntaje_bl, puntaje_bc,
          consentimiento_aceptado, consentimiento_fecha, consentimiento_version } = req.body;

    if (!usuario_id || !respuestas || puntaje_bp === undefined || puntaje_bl === undefined || puntaje_bc === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: usuario_id, respuestas, puntaje_bp, puntaje_bl, puntaje_bc'
      });
    }

    if (!consentimiento_aceptado) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere consentimiento informado para registrar la evaluación'
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
      `INSERT INTO evaluaciones
         (usuario_id, empresa_id, respuestas, puntaje_bp, puntaje_bl, puntaje_bc,
          nivel_bp, nivel_bl, nivel_bc, nivel_riesgo,
          consentimiento_aceptado, consentimiento_fecha, consentimiento_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [usuario_id, empresa_id, JSON.stringify(respuestas), puntaje_bp, puntaje_bl, puntaje_bc,
       nivel_bp, nivel_bl, nivel_bc, nivel_riesgo,
       true, consentimiento_fecha || new Date().toISOString(), consentimiento_version || '1.0-2026-06']
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

// Exportar evaluaciones como CSV (solo administrador y coordinador)
const exportarCSV = async (req, res) => {
  try {
    const { empresa_id } = req.query;

    let whereClause = '';
    const params = [];
    if (empresa_id) {
      whereClause = 'WHERE e.empresa_id = $1';
      params.push(empresa_id);
    }

    const result = await query(
      `SELECT
         e.id,
         e.fecha,
         emp.nombre                                   AS empresa,
         u.nombre                                     AS participante,
         u.area,
         u.puesto,
         -- Demográficos desde JSONB
         e.respuestas->'demograficos'->>'edad'        AS edad,
         e.respuestas->'demograficos'->>'genero'      AS genero,
         e.respuestas->'demograficos'->>'educacion'   AS educacion,
         e.respuestas->'demograficos'->>'sector'      AS sector,
         e.respuestas->'demograficos'->>'industria'   AS industria,
         e.respuestas->'demograficos'->>'nivel_puesto'AS nivel_puesto,
         e.respuestas->'demograficos'->>'experiencia' AS experiencia,
         e.respuestas->'demograficos'->>'horas_semanales' AS horas_semanales,
         e.respuestas->'demograficos'->>'modalidad'   AS modalidad,
         -- Ítems CBI individuales (p1..p19)
         (e.respuestas->'cbi'->>'1')::int  AS p1,
         (e.respuestas->'cbi'->>'2')::int  AS p2,
         (e.respuestas->'cbi'->>'3')::int  AS p3,
         (e.respuestas->'cbi'->>'4')::int  AS p4,
         (e.respuestas->'cbi'->>'5')::int  AS p5,
         (e.respuestas->'cbi'->>'6')::int  AS p6,
         (e.respuestas->'cbi'->>'7')::int  AS p7,
         (e.respuestas->'cbi'->>'8')::int  AS p8,
         (e.respuestas->'cbi'->>'9')::int  AS p9,
         (e.respuestas->'cbi'->>'10')::int AS p10,
         (e.respuestas->'cbi'->>'11')::int AS p11,
         (e.respuestas->'cbi'->>'12')::int AS p12,
         (e.respuestas->'cbi'->>'13')::int AS p13,
         (e.respuestas->'cbi'->>'14')::int AS p14,
         (e.respuestas->'cbi'->>'15')::int AS p15,
         (e.respuestas->'cbi'->>'16')::int AS p16,
         (e.respuestas->'cbi'->>'17')::int AS p17,
         (e.respuestas->'cbi'->>'18')::int AS p18,
         (e.respuestas->'cbi'->>'19')::int AS p19,
         -- Puntajes y niveles
         e.puntaje_bp,
         e.puntaje_bl,
         e.puntaje_bc,
         e.nivel_bp,
         e.nivel_bl,
         e.nivel_bc,
         e.nivel_riesgo,
         -- Cualitativos
         e.respuestas->'cualitativos'->>'factores_ambiente'      AS q1_factores_ambiente,
         e.respuestas->'cualitativos'->>'soporte_organizacional' AS q2_soporte_organizacional,
         e.respuestas->'cualitativos'->>'comentarios'            AS q3_comentarios,
         -- Consentimiento
         e.consentimiento_aceptado,
         e.consentimiento_fecha,
         e.consentimiento_version
       FROM evaluaciones e
       JOIN usuarios  u   ON u.id  = e.usuario_id
       JOIN empresas  emp ON emp.id = e.empresa_id
       ${whereClause}
       ORDER BY e.fecha DESC`,
      params
    );

    // Escapar un campo para CSV (comillas dobles si contiene coma/salto)
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const headers = [
      'id','fecha','empresa','participante','area','puesto',
      'edad','genero','educacion','sector','industria','nivel_puesto','experiencia','horas_semanales','modalidad',
      'p1_BP','p2_BP','p3_BP','p4_BP','p5_BP','p6_BP',
      'p7_BL','p8_BL','p9_BL','p10_BL','p11_BL','p12_BL','p13_BL_inv',
      'p14_BC','p15_BC','p16_BC','p17_BC','p18_BC','p19_BC',
      'puntaje_bp','puntaje_bl','puntaje_bc',
      'nivel_bp','nivel_bl','nivel_bc','nivel_riesgo',
      'q1_factores_ambiente','q2_soporte_organizacional','q3_comentarios',
      'consentimiento_aceptado','consentimiento_fecha','consentimiento_version'
    ];

    const rows = result.rows.map(r => [
      r.id, r.fecha, r.empresa, r.participante, r.area, r.puesto,
      r.edad, r.genero, r.educacion, r.sector, r.industria, r.nivel_puesto, r.experiencia, r.horas_semanales, r.modalidad,
      r.p1, r.p2, r.p3, r.p4, r.p5, r.p6,
      r.p7, r.p8, r.p9, r.p10, r.p11, r.p12, r.p13,
      r.p14, r.p15, r.p16, r.p17, r.p18, r.p19,
      r.puntaje_bp, r.puntaje_bl, r.puntaje_bc,
      r.nivel_bp, r.nivel_bl, r.nivel_bc, r.nivel_riesgo,
      r.q1_factores_ambiente, r.q2_soporte_organizacional, r.q3_comentarios,
      r.consentimiento_aceptado, r.consentimiento_fecha, r.consentimiento_version
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\r\n');
    const fecha = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="burnoutcare_datos_${fecha}.csv"`);
    res.send('﻿' + csv); // BOM para que Excel abra UTF-8 correctamente

  } catch (error) {
    console.error('Error al exportar CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Error al exportar datos'
    });
  }
};

module.exports = {
  obtenerEvaluaciones,
  obtenerEvaluacion,
  crearEvaluacion,
  obtenerEstadisticas,
  eliminarEvaluacion,
  exportarCSV
};