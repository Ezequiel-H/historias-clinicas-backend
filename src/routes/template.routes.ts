import { Router } from 'express';
import { body, param } from 'express-validator';
import { templateController } from '../controllers/template.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';

const router = Router();

// Aplicar autenticación a todas las rutas de plantillas
router.use(authMiddleware);

// Validaciones para Template
const templateValidation = [
  body('name').trim().notEmpty().withMessage('El nombre de la plantilla es requerido'),
  body('description').optional().trim(),
  body('activities').optional().isArray(),
];

const templateUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('description').optional().trim(),
  body('activities').optional().isArray(),
];

// Validaciones para Activity (similar a protocol.routes.ts)
const activityValidation = [
  body('name').trim().notEmpty().withMessage('El nombre de la actividad es requerido'),
  body('description').optional().trim(),
  body('fieldType')
    .isIn([
      'text_short',
      'text_long',
      'number_simple',
      'number_compound',
      'select_single',
      'boolean',
      'datetime',
      'file',
      'conditional',
      'calculated',
      'medication_tracking',
    ])
    .withMessage('Tipo de campo inválido'),
  body('required').optional().isBoolean(),
  body('order').isInt({ min: 0 }).withMessage('El orden debe ser un número mayor o igual a 0'),
];

// Validaciones de parámetros
const templateIdValidation = [
  param('id').isMongoId().withMessage('ID de plantilla inválido'),
];

const templateIdParamValidation = [
  param('templateId').isMongoId().withMessage('ID de plantilla inválido'),
];

const templateIdAndActivityIdValidation = [
  param('templateId').isMongoId().withMessage('ID de plantilla inválido'),
  param('activityId').isMongoId().withMessage('ID de actividad inválido'),
];

// ==========================================
// RUTAS DE PLANTILLAS
// ==========================================

// Obtener todas las plantillas (paginado)
router.get('/', templateController.getTemplates);

// Obtener plantilla por ID
router.get(
  '/:id',
  validate(templateIdValidation),
  templateController.getTemplateById
);

// Crear nueva plantilla
router.post(
  '/',
  validate(templateValidation),
  templateController.createTemplate
);

// Actualizar plantilla
router.put(
  '/:id',
  validate([...templateIdValidation, ...templateUpdateValidation]),
  templateController.updateTemplate
);

// Eliminar plantilla
router.delete(
  '/:id',
  validate(templateIdValidation),
  templateController.deleteTemplate
);

// ==========================================
// RUTAS DE ACTIVIDADES EN PLANTILLAS
// ==========================================

// Agregar actividad a plantilla
router.post(
  '/:templateId/activities',
  validate([...templateIdParamValidation, ...activityValidation]),
  templateController.addActivity
);

// Actualizar actividad
router.put(
  '/:templateId/activities/:activityId',
  validate([...templateIdAndActivityIdValidation, ...activityValidation]),
  templateController.updateActivity
);

// Eliminar actividad
router.delete(
  '/:templateId/activities/:activityId',
  validate(templateIdAndActivityIdValidation),
  templateController.deleteActivity
);

export default router;

