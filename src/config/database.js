const { Pool } = require('pg');
require('dotenv').config();

// Crear pool de conexiones a PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // máximo de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo antes de cerrar conexión inactiva
  connectionTimeoutMillis: 2000, // tiempo máximo para conectar
});

// Verificar conexión al iniciar
pool.on('connect', () => {
  console.log('📦 Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en conexión a PostgreSQL:', err);
  process.exit(-1);
});

// Función helper para ejecutar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log('📝 Query ejecutado:', { text: text.substring(0, 50), duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error en query:', error.message);
    throw error;
  }
};

// Función para verificar la conexión
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Conexión a BD verificada:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a la BD:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  query,
  testConnection
};
