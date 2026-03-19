# Esquema de Base de Datos - BurnoutCare

## Diagrama Entidad-Relación (ER)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    EMPRESAS     │       │    USUARIOS     │       │     ROLES       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │    ┌──│ id (PK)         │
│ nombre          │  │    │ empresa_id (FK) │◄───┘  │ nombre          │
│ rfc             │  └───►│ rol_id (FK)     │◄──────│ descripcion     │
│ sector          │       │ nombre          │       │ permisos (JSON) │
│ direccion       │       │ email           │       └─────────────────┘
│ telefono        │       │ password_hash   │
│ contacto_nombre │       │ area            │
│ contacto_email  │       │ puesto          │
│ activa          │       │ activo          │
│ created_at      │       │ created_at      │
│ updated_at      │       │ updated_at      │
└─────────────────┘       └────────┬────────┘
                                   │
                                   │ 1:N
                                   ▼
                          ┌─────────────────┐
                          │  EVALUACIONES   │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ usuario_id (FK) │
                          │ empresa_id (FK) │
                          │ fecha           │
                          │ respuestas JSON │
                          │ puntaje_ee      │
                          │ puntaje_dp      │
                          │ puntaje_rp      │
                          │ nivel_ee        │
                          │ nivel_dp        │
                          │ nivel_rp        │
                          │ nivel_riesgo    │
                          │ created_at      │
                          └────────┬────────┘
                                   │
                                   │ 1:N
                                   ▼
                         ┌──────────────────┐
                         │ RECOMENDACIONES  │
                         ├──────────────────┤
                         │ id (PK)          │
                         │ evaluacion_id FK │
                         │ tipo (IA/REGLAS) │
                         │ contenido (JSON) │
                         │ created_at       │
                         └──────────────────┘

┌─────────────────┐       ┌─────────────────┐
│ INTERVENCIONES  │       │   AUDITORIA     │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ evaluacion_id FK│       │ empresa_id (FK) │
│ usuario_prof_id │       │ usuario_id (FK) │
│ tipo            │       │ accion          │
│ descripcion     │       │ modulo          │
│ fecha_programada│       │ detalles (JSON) │
│ fecha_realizada │       │ ip_address      │
│ efectividad     │       │ user_agent      │
│ notas           │       │ created_at      │
│ created_at      │       └─────────────────┘
│ updated_at      │
└─────────────────┘
```

---

## Descripción de Tablas

### 1. empresas
Almacena la información de cada empresa/organización que usa el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| nombre | VARCHAR(200) | Nombre de la empresa |
| rfc | VARCHAR(13) | RFC de la empresa |
| sector | VARCHAR(100) | Sector industrial |
| direccion | TEXT | Dirección completa |
| telefono | VARCHAR(20) | Teléfono de contacto |
| contacto_nombre | VARCHAR(150) | Nombre del contacto principal |
| contacto_email | VARCHAR(150) | Email del contacto |
| activa | BOOLEAN | Si la empresa está activa |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

### 2. roles
Catálogo de roles del sistema (RBAC).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| nombre | VARCHAR(50) | Nombre del rol |
| descripcion | TEXT | Descripción del rol |
| permisos | JSONB | Lista de módulos/acciones permitidas |

### 3. usuarios
Usuarios del sistema, vinculados a una empresa y un rol.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| empresa_id | INTEGER FK | Empresa a la que pertenece |
| rol_id | INTEGER FK | Rol asignado |
| nombre | VARCHAR(150) | Nombre completo |
| email | VARCHAR(150) UNIQUE | Email (usado para login) |
| password_hash | VARCHAR(255) | Contraseña encriptada (bcrypt) |
| area | VARCHAR(100) | Área/departamento |
| puesto | VARCHAR(100) | Puesto de trabajo |
| activo | BOOLEAN | Si el usuario está activo |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

### 4. evaluaciones
Resultados de las evaluaciones MBI realizadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| usuario_id | INTEGER FK | Usuario evaluado |
| empresa_id | INTEGER FK | Empresa (redundante para consultas) |
| fecha | TIMESTAMP | Fecha de la evaluación |
| respuestas | JSONB | Las 22 respuestas del MBI |
| puntaje_ee | INTEGER | Puntaje Agotamiento Emocional |
| puntaje_dp | INTEGER | Puntaje Despersonalización |
| puntaje_rp | INTEGER | Puntaje Realización Personal |
| nivel_ee | VARCHAR(10) | Nivel EE (Alto/Medio/Bajo) |
| nivel_dp | VARCHAR(10) | Nivel DP (Alto/Medio/Bajo) |
| nivel_rp | VARCHAR(10) | Nivel RP (Alto/Medio/Bajo) |
| nivel_riesgo | VARCHAR(10) | Nivel general de riesgo |
| created_at | TIMESTAMP | Fecha de creación |

### 5. recomendaciones
Recomendaciones generadas (por IA o reglas) para cada evaluación.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| evaluacion_id | INTEGER FK | Evaluación asociada |
| tipo | VARCHAR(20) | 'IA' o 'REGLAS' |
| contenido | JSONB | Contenido estructurado de la recomendación |
| created_at | TIMESTAMP | Fecha de creación |

### 6. intervenciones
Seguimiento de intervenciones clínicas realizadas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| evaluacion_id | INTEGER FK | Evaluación asociada |
| usuario_prof_id | INTEGER FK | Profesional que realizó la intervención |
| tipo | VARCHAR(50) | Tipo de intervención |
| descripcion | TEXT | Descripción detallada |
| fecha_programada | DATE | Fecha programada |
| fecha_realizada | DATE | Fecha en que se realizó |
| efectividad | VARCHAR(20) | Mejoría/Sin cambios/Empeoramiento |
| notas | TEXT | Notas clínicas |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

### 7. auditoria
Bitácora de eventos del sistema para seguridad y trazabilidad.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PRIMARY KEY | Identificador único |
| empresa_id | INTEGER FK | Empresa donde ocurrió |
| usuario_id | INTEGER FK | Usuario que realizó la acción |
| accion | VARCHAR(50) | Tipo de acción (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, VIEW) |
| modulo | VARCHAR(50) | Módulo afectado |
| detalles | JSONB | Información adicional |
| ip_address | VARCHAR(45) | Dirección IP |
| user_agent | TEXT | Navegador/dispositivo |
| created_at | TIMESTAMP | Fecha del evento |

---

## Script SQL de Creación

```sql
-- =============================================
-- BASE DE DATOS: BurnoutCare
-- =============================================

-- Crear base de datos (ejecutar como superusuario)
-- CREATE DATABASE burnoutcare;

-- =============================================
-- TABLA: roles
-- =============================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB DEFAULT '[]'
);

-- Insertar roles predefinidos
INSERT INTO roles (nombre, descripcion, permisos) VALUES
('administrador', 'Acceso completo al sistema', '["evaluacion", "alertas", "detalle", "seguimiento", "indicadores", "reportes", "usuarios", "roles", "auditoria", "recomendaciones"]'),
('profesional', 'Profesional de salud ocupacional', '["evaluacion", "alertas", "detalle", "seguimiento", "recomendaciones"]'),
('coordinador', 'Coordinador institucional', '["evaluacion", "indicadores", "reportes"]'),
('evaluado', 'Colaborador que realiza evaluaciones', '["evaluacion"]');

-- =============================================
-- TABLA: empresas
-- =============================================
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    rfc VARCHAR(13),
    sector VARCHAR(100),
    direccion TEXT,
    telefono VARCHAR(20),
    contacto_nombre VARCHAR(150),
    contacto_email VARCHAR(150),
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas por RFC
CREATE INDEX idx_empresas_rfc ON empresas(rfc);

-- =============================================
-- TABLA: usuarios
-- =============================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    rol_id INTEGER NOT NULL REFERENCES roles(id),
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    area VARCHAR(100),
    puesto VARCHAR(100),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);

-- =============================================
-- TABLA: evaluaciones
-- =============================================
CREATE TABLE evaluaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    respuestas JSONB NOT NULL,
    puntaje_ee INTEGER NOT NULL,
    puntaje_dp INTEGER NOT NULL,
    puntaje_rp INTEGER NOT NULL,
    nivel_ee VARCHAR(10) NOT NULL,
    nivel_dp VARCHAR(10) NOT NULL,
    nivel_rp VARCHAR(10) NOT NULL,
    nivel_riesgo VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas de dashboard
CREATE INDEX idx_evaluaciones_usuario ON evaluaciones(usuario_id);
CREATE INDEX idx_evaluaciones_empresa ON evaluaciones(empresa_id);
CREATE INDEX idx_evaluaciones_fecha ON evaluaciones(fecha);
CREATE INDEX idx_evaluaciones_riesgo ON evaluaciones(nivel_riesgo);

-- =============================================
-- TABLA: recomendaciones
-- =============================================
CREATE TABLE recomendaciones (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('IA', 'REGLAS')),
    contenido JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsqueda por evaluación
CREATE INDEX idx_recomendaciones_evaluacion ON recomendaciones(evaluacion_id);

-- =============================================
-- TABLA: intervenciones
-- =============================================
CREATE TABLE intervenciones (
    id SERIAL PRIMARY KEY,
    evaluacion_id INTEGER NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
    usuario_prof_id INTEGER NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    fecha_programada DATE,
    fecha_realizada DATE,
    efectividad VARCHAR(20) CHECK (efectividad IN ('mejoria', 'sin_cambios', 'empeoramiento')),
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para seguimiento
CREATE INDEX idx_intervenciones_evaluacion ON intervenciones(evaluacion_id);
CREATE INDEX idx_intervenciones_profesional ON intervenciones(usuario_prof_id);

-- =============================================
-- TABLA: auditoria
-- =============================================
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE SET NULL,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    accion VARCHAR(50) NOT NULL,
    modulo VARCHAR(50),
    detalles JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas de auditoría
CREATE INDEX idx_auditoria_empresa ON auditoria(empresa_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(created_at);
CREATE INDEX idx_auditoria_accion ON auditoria(accion);

-- =============================================
-- FUNCIÓN: Actualizar timestamp updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_empresas_updated_at
    BEFORE UPDATE ON empresas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervenciones_updated_at
    BEFORE UPDATE ON intervenciones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DATOS DE PRUEBA (Opcional)
-- =============================================

-- Empresa de prueba
INSERT INTO empresas (nombre, rfc, sector, contacto_nombre, contacto_email) VALUES
('Empresa Demo S.A. de C.V.', 'EDE123456789', 'Tecnología', 'Juan Pérez', 'juan@empresademo.com');

-- Usuario administrador de prueba (password: admin123)
-- Nota: El hash real debe generarse con bcrypt en la aplicación
INSERT INTO usuarios (empresa_id, rol_id, nombre, email, password_hash, area, puesto) VALUES
(1, 1, 'Administrador Demo', 'admin@empresademo.com', '$2b$10$placeholder_hash_here', 'Sistemas', 'Administrador');
```

---

## Relaciones entre Tablas

| Relación | Descripción |
|----------|-------------|
| empresas → usuarios | Una empresa tiene muchos usuarios (1:N) |
| roles → usuarios | Un rol tiene muchos usuarios (1:N) |
| usuarios → evaluaciones | Un usuario puede tener muchas evaluaciones (1:N) |
| empresas → evaluaciones | Una empresa tiene muchas evaluaciones (1:N) |
| evaluaciones → recomendaciones | Una evaluación puede tener varias recomendaciones (1:N) |
| evaluaciones → intervenciones | Una evaluación puede tener varias intervenciones (1:N) |
| empresas → auditoria | Los eventos se registran por empresa (1:N) |
| usuarios → auditoria | Los eventos se registran por usuario (1:N) |

---

## Consideraciones de Seguridad

1. **Contraseñas:** Se almacenan hasheadas con bcrypt (nunca en texto plano)
2. **Multi-tenancy:** Cada consulta debe filtrar por `empresa_id` para aislar datos
3. **Auditoría:** Todas las acciones críticas se registran automáticamente
4. **Soft delete:** Se usa `activo = false` en lugar de eliminar registros

---

## Siguiente Paso

✅ Tarea 1.1 completada: Diseño del esquema de base de datos

Siguiente: **Tarea 1.2** - Configuración inicial del proyecto Node.js
