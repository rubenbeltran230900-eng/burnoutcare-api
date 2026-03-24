const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const obtenerUsuarios = async (req, res) => {
  try {
    const { empresa_id } = req.query;
    let sql = `
      SELECT u.id, u.nombre, u.email, u.empresa_id, u.rol, u.area, u.puesto,
             u.activo, u.created_at, e.nombre as empresa_nombre
      FROM usuarios u
      JOIN empresas e ON u.empresa_id = e.id
    `;
    const params = [];
    if (empresa_id) {
      sql += ' WHERE u.empresa_id = $1';
      params.push(empresa_id);
    }
    sql += ' ORDER BY u.nombre ASC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, error: 'Error al obtener usuarios' });
  }
};

const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.empresa_id, u.rol, u.area, u.puesto,
              u.activo, u.created_at, e.nombre as empresa_nombre
       FROM usuarios u
       JOIN empresas e ON u.empresa_id = e.id
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ success: false, error: 'Error al obtener usuario' });
  }
};

const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, empresa_id, rol, area, puesto } = req.body;

    if (!nombre || !email || !password || !empresa_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: nombre, email, password, empresa_id'
      });
    }

    const existeEmail = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existeEmail.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password, empresa_id, rol, area, puesto)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, email, empresa_id, rol, area, puesto, activo, created_at`,
      [nombre, email, password_hash, empresa_id, rol || 'evaluado', area || null, puesto || null]
    );

    try {
      await query(
  `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
  [empresa_id, req.usuario.id, 'CREATE', 'usuarios', JSON.stringify({ nombre, email })]
);
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: result.rows[0] });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, error: 'Error al crear usuario' });
  }
};

const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, empresa_id, rol, area, puesto, activo } = req.body;

    const existe = await query('SELECT id FROM usuarios WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (email) {
      const existeEmail = await query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
      if (existeEmail.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'El email ya está en uso' });
      }
    }

    let updateFields = [];
    let params = [];
    let paramCount = 1;

    if (nombre)             { updateFields.push(`nombre = $${paramCount++}`);     params.push(nombre); }
    if (email)              { updateFields.push(`email = $${paramCount++}`);      params.push(email); }
    if (empresa_id)         { updateFields.push(`empresa_id = $${paramCount++}`); params.push(empresa_id); }
    if (rol)                { updateFields.push(`rol = $${paramCount++}`);        params.push(rol); }
    if (area !== undefined) { updateFields.push(`area = $${paramCount++}`);       params.push(area); }
    if (puesto !== undefined){ updateFields.push(`puesto = $${paramCount++}`);    params.push(puesto); }
    if (activo !== undefined){ updateFields.push(`activo = $${paramCount++}`);    params.push(activo); }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      updateFields.push(`password = $${paramCount++}`);
      params.push(hash);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No hay campos para actualizar' });
    }

    params.push(id);
    const result = await query(
      `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, nombre, email, empresa_id, rol, area, puesto, activo`,
      params
    );

    try {
      await query(
  `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
  [req.usuario.empresa_id, req.usuario.id, 'UPDATE', 'usuarios', JSON.stringify({ id })]
);
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    res.json({ success: true, message: 'Usuario actualizado exitosamente', data: result.rows[0] });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar usuario' });
  }
};

const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const existe = await query('SELECT id, nombre FROM usuarios WHERE id = $1', [id]);
    if (existe.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({ success: false, error: 'No puedes eliminarte a ti mismo' });
    }

    try {
     await query(
  `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles) VALUES ($1, $2, $3, $4, $5)`,
  [req.usuario.empresa_id, req.usuario.id, 'DELETE', 'usuarios', JSON.stringify({ nombre: existe.rows[0].nombre })]
);
    } catch (e) { console.warn('Auditoría no registrada:', e.message); }

    await query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar usuario' });
  }
};

module.exports = { obtenerUsuarios, obtenerUsuario, crearUsuario, actualizarUsuario, eliminarUsuario };