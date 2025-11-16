import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { authMiddleware, checkRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validator';

const router = Router();

// Validaciones
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida'),
];

const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('role')
    .optional()
    .isIn(['admin', 'medico', 'investigador_principal'])
    .withMessage('Rol inválido'),
];

// Rutas públicas
router.post('/login', validate(loginValidation), authController.login);
router.post('/logout', authController.logout);

// Rutas protegidas
router.get('/me', authMiddleware, authController.getCurrentUser);

// Rutas solo para admin
router.post(
  '/register',
  authMiddleware,
  checkRole('admin'),
  validate(registerValidation),
  authController.register
);

export default router;

