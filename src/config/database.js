const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('Conectado a PostgreSQL correctamente');
    client.release();
    return true;
  } catch (err) {
    console.error('Error al conectar a PostgreSQL:', err.message);
    return false;
  }
};

pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err);
});

module.exports = { pool, testConnection };