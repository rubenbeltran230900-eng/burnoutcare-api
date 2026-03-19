const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/database');

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const empresasRoutes = require('./routes/empresas.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const evaluacionesRoutes = require('./routes/evaluaciones.routes');
const recomendacionesRoutes = require('./routes/recomendaciones.routes');

// Crear aplicación Express
const app = express();

// =============================================
// MIDDLEWARES GLOBALES
// =============================================

// Seguridad: Headers HTTP seguros
app.use(helmet());

// CORS: Permitir peticiones del frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parser de JSON
app.use(express.json({ limit: '10mb' }));

// Parser de URL encoded
app.use(express.urlencoded({ extended: true }));

// Logging de peticiones HTTP
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =============================================
// RUTAS DE LA API
// =============================================

// Ruta de prueba / health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏥 BurnoutCare API está funcionando',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ruta de estado del servidor
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  
  res.json({
    success: true,
    status: 'online',
    database: dbConnected ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Registrar rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/recomendaciones', recomendacionesRoutes);
app.use('/api/auditoria', require('./routes/auditoria.routes'));

// =============================================
// MANEJO DE ERRORES
// =============================================

// Ruta no encontrada (404)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Manejador global de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'JSON inválido en el cuerpo de la petición'
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Error interno del servidor'
  });
});

// =============================================
// INICIAR SERVIDOR
// =============================================

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  Iniciando sin conexión a base de datos');
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('🏥 ========================================');
    console.log('   BURNOUTCARE API');
    console.log('🏥 ========================================');
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 Base de datos: ${dbConnected ? '✅ Conectada' : '❌ No conectada'}`);
    console.log('🏥 ========================================');
    console.log('');
  });
};

startServer();

module.exports = app;