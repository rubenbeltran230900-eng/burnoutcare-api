const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err);
});

module.exports = pool;
```

---

**Paso 3 — Agrega `NODE_ENV` en Railway**

En Railway → tu servicio de **backend** → pestaña **Variables** → agregar:
```
NODE_ENV = production