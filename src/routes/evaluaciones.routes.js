const express = require('express');
const router = express.Router();
const {
  obtenerEvaluaciones,
  obtenerEvaluacion,
  crearEvaluacion,
  obtenerEstadisticas,
  eliminarEvaluacion,
  exportarCSV
} = require('../controllers/evaluaciones.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Estadísticas (administrador y coordinador)
router.get('/estadisticas', verificarRol('administrador', 'coordinador'), obtenerEstadisticas);

// Exportar datos crudos en CSV (administrador y coordinador)
router.get('/export-csv', verificarRol('administrador', 'coordinador'), exportarCSV);

// Rutas de evaluaciones
router.get('/', verificarRol('administrador', 'profesional', 'coordinador', 'evaluado'), obtenerEvaluaciones);
router.get('/:id', verificarRol('administrador', 'profesional', 'coordinador'), obtenerEvaluacion);
router.post('/', verificarRol('administrador', 'profesional', 'evaluado'), crearEvaluacion);
router.delete('/:id', verificarRol('administrador'), eliminarEvaluacion);

module.exports = router;