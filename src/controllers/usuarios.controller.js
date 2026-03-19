const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Obtener todos los usuarios (filtrado por empresa si no es admin global)
const obtenerUsuarios = async (req, res) => {
  try {
    const { empresa_id } = req.query;
    
    let sql = `
      SELECT u.id, u.nombre, u.email, u.empresa_id, u.rol_id, u.area, u.puesto, 
             u.activo, u.created_at, r.nombre as rol, e.nombre as empresa_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      JOIN empresas e ON u.empresa_id = e.id
    `;
    
    const params = [];
    
    if (empresa_id) {
      sql += ' WHERE u.empresa_id = $1';
      params.push(empresa_id);
    }
    
    sql += ' ORDER BY u.nombre ASC';
    
    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios'
    });
  }
};

// Obtener un usuario por ID
const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.empresa_id, u.rol_id, u.area, u.puesto,
              u.activo, u.created_at, r.nombre as rol, e.nombre as empresa_nombre
       FROM usuarios u
       JOIN roles r ON u.rol_id = r.id
       JOIN empresas e ON u.empresa_id = e.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario'
    });
  }
};

// Crear nuevo usuario
const crearUsuario = async (req, res) => {
  try {
    const { nombre, email, password, empresa_id, rol_id, area, puesto } = req.body;

    if (!nombre || !email || !password || !empresa_id || !rol_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: nombre, email, password, empresa_id, rol_id'
      });
    }

    // Verificar si el email ya existe
    const existeEmail = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    
    if (existeEmail.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, empresa_id, rol_id, area, puesto)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, email, empresa_id, rol_id, area, puesto, activo, created_at`,
      [nombre, email, password_hash, empresa_id, rol_id, area || null, puesto || null]
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [empresa_id, req.usuario.id, 'CREATE', 'usuarios', JSON.stringify({ nombre, email })]
    );

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear usuario'
    });
  }
};

// Actualizar usuario
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, password, empresa_id, rol_id, area, puesto, activo } = req.body;

    // Verificar que existe
    const existe = await query('SELECT id FROM usuarios WHERE id = $1', [id]);
    
    if (existe.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Si se cambia el email, verificar que no exista
    if (email) {
      const existeEmail = await query('SELECT id FROM usuarios WHERE email = $1 AND id != $2', [email, id]);
      if (existeEmail.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'El email ya está en uso por otro usuario'
        });
      }
    }

    // Construir la consulta de actualización
    let updateFields = [];
    let params = [];
    let paramCount = 1;

    if (nombre) { updateFields.push(`nombre = $${paramCount++}`); params.push(nombre); }
    if (email) { updateFields.push(`email = $${paramCount++}`); params.push(email); }
    if (empresa_id) { updateFields.push(`empresa_id = $${paramCount++}`); params.push(empresa_id); }
    if (rol_id) { updateFields.push(`rol_id = $${paramCount++}`); params.push(rol_id); }
    if (area !== undefined) { updateFields.push(`area = $${paramCount++}`); params.push(area); }
    if (puesto !== undefined) { updateFields.push(`puesto = $${paramCount++}`); params.push(puesto); }
    if (activo !== undefined) { updateFields.push(`activo = $${paramCount++}`); params.push(activo); }
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updateFields.push(`password_hash = $${paramCount++}`);
      params.push(password_hash);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const result = await query(
      `UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, nombre, email, empresa_id, rol_id, area, puesto, activo, updated_at`,
      params
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [result.rows[0].empresa_id, req.usuario.id, 'UPDATE', 'usuarios', JSON.stringify({ id, campos_actualizados: Object.keys(req.body) })]
    );

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario'
    });
  }
};

// Eliminar usuario
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que existe
    const existe = await query('SELECT id, nombre, empresa_id FROM usuarios WHERE id = $1', [id]);
    
    if (existe.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // No permitir eliminarse a sí mismo
    if (parseInt(id) === req.usuario.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminarte a ti mismo'
      });
    }

    // Registrar en auditoría antes de eliminar
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles)
       VALUES ($1, $2, $3, $4, $5)`,
      [existe.rows[0].empresa_id, req.usuario.id, 'DELETE', 'usuarios', JSON.stringify({ nombre: existe.rows[0].nombre })]
    );

    await query('DELETE FROM usuarios WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario'
    });
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
};