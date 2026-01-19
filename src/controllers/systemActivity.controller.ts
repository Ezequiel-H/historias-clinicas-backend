import { Request, Response } from 'express';
import { SystemActivity } from '../models/SystemActivity';

export const systemActivityController = {
  // Obtener todas las actividades del sistema (ordenadas por order)
  getSystemActivities: async (_req: Request, res: Response): Promise<void> => {
    try {
      const activities = await SystemActivity.find()
        .sort({ order: 1 })
        .lean();

      // Transformar IDs manualmente
      const transformedActivities = activities.map((activity: any) => {
        const transformed = { ...activity, id: activity._id };
        delete transformed._id;
        delete transformed.__v;
        return transformed;
      });

      res.json({
        success: true,
        data: transformedActivities,
      });
    } catch (error) {
      console.error('Error al obtener actividades del sistema:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener actividades del sistema',
      });
    }
  },
};

