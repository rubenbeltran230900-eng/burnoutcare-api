const express = require('express');
const router = express.Router();
const { 
  obtenerUsuarios, 
  obtenerUsuario, 
  crearUsuario, 
  actualizarUsuario, 
  eliminarUsuario 
} = require('../controllers/usuarios.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de usuarios (solo administradores)
router.get('/', verificarRol('administrador'), obtenerUsuarios);
router.get('/:id', verificarRol('administrador'), obtenerUsuario);
router.post('/', verificarRol('administrador'), crearUsuario);
router.put('/:id', verificarRol('administrador'), actualizarUsuario);
router.delete('/:id', verificarRol('administrador'), eliminarUsuario);

module.exports = router;