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

      // Verificar si el usuario está activo
      if (!user.isActive) {
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
        role: role || 'medico',
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

  // Logout (opcional, ya que JWT es stateless)
  logout: async (_req: Request, res: Response): Promise<void> => {
    // En un sistema JWT puro, el logout se maneja en el cliente
    // eliminando el token del localStorage
    res.json({
      success: true,
      message: 'Logout exitoso',
    });
  },
};

