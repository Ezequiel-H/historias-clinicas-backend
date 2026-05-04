# Historias Clínicas - Backend API

Backend API REST para el sistema de gestión de historias clínicas y protocolos de investigación.

## 🚀 Características

- **Autenticación JWT**: Sistema seguro de autenticación con tokens
- **Gestión de Protocolos**: CRUD completo de protocolos clínicos
- **Gestión de Visitas**: Creación y edición de visitas dentro de protocolos
- **Gestión de Actividades**: Actividades detalladas con múltiples tipos de campos
- **Reglas Clínicas**: Sistema de validación de datos clínicos
- **Validación de Datos**: Validación robusta con express-validator
- **Seguridad**: Implementación de Helmet y CORS

## 📋 Requisitos

- Node.js 18+ (recomendado v20)
- MongoDB (cluster en la nube)
- npm o yarn

## 🛠️ Instalación

1. **Instalar dependencias:**

```bash
npm install
```

2. **Configurar variables de entorno:**

Crea un archivo `.env` en la raíz del proyecto:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://vpJRH6lB4udeTEhY:qw5EvqYxO1qeFQf9@historias-clinicas-cedi.ljpagfe.mongodb.net/?appName=historias-clinicas-cedic

# JWT Configuration
JWT_SECRET=historias-clinicas-super-secret-key-2024
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-5

# Feature Flags (mockear redactor sin llamadas a OpenAI)
MOCK_REDACTOR_CLINICAL_HISTORY=false
MOCK_REDACTOR_PROTOCOL_GENERATION=false
# Compatibilidad: si ya tenías las variables de mock con el nombre anterior, siguen funcionando
```

3. **Iniciar servidor de desarrollo:**

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── config/           # Configuración (database, etc)
├── controllers/      # Controladores de las rutas
├── middleware/       # Middlewares (auth, validación, errores)
├── models/          # Modelos de Mongoose
├── routes/          # Definición de rutas
├── services/        # Servicios (redactor clínico, etc.)
│   └── interfaces/  # Interfaces de servicios
├── system-prompts/  # Prompts de sistema para el redactor
├── types/           # Tipos de TypeScript
├── utils/           # Utilidades (JWT, etc)
└── index.ts         # Punto de entrada
```

## 🔐 Autenticación

### Crear primer usuario admin

Para crear el primer usuario administrador, puedes usar MongoDB Compass o la shell de MongoDB:

```javascript
// Conectarse a tu base de datos y ejecutar:
db.users.insertOne({
  email: "admin@cedic.com",
  password: "$2a$10$X5xKj4Z4YdI7KN5pXMnRKejXqPQ7I0fKVY5YvHOPUKUC0Y7eqWRJG", // password: admin123
  name: "Administrador",
  role: "admin",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

O usa este script Node.js (crear archivo `scripts/createAdmin.ts`):

```typescript
import { User } from '../src/models/User';
import { connectDB } from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

const createAdmin = async () => {
  await connectDB();
  
  const admin = new User({
    email: 'admin@cedic.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin',
    isActive: true
  });
  
  await admin.save();
  console.log('✅ Usuario admin creado exitosamente');
  process.exit(0);
};

createAdmin();
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@cedic.com",
  "password": "admin123"
}
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@cedic.com",
      "name": "Administrador",
      "role": "admin",
      "isActive": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login exitoso"
}
```

### Usar token

Incluye el token en el header Authorization de todas las peticiones protegidas:

```
Authorization: Bearer <tu-token-jwt>
```

## 📚 Endpoints API

### Autenticación (`/api/auth`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/login` | Iniciar sesión | No |
| POST | `/logout` | Cerrar sesión | No |
| GET | `/me` | Obtener usuario actual | Sí |
| POST | `/register` | Registrar nuevo usuario | Sí (Admin) |

### Protocolos (`/api/protocols`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/` | Listar protocolos (paginado) | Sí |
| GET | `/:id` | Obtener protocolo por ID | Sí |
| POST | `/` | Crear protocolo | Sí |
| PUT | `/:id` | Actualizar protocolo | Sí |
| DELETE | `/:id` | Eliminar protocolo | Sí |

### Visitas (`/api/protocols/:protocolId/visits`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/` | Agregar visita | Sí |
| PUT | `/:visitId` | Actualizar visita | Sí |
| DELETE | `/:visitId` | Eliminar visita | Sí |

### Actividades (`/api/protocols/:protocolId/visits/:visitId/activities`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/` | Agregar actividad | Sí |
| PUT | `/:activityId` | Actualizar actividad | Sí |
| DELETE | `/:activityId` | Eliminar actividad | Sí |

### Reglas Clínicas (`/api/protocols/:protocolId/clinical-rules`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/` | Agregar regla | Sí |
| PUT | `/:ruleId` | Actualizar regla | Sí |
| DELETE | `/:ruleId` | Eliminar regla | Sí |

## 📝 Ejemplos de Uso

### Crear un Protocolo

```bash
POST /api/protocols
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Estudio Cardiovascular ABC-001",
  "code": "ABC-001",
  "sponsor": "Laboratorio XYZ",
  "description": "Estudio de fase III para evaluación de eficacia",
  "status": "draft"
}
```

### Agregar una Visita

```bash
POST /api/protocols/:protocolId/visits
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Visita de Screening",
  "type": "presencial",
  "order": 1,
  "measurementCount": 3,
  "separationBetweenControls": 5
}
```

### Agregar una Actividad

```bash
POST /api/protocols/:protocolId/visits/:visitId/activities
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Presión Arterial",
  "description": "Medición de presión arterial sistólica y diastólica",
  "fieldType": "number_compound",
  "required": true,
  "order": 1,
  "compoundConfig": {
    "fields": [
      {
        "name": "sistolica",
        "label": "Sistólica",
        "unit": "mmHg"
      },
      {
        "name": "diastolica",
        "label": "Diastólica",
        "unit": "mmHg"
      }
    ]
  }
}
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo con hot-reload
npm run dev

# Compilar TypeScript
npm run build

# Producción (compilar + ejecutar)
npm run start

# Linting
npm run lint
npm run lint:fix
```

## 🏗️ Compilación para Producción

```bash
# 1. Compilar TypeScript a JavaScript
npm run build

# 2. Ejecutar versión compilada
npm start
```

Los archivos compilados estarán en el directorio `dist/`

## 🌐 Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `MONGODB_URI` | URI de conexión a MongoDB | (requerido) |
| `JWT_SECRET` | Secreto para firmar JWT | (requerido) |
| `JWT_EXPIRES_IN` | Tiempo de expiración del JWT | `7d` |
| `CORS_ORIGIN` | Origen permitido para CORS | `http://localhost:5173` |
| `MOCK_REDACTOR_CLINICAL_HISTORY` | Mockear texto de historia clínica (true/false) | `false` |
| `MOCK_REDACTOR_PROTOCOL_GENERATION` | Mockear generación de protocolo desde sistemática (true/false) | `false` |
| `OPENAI_API_KEY` | API Key de OpenAI | (requerido si no usás mocks) |
| `OPENAI_MODEL` | Modelo de OpenAI a utilizar | `gpt-4` |

## 🔒 Roles de Usuario

- **admin**: Acceso completo al sistema
- **investigador_principal**: Gestión de protocolos
- **medico**: Lectura y registro de datos clínicos

## 🐛 Debugging

Para debugging más detallado en desarrollo, el servidor muestra:
- Logs de todas las peticiones HTTP (morgan)
- Stack traces completos de errores
- Estado de conexión a MongoDB

## 📦 Tecnologías Utilizadas

- **Express**: Framework web
- **TypeScript**: Tipado estático
- **MongoDB + Mongoose**: Base de datos
- **JWT**: Autenticación
- **bcryptjs**: Encriptación de contraseñas
- **express-validator**: Validación de datos
- **helmet**: Seguridad HTTP
- **cors**: Control de acceso
- **morgan**: Logging HTTP

## 🚨 Manejo de Errores

El API devuelve respuestas consistentes para errores:

```json
{
  "success": false,
  "error": "Descripción del error",
  "details": {
    "campo": ["error específico"]
  }
}
```

Códigos de estado HTTP:
- `200`: Éxito
- `201`: Recurso creado
- `400`: Error de validación
- `401`: No autenticado
- `403`: Sin permisos
- `404`: No encontrado
- `500`: Error del servidor

## 📄 Licencia

ISC

## 👥 Soporte

Para problemas o preguntas, contactar al equipo de desarrollo.

