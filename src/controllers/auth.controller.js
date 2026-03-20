const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Registrar nuevo usuario
const registro = async (req, res) => {
  try {
    const { nombre, email, password, empresa_id, rol, area, puesto } = req.body;

    if (!nombre || !email || !password || !empresa_id) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: nombre, email, password, empresa_id'
      });
    }

    const existeUsuario = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'El email ya está registrado' });
    }

    const existeEmpresa = await query('SELECT id FROM empresas WHERE id = $1', [empresa_id]);
    if (existeEmpresa.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'La empresa no existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password, empresa_id, rol, area, puesto) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, nombre, email, empresa_id, rol, area, puesto, created_at`,
      [nombre, email, password_hash, empresa_id, rol || 'evaluado', area || null, puesto || null]
    );

    const usuario = result.rows[0];
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', data: { usuario, token } });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
};

// Iniciar sesión
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email y contraseña son requeridos' });
    }

    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.password, u.empresa_id, u.rol,
              u.area, u.puesto, u.activo, e.nombre as empresa_nombre
       FROM usuarios u 
       JOIN empresas e ON u.empresa_id = e.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const usuario = result.rows[0];

    if (!usuario.activo) {
      return res.status(401).json({ success: false, error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    try {
      await query(
        `INSERT INTO auditoria (usuario_id, accion, detalle, ip) VALUES ($1, $2, $3, $4)`,
        [usuario.id, 'LOGIN', JSON.stringify({ email }), req.ip]
      );
    } catch (auditError) {
      console.warn('No se pudo registrar auditoría:', auditError.message);
    }

    delete usuario.password;

    res.json({ success: true, message: 'Inicio de sesión exitoso', data: { usuario, token } });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, error: 'Error al iniciar sesión' });
  }
};

// Obtener perfil
const perfil = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.empresa_id, u.rol, u.area, u.puesto,
              e.nombre as empresa_nombre
       FROM usuarios u 
       JOIN empresas e ON u.empresa_id = e.id
       WHERE u.id = $1`,
      [req.usuario.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ success: false, error: 'Error al obtener perfil' });
  }
};

module.exports = { registro, login, perfil };