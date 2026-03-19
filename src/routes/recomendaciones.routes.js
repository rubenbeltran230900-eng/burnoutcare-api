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
router.get('/', verificarRol('administrador', 'profesional'), obtenerTodasRecomendaciones);
router.get('/:evaluacion_id', verificarRol('administrador', 'profesional'), obtenerRecomendaciones);
router.post('/generar', verificarRol('administrador', 'profesional'), generarRecomendacion);

module.exports = router;