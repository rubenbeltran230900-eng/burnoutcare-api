const express = require('express');
const router = express.Router();
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');
const {
  obtenerEmpresas, obtenerEmpresa, crearEmpresa,
  actualizarEmpresa, toggleActivoEmpresa, eliminarEmpresa,
  obtenerUsuariosEmpresa
} = require('../controllers/empresas.controller');

router.use(verificarToken);
router.use(verificarRol('administrador'));

router.get('/', obtenerEmpresas);
router.get('/:id', obtenerEmpresa);
router.post('/', crearEmpresa);
router.put('/:id', actualizarEmpresa);
router.patch('/:id/toggle', toggleActivoEmpresa);
router.delete('/:id', eliminarEmpresa);
router.get('/:id/usuarios', obtenerUsuariosEmpresa);

module.exports = router;