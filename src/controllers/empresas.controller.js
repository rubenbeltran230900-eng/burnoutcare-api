const { query } = require('../config/database');

// Obtener todas las empresas
const obtenerEmpresas = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM empresas ORDER BY nombre ASC'
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empresas'
    });
  }
};

// Obtener una empresa por ID
const obtenerEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM empresas WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener empresa'
    });
  }
};

// Crear nueva empresa
const crearEmpresa = async (req, res) => {
  try {
    const { nombre, rfc, sector, direccion, telefono, contacto_nombre, contacto_email } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'El nombre de la empresa es requerido'
      });
    }

    const result = await query(
      `INSERT INTO empresas (nombre, rfc, sector, direccion, telefono, contacto_nombre, contacto_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, rfc || null, sector || null, direccion || null, telefono || null, contacto_nombre || null, contacto_email || null]
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [result.rows[0].id, req.usuario.id, 'CREATE', 'empresas', JSON.stringify({ nombre })]
    );

    res.status(201).json({
      success: true,
      message: 'Empresa creada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear empresa'
    });
  }
};

// Actualizar empresa
const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rfc, sector, direccion, telefono, contacto_nombre, contacto_email, activa } = req.body;

    // Verificar que existe
    const existe = await query('SELECT id FROM empresas WHERE id = $1', [id]);
    
    if (existe.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    const result = await query(
      `UPDATE empresas 
       SET nombre = COALESCE($1, nombre),
           rfc = COALESCE($2, rfc),
           sector = COALESCE($3, sector),
           direccion = COALESCE($4, direccion),
           telefono = COALESCE($5, telefono),
           contacto_nombre = COALESCE($6, contacto_nombre),
           contacto_email = COALESCE($7, contacto_email),
           activa = COALESCE($8, activa),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [nombre, rfc, sector, direccion, telefono, contacto_nombre, contacto_email, activa, id]
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.usuario.id, 'UPDATE', 'empresas', JSON.stringify(req.body)]
    );

    res.json({
      success: true,
      message: 'Empresa actualizada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar empresa'
    });
  }
};

// Eliminar empresa
const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const existe = await query('SELECT id, nombre FROM empresas WHERE id = $1', [id]);
    
    if (existe.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada'
      });
    }

    // Registrar en auditoría antes de eliminar
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, req.usuario.id, 'DELETE', 'empresas', JSON.stringify({ nombre: existe.rows[0].nombre })]
    );

    await query('DELETE FROM empresas WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Empresa eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar empresa'
    });
  }
};

module.exports = {
  obtenerEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa
};