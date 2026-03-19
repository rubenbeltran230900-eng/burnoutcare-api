const express = require('express');
const router = express.Router();
const { 
  obtenerEmpresas, 
  obtenerEmpresa, 
  crearEmpresa, 
  actualizarEmpresa, 
  eliminarEmpresa 
} = require('../controllers/empresas.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de empresas (solo administradores)
router.get('/', verificarRol('administrador'), obtenerEmpresas);
router.get('/:id', verificarRol('administrador'), obtenerEmpresa);
router.post('/', verificarRol('administrador'), crearEmpresa);
router.put('/:id', verificarRol('administrador'), actualizarEmpresa);
router.delete('/:id', verificarRol('administrador'), eliminarEmpresa);

module.exports = router;