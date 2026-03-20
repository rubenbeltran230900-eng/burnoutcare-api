const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

const initDb = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await pool.query(sql);
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err.message);
  }
};

module.exports = initDb;