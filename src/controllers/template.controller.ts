import { Request, Response } from 'express';
import { Template } from '../models/Template';

export const templateController = {
  // Obtener todas las plantillas (paginado)
  getTemplates: async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;

      const skip = (page - 1) * pageSize;

      // Obtener plantillas paginadas
      const [templates, total] = await Promise.all([
        Template.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        Template.countDocuments(),
      ]);

      // Transformar IDs manualmente
      const transformedTemplates = templates.map((template: any) => {
        const transformed = { ...template, id: template._id };
        delete transformed._id;
        delete transformed.__v;
        return transformed;
      });

      res.json({
        data: transformedTemplates,
        total,
        page,
        pageSize,
      });
    } catch (error) {
      console.error('Error al obtener plantillas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener plantillas',
      });
    }
  },

  // Obtener plantilla por ID
  getTemplateById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await Template.findById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      res.json({
        success: true,
        data: template.toJSON(),
      });
    } catch (error) {
      console.error('Error al obtener plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener plantilla',
      });
    }
  },

  // Crear nueva plantilla
  createTemplate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description, activities } = req.body;

      const template = new Template({
        name,
        description: description || '',
        activities: activities || [],
      });

      await template.save();

      res.status(201).json({
        success: true,
        data: template.toJSON(),
        message: 'Plantilla creada exitosamente',
      });
    } catch (error: any) {
      console.error('Error al crear plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al crear plantilla',
      });
    }
  },

  // Actualizar plantilla
  updateTemplate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, activities } = req.body;

      const template = await Template.findByIdAndUpdate(
        id,
        {
          name,
          description,
          activities,
        },
        { new: true, runValidators: true }
      );

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      res.json({
        success: true,
        data: template.toJSON(),
        message: 'Plantilla actualizada exitosamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar plantilla',
      });
    }
  },

  // Eliminar plantilla
  deleteTemplate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await Template.findById(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      // Prevenir la eliminación de la plantilla "Visita Basica"
      const templateName = template.name || '';
      if (templateName.toLowerCase() === 'visita basica') {
        res.status(400).json({
          success: false,
          error: 'No se puede eliminar la plantilla "Visita Basica". Esta plantilla es requerida por el sistema y se incluye automáticamente en todas las visitas nuevas.',
        });
        return;
      }

      await Template.findByIdAndDelete(id);

      res.json({
        success: true,
        data: null,
        message: 'Plantilla eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar plantilla',
      });
    }
  },

  // Agregar actividad a plantilla
  addActivity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;
      const activityData = req.body;

      const template = await Template.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      template.activities.push(activityData);
      await template.save();

      res.status(201).json({
        success: true,
        data: template.toJSON(),
        message: 'Actividad agregada exitosamente',
      });
    } catch (error) {
      console.error('Error al agregar actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error al agregar actividad',
      });
    }
  },

  // Actualizar actividad
  updateActivity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId, activityId } = req.params;
      const activityData = req.body;

      const template = await Template.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      const activity = (template.activities as any).id(activityId);

      if (!activity) {
        res.status(404).json({
          success: false,
          error: 'Actividad no encontrada',
        });
        return;
      }

      // Actualizar campos de la actividad
      Object.assign(activity, activityData);
      await template.save();

      res.json({
        success: true,
        data: template.toJSON(),
        message: 'Actividad actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error al actualizar actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar actividad',
      });
    }
  },

  // Eliminar actividad
  deleteActivity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId, activityId } = req.params;

      const template = await Template.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      const activity = (template.activities as any).id(activityId);

      if (!activity) {
        res.status(404).json({
          success: false,
          error: 'Actividad no encontrada',
        });
        return;
      }

      activity.deleteOne();
      await template.save();

      res.json({
        success: true,
        data: template.toJSON(),
        message: 'Actividad eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar actividad:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar actividad',
      });
    }
  },
};

