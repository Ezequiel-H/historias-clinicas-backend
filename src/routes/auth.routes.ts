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
    .isIn(['admin', 'doctor', 'investigador_principal'])
    .withMessage('Rol inválido'),
];

const signupValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('El apellido es requerido'),
  body('licenseNumber')
    .trim()
    .notEmpty()
    .withMessage('El número de licencia es requerido')
    .isNumeric()
    .withMessage('El número de licencia debe ser solo números'),
  body('sealSignaturePhoto')
    .notEmpty()
    .withMessage('La foto de sello y firma es requerida')
    .isString()
    .withMessage('La foto debe ser una cadena base64 válida'),
];

const updateUserStatusValidation = [
  body('isActive')
    .isBoolean()
    .withMessage('isActive debe ser un valor booleano'),
];

const updateSignaturePhotoValidation = [
  body('sealSignaturePhoto')
    .notEmpty()
    .withMessage('La foto de sello y firma es requerida')
    .isString()
    .withMessage('La foto debe ser una cadena base64 válida')
    .custom((value) => {
      if (!value.startsWith('data:image/')) {
        throw new Error('La foto debe ser una imagen válida en formato base64');
      }
      return true;
    }),
];

// Rutas públicas
router.post('/login', validate(loginValidation), authController.login);
router.post('/logout', authController.logout);
router.post('/signup', validate(signupValidation), authController.signup);

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

router.get(
  '/users',
  authMiddleware,
  checkRole('admin'),
  authController.getAllUsers
);

router.patch(
  '/users/:id',
  authMiddleware,
  checkRole('admin'),
  validate(updateUserStatusValidation),
  authController.updateUserStatus
);

router.patch(
  '/users/:id/signature-photo',
  authMiddleware,
  checkRole('admin'),
  validate(updateSignaturePhotoValidation),
  authController.updateUserSignaturePhoto
);

export default router;

