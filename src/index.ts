import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import { errorHandler, notFound } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import protocolRoutes from './routes/protocol.routes';
import templateRoutes from './routes/template.routes';
import statsRoutes from './routes/stats.routes';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app: Application = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES
// ==========================================

// Seguridad
app.use(helmet());

// CORS
// Permitir múltiples origins separados por coma, o usar el default
const allowedOriginsString = process.env.CORS_ORIGIN || 'http://localhost:5173';
const allowedOrigins = allowedOriginsString.split(',').map(origin => origin.trim());

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sin origin (ej: Postman, mobile apps, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // Normalizar origins removiendo trailing slashes para comparación
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    // Verificar si el origin está en la lista de permitidos
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin "${origin}" not allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==========================================
// RUTAS
// ==========================================

// Ruta de health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/protocols', protocolRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/stats', statsRoutes);

// ==========================================
// MANEJO DE ERRORES
// ==========================================

// Ruta no encontrada
app.use(notFound);

// Manejador de errores global
app.use(errorHandler);

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const startServer = async (): Promise<void> => {
  try {
    // Conectar a la base de datos
    await connectDB();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('==========================================');
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📝 Entorno: ${process.env.NODE_ENV}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`❤️  Health: http://localhost:${PORT}/health`);
      console.log('==========================================');
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Iniciar
startServer();

// Manejar errores no capturados
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

export default app;

