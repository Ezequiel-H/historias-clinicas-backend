import { Request, Response } from 'express';
import { ActivityTemplate } from '../models/ActivityTemplate';
import { Protocol } from '../models/Protocol';
import { IActivity } from '../types';

export const activityTemplateController = {
  // Obtener todas las plantillas
  getTemplates: async (_req: Request, res: Response): Promise<void> => {
    try {
      const templates = await ActivityTemplate.find().sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('Error al obtener plantillas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener plantillas',
      });
    }
  },

  // Obtener una plantilla por ID
  getTemplateById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { templateId } = req.params;

      const template = await ActivityTemplate.findById(templateId);

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

      if (!name || !activities || !Array.isArray(activities) || activities.length === 0) {
        res.status(400).json({
          success: false,
          error: 'El nombre y al menos una actividad son requeridos',
        });
        return;
      }

      const template = new ActivityTemplate({
        name,
        description: description || '',
        activities,
      });

      await template.save();

      res.status(201).json({
        success: true,
        data: template.toJSON(),
        message: 'Plantilla creada exitosamente',
      });
    } catch (error) {
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
      const { templateId } = req.params;
      const { name, description, activities } = req.body;

      const template = await ActivityTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      if (name) template.name = name;
      if (description !== undefined) template.description = description;
      if (activities && Array.isArray(activities)) template.activities = activities;

      await template.save();

      res.json({
        success: true,
        data: template.toJSON(),
        message: 'Plantilla actualizada exitosamente',
      });
    } catch (error) {
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
      const { templateId } = req.params;

      const template = await ActivityTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      await template.deleteOne();

      res.json({
        success: true,
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

  // Aplicar plantilla a una visita (agregar todas las actividades como copias)
  applyTemplateToVisit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId, templateId } = req.params;

      const protocol = await Protocol.findById(protocolId);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      const visit = (protocol.visits as any).id(visitId);

      if (!visit) {
        res.status(404).json({
          success: false,
          error: 'Visita no encontrada',
        });
        return;
      }

      const template = await ActivityTemplate.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      // Obtener el orden máximo actual de las actividades en la visita
      const currentMaxOrder = visit.activities.length > 0
        ? Math.max(...visit.activities.map((a: any) => a.order || 0))
        : 0;

      // Crear copias de las actividades de la plantilla
      const activitiesToAdd = template.activities.map((activity: IActivity, index: number) => {
        // Crear una copia profunda de la actividad sin referencias
        const activityCopy = JSON.parse(JSON.stringify(activity));
        // Asignar un nuevo orden (después del máximo actual)
        activityCopy.order = currentMaxOrder + index + 1;
        return activityCopy;
      });

      // Agregar las actividades a la visita
      visit.activities.push(...activitiesToAdd);
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: `Plantilla aplicada exitosamente. Se agregaron ${activitiesToAdd.length} actividades.`,
      });
    } catch (error) {
      console.error('Error al aplicar plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al aplicar plantilla',
      });
    }
  },
};


