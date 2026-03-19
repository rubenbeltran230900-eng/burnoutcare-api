const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

// Registrar nuevo usuario
const registro = async (req, res) => {
  try {
    const { nombre, email, password, empresa_id, rol_id, area, puesto } = req.body;

    // Validar campos requeridos
    if (!nombre || !email || !password || !empresa_id || !rol_id) {
      return res.status(400).json({
        success: false,
        error: 'Todos los campos son requeridos: nombre, email, password, empresa_id, rol_id'
      });
    }

    // Verificar si el email ya existe
    const existeUsuario = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    
    if (existeUsuario.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    // Verificar que la empresa existe
    const existeEmpresa = await query('SELECT id FROM empresas WHERE id = $1', [empresa_id]);
    
    if (existeEmpresa.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'La empresa no existe'
      });
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insertar usuario
    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, empresa_id, rol_id, area, puesto) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, nombre, email, empresa_id, rol_id, area, puesto, created_at`,
      [nombre, email, password_hash, empresa_id, rol_id, area || null, puesto || null]
    );

    const usuario = result.rows[0];

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        usuario,
        token
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error al registrar usuario'
    });
  }
};

// Iniciar sesión
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar campos
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario con su rol
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.password_hash, u.empresa_id, u.rol_id, 
              u.area, u.puesto, u.activo, r.nombre as rol, e.nombre as empresa_nombre
       FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id 
       JOIN empresas e ON u.empresa_id = e.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    const usuario = result.rows[0];

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return res.status(401).json({
        success: false,
        error: 'Usuario inactivo. Contacte al administrador.'
      });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (empresa_id, usuario_id, accion, modulo, detalles, ip_address) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuario.empresa_id, usuario.id, 'LOGIN', 'auth', JSON.stringify({ email }), req.ip]
    );

    // Eliminar password_hash de la respuesta
    delete usuario.password_hash;

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        usuario,
        token
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión'
    });
  }
};

// Obtener perfil del usuario actual
const perfil = async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.nombre, u.email, u.empresa_id, u.rol_id, u.area, u.puesto,
              r.nombre as rol, r.permisos, e.nombre as empresa_nombre
       FROM usuarios u 
       JOIN roles r ON u.rol_id = r.id 
       JOIN empresas e ON u.empresa_id = e.id
       WHERE u.id = $1`,
      [req.usuario.id]
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
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener perfil'
    });
  }
};

module.exports = {
  registro,
  login,
  perfil
};