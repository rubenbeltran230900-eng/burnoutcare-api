const express = require('express');
const router = express.Router();
const { 
  generarRecomendacion, 
  obtenerRecomendaciones,
  obtenerTodasRecomendaciones
} = require('../controllers/recomendaciones.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Rutas de recomendaciones
router.get('/', verificarRol('administrador', 'profesional', 'evaluado'), obtenerTodasRecomendaciones);
router.get('/:evaluacion_id', verificarRol('administrador', 'profesional', 'evaluado'), obtenerRecomendaciones);
router.post('/generar', verificarRol('administrador', 'profesional', 'evaluado'), generarRecomendacion);

module.exports = router;