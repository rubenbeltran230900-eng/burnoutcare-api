# BurnoutCare API

API REST para el sistema de detección y acompañamiento del síndrome de burnout.

## 🚀 Inicio Rápido

### Requisitos previos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### Instalación

1. **Clonar o copiar el proyecto**
   ```bash
   cd burnoutcare-api
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Copiar el archivo de ejemplo
   cp .env.example .env
   
   # Editar .env con tus configuraciones
   nano .env
   ```

4. **Crear la base de datos**
   ```bash
   # Conectar a PostgreSQL
   psql -U postgres
   
   # Crear la base de datos
   CREATE DATABASE burnoutcare;
   
   # Salir
   \q
   
   # Ejecutar el script de creación de tablas
   psql -U tu_usuario -d burnoutcare -f ../01_esquema_base_datos.sql
   ```

5. **Iniciar el servidor**
   ```bash
   # Modo desarrollo (con hot reload)
   npm run dev
   
   # Modo producción
   npm start
   ```

6. **Verificar funcionamiento**
   ```
   Abrir en navegador: http://localhost:3001
   ```

## 📁 Estructura del Proyecto

```
burnoutcare-api/
├── src/
│   ├── config/         # Configuraciones (BD, JWT, etc.)
│   ├── controllers/    # Lógica de negocio
│   ├── middlewares/    # Autenticación, validación, etc.
│   ├── models/         # Modelos de datos
│   ├── routes/         # Definición de rutas API
│   ├── utils/          # Funciones auxiliares
│   └── index.js        # Punto de entrada
├── tests/              # Pruebas unitarias
├── .env.example        # Ejemplo de variables de entorno
├── .gitignore          # Archivos ignorados por git
├── package.json        # Dependencias y scripts
└── README.md           # Este archivo
```

## 🔗 Endpoints de la API

### Health Check
- `GET /` - Información básica de la API
- `GET /api/health` - Estado del servidor y base de datos

### Autenticación (próximamente)
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/registro` - Registrar usuario

### Empresas (próximamente)
- `GET /api/empresas` - Listar empresas
- `POST /api/empresas` - Crear empresa
- `PUT /api/empresas/:id` - Actualizar empresa
- `DELETE /api/empresas/:id` - Eliminar empresa

### Usuarios (próximamente)
- `GET /api/usuarios` - Listar usuarios
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios/:id` - Actualizar usuario
- `DELETE /api/usuarios/:id` - Eliminar usuario

### Evaluaciones (próximamente)
- `GET /api/evaluaciones` - Listar evaluaciones
- `POST /api/evaluaciones` - Guardar evaluación
- `GET /api/evaluaciones/:id` - Obtener detalle

### Recomendaciones IA (próximamente)
- `POST /api/recomendaciones` - Generar recomendación
- `GET /api/recomendaciones/:evaluacionId` - Obtener recomendaciones

## 🛠️ Tecnologías

| Tecnología | Propósito |
|------------|-----------|
| Express.js | Framework web |
| PostgreSQL | Base de datos |
| JWT | Autenticación |
| bcryptjs | Encriptación de contraseñas |
| Helmet | Seguridad HTTP |
| CORS | Control de acceso |
| Morgan | Logging |

## 📝 Scripts disponibles

```bash
npm start     # Iniciar en producción
npm run dev   # Iniciar en desarrollo (hot reload)
npm test      # Ejecutar pruebas
```

## 👤 Autor

Rubén - Maestría en Ingeniería Administrativa, ITO

## 📄 Licencia

MIT
