# 🚀 Inicio Rápido - Backend

## ✅ Instalación Completada

El backend ya está instalado y configurado con:
- ✅ MongoDB conectado
- ✅ Usuario admin creado
- ✅ Servidor corriendo en http://localhost:3000

## 🔑 Credenciales de Acceso

```
Email: admin@cedic.com
Password: admin123
```

⚠️ **IMPORTANTE**: Cambia esta contraseña después del primer login.

## 🎯 Comandos Esenciales

```bash
# Iniciar servidor en desarrollo
npm run dev

# Compilar para producción
npm run build

# Ejecutar versión de producción
npm start

# Crear nuevo usuario admin (si es necesario)
npm run create-admin
```

## 📡 Endpoints Principales

### Base URL
```
http://localhost:3000/api
```

### Health Check
```bash
curl http://localhost:3000/health
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cedic.com","password":"admin123"}'
```

### Crear Protocolo
```bash
# Primero obtén el token del login
TOKEN="tu-token-aqui"

curl -X POST http://localhost:3000/api/protocols \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Nuevo Protocolo",
    "code": "PROTO-001",
    "sponsor": "Mi Sponsor",
    "description": "Descripción del protocolo",
    "status": "draft"
  }'
```

### Obtener Protocolos
```bash
curl -X GET "http://localhost:3000/api/protocols?page=1&pageSize=10" \
  -H "Authorization: Bearer $TOKEN"
```

## 🔗 Conectar con el Frontend

El frontend ya está configurado para conectarse a este backend en:
- **URL API**: `http://localhost:3000/api`
- **Puerto**: 3000

Solo asegúrate de que ambos servicios estén corriendo:
1. Backend: `npm run dev` (puerto 3000)
2. Frontend: `npm run dev` (puerto 5173)

## 📋 Estructura de la API

```
/api
  /auth
    POST   /login          - Iniciar sesión
    POST   /logout         - Cerrar sesión
    GET    /me             - Obtener usuario actual
    POST   /register       - Registrar usuario (solo admin)
  
  /protocols
    GET    /               - Listar protocolos
    POST   /               - Crear protocolo
    GET    /:id            - Obtener protocolo
    PUT    /:id            - Actualizar protocolo
    DELETE /:id            - Eliminar protocolo
    
    POST   /:id/visits     - Agregar visita
    PUT    /:id/visits/:visitId - Actualizar visita
    DELETE /:id/visits/:visitId - Eliminar visita
    
    POST   /:id/visits/:visitId/activities - Agregar actividad
    PUT    /:id/visits/:visitId/activities/:activityId - Actualizar actividad
    DELETE /:id/visits/:visitId/activities/:activityId - Eliminar actividad
    
    POST   /:id/clinical-rules - Agregar regla clínica
    PUT    /:id/clinical-rules/:ruleId - Actualizar regla
    DELETE /:id/clinical-rules/:ruleId - Eliminar regla
```

## 🛠️ Solución de Problemas

### El servidor no inicia
```bash
# Verifica que el puerto 3000 esté libre
lsof -i :3000

# Si está ocupado, mata el proceso
kill -9 <PID>
```

### Error de conexión a MongoDB
Verifica que el connection string en `.env` sea correcto:
```env
MONGODB_URI=mongodb+srv://vpJRH6lB4udeTEhY:qw5EvqYxO1qeFQf9@historias-clinicas-cedi.ljpagfe.mongodb.net/?appName=historias-clinicas-cedic
```

### Errores de TypeScript
```bash
# Limpia y reinstala
rm -rf node_modules package-lock.json
npm install
```

## 📊 Estado Actual

✅ Backend funcionando correctamente
✅ Base de datos conectada
✅ Autenticación JWT operativa
✅ Endpoints de protocolos funcionando
✅ Validación de datos activa
✅ CORS configurado para frontend

## 🎉 Próximos Pasos

1. Inicia el frontend en el directorio `historias-clinicas`
2. Accede a http://localhost:5173
3. Inicia sesión con las credenciales admin
4. Comienza a crear protocolos

¡Todo listo para usar! 🚀

