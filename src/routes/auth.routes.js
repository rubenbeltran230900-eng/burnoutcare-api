const express = require('express');
const router = express.Router();
const { registro, login, perfil, registroEvaluado } = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Rutas públicas (no requieren token)
router.post('/registro', registro);
router.post('/login', login);
router.post('/registro-evaluado', registroEvaluado);

// Rutas protegidas (requieren token)
router.get('/perfil', verificarToken, perfil);

module.exports = router;