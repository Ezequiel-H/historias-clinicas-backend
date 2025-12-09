import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateToken } from '../utils/jwt';

export const authController = {
  // Login
  login: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Buscar usuario por email (incluir password)
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
        return;
      }

      // Verificar si el usuario está activo (permitir login a doctores inactivos para que vean su estado)
      // Los doctores inactivos pueden hacer login pero tendrán acceso limitado
      if (!user.isActive && user.role !== 'doctor') {
        res.status(401).json({
          success: false,
          error: 'Usuario inactivo',
        });
        return;
      }

      // Verificar contraseña
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
        });
        return;
      }

      // Generar token JWT
      const token = generateToken({
        userId: (user._id as any).toString(),
        email: user.email,
        role: user.role,
      });

      // Respuesta sin password
      const userResponse = user.toJSON();

      res.json({
        success: true,
        data: {
          user: userResponse,
          token,
        },
        message: 'Login exitoso',
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        error: 'Error al iniciar sesión',
      });
    }
  },

  // Obtener usuario actual
  getCurrentUser: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        });
        return;
      }

      const user = await User.findById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: user.toJSON(),
      });
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener usuario',
      });
    }
  },

  // Registrar nuevo usuario (solo admins)
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, role } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'El email ya está registrado',
        });
        return;
      }

      // Crear usuario
      const user = new User({
        email,
        password,
        name,
        role: role || 'doctor',
      });

      await user.save();

      res.status(201).json({
        success: true,
        data: user.toJSON(),
        message: 'Usuario registrado exitosamente',
      });
    } catch (error) {
      console.error('Error al registrar usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al registrar usuario',
      });
    }
  },

  // Registrar nuevo doctor (público)
  signup: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, licenseNumber, sealSignaturePhoto } = req.body;

      // Validar campos requeridos
      if (!email || !password || !firstName || !lastName || !licenseNumber || !sealSignaturePhoto) {
        res.status(400).json({
          success: false,
          error: 'Todos los campos son requeridos, incluyendo la foto de sello y firma',
        });
        return;
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'El email ya está registrado',
        });
        return;
      }

      // Verificar si el número de licencia ya existe
      const existingLicense = await User.findOne({ licenseNumber });

      if (existingLicense) {
        res.status(400).json({
          success: false,
          error: 'El número de licencia ya está registrado',
        });
        return;
      }

      // Crear nombre completo
      const name = `${firstName} ${lastName}`.trim();

      // Crear usuario doctor
      const user = new User({
        email,
        password,
        name,
        firstName,
        lastName,
        licenseNumber,
        sealSignaturePhoto,
        role: 'doctor',
        isActive: false, // Requiere aprobación del admin
      });

      await user.save();

      // Generar token JWT para auto-login
      const token = generateToken({
        userId: (user._id as any).toString(),
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        data: {
          user: user.toJSON(),
          token,
        },
        message: 'Registro exitoso. Su cuenta será activada por un administrador.',
      });
    } catch (error: any) {
      console.error('Error al registrar doctor:', error);
      
      // Manejar errores de validación de MongoDB
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        res.status(400).json({
          success: false,
          error: `El ${field === 'email' ? 'email' : 'número de licencia'} ya está registrado`,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Error al registrar doctor',
      });
    }
  },

  // Logout (opcional, ya que JWT es stateless)
  logout: async (_req: Request, res: Response): Promise<void> => {
    // En un sistema JWT puro, el logout se maneja en el cliente
    // eliminando el token del localStorage
    res.json({
      success: true,
      message: 'Logout exitoso',
    });
  },

  // Obtener todos los usuarios (solo admins)
  getAllUsers: async (_req: Request, res: Response): Promise<void> => {
    try {
      // Obtener todos los usuarios, excluyendo password
      const users = await User.find().select('-password').sort({ createdAt: -1 });

      res.json({
        success: true,
        data: users.map(user => user.toJSON()),
      });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener usuarios',
      });
    }
  },

  // Actualizar estado isActive de un usuario (solo admins)
  updateUserStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isActive debe ser un valor booleano',
        });
        return;
      }

      const user = await User.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
        return;
      }

      // Solo permitir cambiar estado de doctores, no de admins
      if (user.role === 'admin') {
        res.status(400).json({
          success: false,
          error: 'No se puede cambiar el estado de un administrador',
        });
        return;
      }

      // No permitir desactivar a sí mismo
      if (req.user && (req.user as any).userId === id && !isActive) {
        res.status(400).json({
          success: false,
          error: 'No puedes desactivar tu propia cuenta',
        });
        return;
      }

      user.isActive = isActive;
      await user.save();

      res.json({
        success: true,
        data: user.toJSON(),
        message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      });
    } catch (error) {
      console.error('Error al actualizar estado del usuario:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar estado del usuario',
      });
    }
  },
};

