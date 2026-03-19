const express = require('express');
const router = express.Router();
const { 
  obtenerEvaluaciones, 
  obtenerEvaluacion, 
  crearEvaluacion, 
  obtenerEstadisticas,
  eliminarEvaluacion 
} = require('../controllers/evaluaciones.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Estadísticas (administrador y coordinador)
router.get('/estadisticas', verificarRol('administrador', 'coordinador'), obtenerEstadisticas);

// Rutas de evaluaciones
router.get('/', verificarRol('administrador', 'profesional', 'coordinador'), obtenerEvaluaciones);
router.get('/:id', verificarRol('administrador', 'profesional', 'coordinador'), obtenerEvaluacion);
router.post('/', verificarRol('administrador', 'profesional', 'evaluado'), crearEvaluacion);
router.delete('/:id', verificarRol('administrador'), eliminarEvaluacion);

module.exports = router;