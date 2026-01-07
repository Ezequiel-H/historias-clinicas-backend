import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { protocolController } from '../controllers/protocol.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';

const router = Router();

// Aplicar autenticación a todas las rutas de protocolos
router.use(authMiddleware);

// Validaciones para Protocol
const protocolValidation = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('code').trim().notEmpty().withMessage('El código es requerido').toUpperCase(),
  body('sponsor').trim().notEmpty().withMessage('El sponsor es requerido'),
  body('description').trim().notEmpty().withMessage('La descripción es requerida'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Estado inválido'),
];

const protocolUpdateValidation = [
  body('name').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('code').optional().trim().notEmpty().withMessage('El código no puede estar vacío').toUpperCase(),
  body('sponsor').optional().trim().notEmpty().withMessage('El sponsor no puede estar vacío'),
  body('description').optional().trim().notEmpty().withMessage('La descripción no puede estar vacía'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Estado inválido'),
];

// Validaciones para Visit
const visitValidation = [
  body('name').trim().notEmpty().withMessage('El nombre de la visita es requerido'),
  body('type')
    .isIn(['presencial', 'telefonica', 'no_programada'])
    .withMessage('Tipo de visita inválido'),
  body('order').isInt({ min: 1 }).withMessage('El orden debe ser un número mayor a 0'),
];

// Validaciones para Activity
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
      'select_multiple',
      'boolean',
      'datetime', // Fecha y/o hora (configurable)
      'file',
      'conditional',
      'calculated',
      'medication_tracking',
    ])
    .withMessage('Tipo de campo inválido'),
  body('required').isBoolean().withMessage('El campo required debe ser boolean'),
  body('order').isInt({ min: 1 }).withMessage('El orden debe ser un número mayor a 0'),
  body('measurementUnit').optional().trim(),
  body('expectedMin').optional().isNumeric(),
  body('expectedMax').optional().isNumeric(),
  body('decimalPlaces').optional().isInt({ min: 0, max: 10 }),
  body('options').optional().isArray(),
  body('allowCustomOptions').optional().isBoolean(),
  body('compoundConfig').optional().isObject(),
  body('conditionalConfig').optional().isObject(),
  body('conditionalConfig.dependsOn').optional().trim(),
  body('conditionalConfig.showWhen').optional(),
  body('allowMultiple').optional().isBoolean(),
  body('repeatCount').optional().isInt({ min: 1, max: 10 }),
  body('datetimeIncludeDate').optional().isBoolean(), // Configuración para tipo datetime
  body('datetimeIncludeTime').optional().isBoolean(), // Configuración para tipo datetime
  body('isVisitDate').optional().isBoolean(), // Si true, este campo representa la fecha de la visita
  body('requireDate').optional().isBoolean(),
  body('requireTime').optional().isBoolean(),
  body('requireDatePerMeasurement').optional().isBoolean(),
  body('requireTimePerMeasurement').optional().isBoolean(),
  body('timeIntervalMinutes').optional().isInt({ min: 1 }),
  body('calculationFormula').optional().trim(),
  body('helpText').optional().trim(),
  body('validationRules').optional().isArray(),
];

// Validaciones para Clinical Rule
const clinicalRuleValidation = [
  body('name').trim().notEmpty().withMessage('El nombre de la regla es requerido'),
  body('parameter').trim().notEmpty().withMessage('El parámetro es requerido'),
  body('condition')
    .isIn(['range', 'min', 'max', 'equals', 'not_equals'])
    .withMessage('Condición inválida'),
  body('errorMessage').trim().notEmpty().withMessage('El mensaje de error es requerido'),
  body('isActive').optional().isBoolean(),
  body('minValue').optional().isNumeric(),
  body('maxValue').optional().isNumeric(),
];

// Validación de ID
const idValidation = [param('id').isMongoId().withMessage('ID inválido')];
const protocolIdValidation = [param('protocolId').isMongoId().withMessage('Protocol ID inválido')];
const visitIdValidation = [param('visitId').isMongoId().withMessage('Visit ID inválido')];
const activityIdValidation = [param('activityId').isMongoId().withMessage('Activity ID inválido')];
const ruleIdValidation = [param('ruleId').isMongoId().withMessage('Rule ID inválido')];

// Validación de query params
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La página debe ser mayor a 0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('El tamaño de página debe estar entre 1 y 100'),
  query('status').optional().isIn(['active', 'inactive', 'draft']).withMessage('Estado inválido'),
];

// ==========================================
// RUTAS DE PROTOCOLOS
// ==========================================

// Obtener todos los protocolos (paginado)
router.get(
  '/',
  validate(paginationValidation),
  protocolController.getProtocols
);

// Obtener protocolo por ID
router.get(
  '/:id',
  validate(idValidation),
  protocolController.getProtocolById
);

// Crear protocolo
router.post(
  '/',
  validate(protocolValidation),
  protocolController.createProtocol
);

// Actualizar protocolo
router.put(
  '/:id',
  validate([...idValidation, ...protocolUpdateValidation]),
  protocolController.updateProtocol
);

// Eliminar protocolo
router.delete(
  '/:id',
  validate(idValidation),
  protocolController.deleteProtocol
);

// ==========================================
// RUTAS DE VISITAS
// ==========================================

// Agregar visita a protocolo
router.post(
  '/:protocolId/visits',
  validate([...protocolIdValidation, ...visitValidation]),
  protocolController.addVisit
);

// Actualizar orden de visitas (múltiples) - DEBE IR ANTES de /:visitId
router.put(
  '/:protocolId/visits/order',
  validate([...protocolIdValidation]),
  protocolController.updateVisitsOrder
);

// Actualizar visita
router.put(
  '/:protocolId/visits/:visitId',
  validate([...protocolIdValidation, ...visitIdValidation, ...visitValidation]),
  protocolController.updateVisit
);

// Eliminar visita
router.delete(
  '/:protocolId/visits/:visitId',
  validate([...protocolIdValidation, ...visitIdValidation]),
  protocolController.deleteVisit
);

// ==========================================
// RUTAS DE ACTIVIDADES
// ==========================================

// Agregar actividad a visita
router.post(
  '/:protocolId/visits/:visitId/activities',
  validate([...protocolIdValidation, ...visitIdValidation, ...activityValidation]),
  protocolController.addActivity
);

// Actualizar actividad
router.put(
  '/:protocolId/visits/:visitId/activities/:activityId',
  validate([
    ...protocolIdValidation,
    ...visitIdValidation,
    ...activityIdValidation,
    ...activityValidation,
  ]),
  protocolController.updateActivity
);

// Eliminar actividad
router.delete(
  '/:protocolId/visits/:visitId/activities/:activityId',
  validate([...protocolIdValidation, ...visitIdValidation, ...activityIdValidation]),
  protocolController.deleteActivity
);

// Importar plantilla en una visita
router.post(
  '/:protocolId/visits/:visitId/import-template',
  validate([
    ...protocolIdValidation,
    ...visitIdValidation,
    body('templateId').isMongoId().withMessage('Template ID inválido'),
  ]),
  protocolController.importTemplate
);

// Previsualizar texto de historia clínica con IA (sin generar PDF)
router.post(
  '/:protocolId/visits/:visitId/preview-clinical-history',
  validate([...protocolIdValidation, ...visitIdValidation]),
  protocolController.previewClinicalHistory
);

// Generar historia clínica con IA
router.post(
  '/:protocolId/visits/:visitId/generate-clinical-history',
  validate([...protocolIdValidation, ...visitIdValidation]),
  protocolController.generateClinicalHistory
);

// ==========================================
// RUTAS DE REGLAS CLÍNICAS
// ==========================================

// Agregar regla clínica
router.post(
  '/:protocolId/clinical-rules',
  validate([...protocolIdValidation, ...clinicalRuleValidation]),
  protocolController.addClinicalRule
);

// Actualizar regla clínica
router.put(
  '/:protocolId/clinical-rules/:ruleId',
  validate([...protocolIdValidation, ...ruleIdValidation, ...clinicalRuleValidation]),
  protocolController.updateClinicalRule
);

// Eliminar regla clínica
router.delete(
  '/:protocolId/clinical-rules/:ruleId',
  validate([...protocolIdValidation, ...ruleIdValidation]),
  protocolController.deleteClinicalRule
);

export default router;

