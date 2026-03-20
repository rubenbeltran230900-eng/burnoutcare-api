-- Crear tablas si no existen
CREATE TABLE IF NOT EXISTS empresas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'evaluado',
  empresa_id INTEGER REFERENCES empresas(id),
  area VARCHAR(100),
  puesto VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  empresa_id INTEGER REFERENCES empresas(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  puntaje_bp NUMERIC,
  puntaje_bl NUMERIC,
  puntaje_bc NUMERIC,
  nivel_bp VARCHAR(20),
  nivel_bl VARCHAR(20),
  nivel_bc VARCHAR(20),
  nivel_riesgo VARCHAR(20),
  respuestas JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recomendaciones (
  id SERIAL PRIMARY KEY,
  evaluacion_id INTEGER REFERENCES evaluaciones(id),
  usuario_id INTEGER REFERENCES usuarios(id),
  contenido TEXT,
  tipo VARCHAR(50),
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion VARCHAR(255),
  detalle TEXT,
  ip VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agregar columnas faltantes a empresas si no existen
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS tamanio VARCHAR(50);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS contacto_nombre VARCHAR(255);
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS contacto_email VARCHAR(255);

-- Empresa demo
INSERT INTO empresas (nombre, sector, tamanio, contacto_nombre, contacto_email)
VALUES ('Empresa Demo', 'Tecnología', 'Mediana', 'Admin', 'admin@demo.com')
ON CONFLICT DO NOTHING;

-- Usuario admin demo (password: 123456)
INSERT INTO usuarios (nombre, email, password, rol, empresa_id)
VALUES (
  'Administrador',
  'admin@demo.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'administrador',
  1
)
ON CONFLICT (email) DO NOTHING;