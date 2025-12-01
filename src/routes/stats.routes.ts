import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Aplicar autenticación a todas las rutas de estadísticas
router.use(authMiddleware);

// Obtener estadísticas del dashboard
router.get('/dashboard', statsController.getDashboardStats);

export default router;

