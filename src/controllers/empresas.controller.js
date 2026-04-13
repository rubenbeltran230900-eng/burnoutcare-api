const { query } = require('../config/database');

const obtenerEmpresas = async (req, res) => {
  try {
    const result = await query(`
      SELECT e.*, 
             COUNT(u.id) as total_usuarios,
             COUNT(CASE WHEN u.activo = true THEN 1 END) as usuarios_activos
      FROM empresas e
      LEFT JOIN usuarios u ON u.empresa_id = e.id
      GROUP BY e.id
      ORDER BY e.nombre ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al obtener empresas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener empresas' });
  }
};

const obtenerEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT e.*, 
              COUNT(u.id) as total_usuarios,
              COUNT(CASE WHEN u.activo = true THEN 1 END) as usuarios_activos
       FROM empresas e
       LEFT JOIN usuarios u ON u.empresa_id = e.id
       WHERE e.id = $1
       GROUP BY e.id`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener empresa:', error);
    res.status(500).json({ success: false, error: 'Error al obtener empresa' });
  }
};

const crearEmpresa = async (req, res) => {
  try {
    const { nombre, sector, tamanio, contacto_nombre, contacto_email } = req.body;
    if (!nombre) {
      return res.status(400).json({ success: false, error: 'El nombre es requerido' });
    }
    const result = await query(
      `INSERT INTO empresas (nombre, sector, tamanio, contacto_nombre, contacto_email, activo)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [nombre, sector || null, tamanio || null, contacto_nombre || null, contacto_email || null]
    );
    try {
      await query(
        `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
        [result.rows[0].id, req.usuario.id, 'CREATE', 'empresas', JSON.stringify({ nombre })]
      );
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    res.status(201).json({ success: true, message: 'Empresa creada exitosamente', data: result.rows[0] });
  } catch (error) {
    console.error('Error al crear empresa:', error);
    res.status(500).json({ success: false, error: 'Error al crear empresa' });
  }
};

const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sector, tamanio, contacto_nombre, contacto_email } = req.body;

    const existe = await query('SELECT id FROM empresas WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }

    const result = await query(
      `UPDATE empresas SET nombre=$1, sector=$2, tamanio=$3, contacto_nombre=$4, contacto_email=$5
       WHERE id=$6 RETURNING *`,
      [nombre, sector || null, tamanio || null, contacto_nombre || null, contacto_email || null, id]
    );

    try {
      await query(
        `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
        [id, req.usuario.id, 'UPDATE', 'empresas', JSON.stringify({ nombre })]
      );
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    res.json({ success: true, message: 'Empresa actualizada exitosamente', data: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar empresa:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar empresa' });
  }
};

const toggleActivoEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const existe = await query('SELECT id, activo, nombre FROM empresas WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }
    const nuevoEstado = !existe.rows[0].activo;
    const result = await query(
      'UPDATE empresas SET activo=$1 WHERE id=$2 RETURNING *',
      [nuevoEstado, id]
    );
    try {
      await query(
        `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
        [id, req.usuario.id, nuevoEstado ? 'ACTIVATE' : 'DEACTIVATE', 'empresas', JSON.stringify({ nombre: existe.rows[0].nombre })]
      );
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    res.json({ success: true, message: `Empresa ${nuevoEstado ? 'activada' : 'desactivada'}`, data: result.rows[0] });
  } catch (error) {
    console.error('Error al cambiar estado de empresa:', error);
    res.status(500).json({ success: false, error: 'Error al cambiar estado' });
  }
};

const eliminarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const existe = await query('SELECT id, nombre FROM empresas WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Empresa no encontrada' });
    }
    const usuarios = await query('SELECT COUNT(*) as total FROM usuarios WHERE empresa_id = $1', [id]);
    if (parseInt(usuarios.rows[0].total) > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una empresa con usuarios registrados. Elimina primero los usuarios.'
      });
    }
    try {
      await query(
        `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
        [id, req.usuario.id, 'DELETE', 'empresas', JSON.stringify({ nombre: existe.rows[0].nombre })]
      );
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    await query('DELETE FROM empresas WHERE id = $1', [id]);
    res.json({ success: true, message: 'Empresa eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar empresa:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar empresa' });
  }
};

const obtenerUsuariosEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, nombre, email, rol, area, puesto, activo, created_at
       FROM usuarios WHERE empresa_id = $1 ORDER BY nombre ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al obtener usuarios de empresa:', error);
    res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
  }
};

module.exports = {
  obtenerEmpresas, obtenerEmpresa, crearEmpresa,
  actualizarEmpresa, toggleActivoEmpresa, eliminarEmpresa,
  obtenerUsuariosEmpresa
};