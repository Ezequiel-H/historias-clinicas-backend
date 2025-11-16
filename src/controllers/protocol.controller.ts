import { Request, Response } from 'express';
import { Protocol } from '../models/Protocol';

export const protocolController = {
  // Obtener todos los protocolos (paginado)
  getProtocols: async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const status = req.query.status as string;

      const skip = (page - 1) * pageSize;

      // Construir filtro
      const filter: any = {};
      if (status) {
        filter.status = status;
      }

      // Obtener protocolos paginados
      const [protocols, total] = await Promise.all([
        Protocol.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        Protocol.countDocuments(filter),
      ]);

      // Transformar IDs manualmente
      const transformedProtocols = protocols.map((protocol: any) => {
        const transformed = { ...protocol, id: protocol._id };
        delete transformed._id;
        delete transformed.__v;
        return transformed;
      });

      res.json({
        data: transformedProtocols,
        total,
        page,
        pageSize,
      });
    } catch (error) {
      console.error('Error al obtener protocolos:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener protocolos',
      });
    }
  },

  // Obtener protocolo por ID
  getProtocolById: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const protocol = await Protocol.findById(id);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: protocol.toJSON(),
      });
    } catch (error) {
      console.error('Error al obtener protocolo:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener protocolo',
      });
    }
  },

  // Crear nuevo protocolo
  createProtocol: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, code, sponsor, description, status } = req.body;

      const protocol = new Protocol({
        name,
        code,
        sponsor,
        description,
        status: status || 'draft',
      });

      await protocol.save();

      res.status(201).json({
        success: true,
        data: protocol.toJSON(),
        message: 'Protocolo creado exitosamente',
      });
    } catch (error: any) {
      console.error('Error al crear protocolo:', error);
      
      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          error: 'El código del protocolo ya existe',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Error al crear protocolo',
      });
    }
  },

  // Actualizar protocolo
  updateProtocol: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, code, sponsor, description, status } = req.body;

      const protocol = await Protocol.findByIdAndUpdate(
        id,
        {
          name,
          code,
          sponsor,
          description,
          status,
        },
        { new: true, runValidators: true }
      );

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: 'Protocolo actualizado exitosamente',
      });
    } catch (error: any) {
      console.error('Error al actualizar protocolo:', error);
      
      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          error: 'El código del protocolo ya existe',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Error al actualizar protocolo',
      });
    }
  },

  // Eliminar protocolo
  deleteProtocol: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const protocol = await Protocol.findByIdAndDelete(id);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      res.json({
        success: true,
        data: null,
        message: 'Protocolo eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar protocolo:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar protocolo',
      });
    }
  },

  // Agregar visita a protocolo
  addVisit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId } = req.params;
      const visitData = req.body;

      const protocol = await Protocol.findById(protocolId);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      protocol.visits.push(visitData);
      await protocol.save();

      res.status(201).json({
        success: true,
        data: protocol.toJSON(),
        message: 'Visita agregada exitosamente',
      });
    } catch (error) {
      console.error('Error al agregar visita:', error);
      res.status(500).json({
        success: false,
        error: 'Error al agregar visita',
      });
    }
  },

  // Actualizar visita
  updateVisit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;
      const visitData = req.body;

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

      // Actualizar campos de la visita
      Object.assign(visit, visitData);
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: 'Visita actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error al actualizar visita:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar visita',
      });
    }
  },

  // Eliminar visita
  deleteVisit: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;

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

      visit.deleteOne();
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: 'Visita eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar visita:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar visita',
      });
    }
  },

  // Agregar actividad a visita
  addActivity: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;
      const activityData = req.body;

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

      visit.activities.push(activityData);
      await protocol.save();

      res.status(201).json({
        success: true,
        data: protocol.toJSON(),
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
      const { protocolId, visitId, activityId } = req.params;
      const activityData = req.body;

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

      const activity = (visit.activities as any).id(activityId);

      if (!activity) {
        res.status(404).json({
          success: false,
          error: 'Actividad no encontrada',
        });
        return;
      }

      // Actualizar campos de la actividad
      Object.assign(activity, activityData);
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
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
      const { protocolId, visitId, activityId } = req.params;

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

      const activity = (visit.activities as any).id(activityId);

      if (!activity) {
        res.status(404).json({
          success: false,
          error: 'Actividad no encontrada',
        });
        return;
      }

      activity.deleteOne();
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
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

  // Agregar regla clínica
  addClinicalRule: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId } = req.params;
      const ruleData = req.body;

      const protocol = await Protocol.findById(protocolId);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      protocol.clinicalRules.push(ruleData);
      await protocol.save();

      res.status(201).json({
        success: true,
        data: protocol.toJSON(),
        message: 'Regla clínica agregada exitosamente',
      });
    } catch (error) {
      console.error('Error al agregar regla clínica:', error);
      res.status(500).json({
        success: false,
        error: 'Error al agregar regla clínica',
      });
    }
  },

  // Actualizar regla clínica
  updateClinicalRule: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, ruleId } = req.params;
      const ruleData = req.body;

      const protocol = await Protocol.findById(protocolId);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      const rule = (protocol.clinicalRules as any).id(ruleId);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Regla clínica no encontrada',
        });
        return;
      }

      // Actualizar campos de la regla
      Object.assign(rule, ruleData);
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: 'Regla clínica actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error al actualizar regla clínica:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar regla clínica',
      });
    }
  },

  // Eliminar regla clínica
  deleteClinicalRule: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, ruleId } = req.params;

      const protocol = await Protocol.findById(protocolId);

      if (!protocol) {
        res.status(404).json({
          success: false,
          error: 'Protocolo no encontrado',
        });
        return;
      }

      const rule = (protocol.clinicalRules as any).id(ruleId);

      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Regla clínica no encontrada',
        });
        return;
      }

      rule.deleteOne();
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: 'Regla clínica eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error al eliminar regla clínica:', error);
      res.status(500).json({
        success: false,
        error: 'Error al eliminar regla clínica',
      });
    }
  },
};

