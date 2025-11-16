import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// Middleware para manejar resultados de validación
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Ejecutar todas las validaciones
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Obtener errores
    const errors = validationResult(req);

    if (errors.isEmpty()) {
      return next();
    }

    // Formatear errores
    const extractedErrors: Record<string, string[]> = {};
    errors.array().forEach((err) => {
      if (err.type === 'field') {
        if (!extractedErrors[err.path]) {
          extractedErrors[err.path] = [];
        }
        extractedErrors[err.path].push(err.msg);
      }
    });

    res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: extractedErrors,
    });
  };
};

