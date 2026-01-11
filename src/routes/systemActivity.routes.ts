import { Router } from 'express';
import { systemActivityController } from '../controllers/systemActivity.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// Obtener todas las actividades del sistema
router.get('/', systemActivityController.getSystemActivities);

export default router;

