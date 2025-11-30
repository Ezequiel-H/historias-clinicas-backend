import { Request, Response } from 'express';
import { Protocol } from '../models/Protocol';
import { Template } from '../models/Template';

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

  // Actualizar orden de visitas (múltiples)
  updateVisitsOrder: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId } = req.params;
      const { visitsOrder } = req.body; // Array de { visitId, order }

      if (!Array.isArray(visitsOrder)) {
        res.status(400).json({
          success: false,
          error: 'visitsOrder debe ser un array',
        });
        return;
      }

      // Reintentar en caso de error de versión (hasta 3 intentos)
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const protocol = await Protocol.findById(protocolId);

          if (!protocol) {
            res.status(404).json({
              success: false,
              error: 'Protocolo no encontrado',
            });
            return;
          }

          // Actualizar el orden de cada visita
          visitsOrder.forEach(({ visitId, order }: { visitId: string; order: number }) => {
            const visit = (protocol.visits as any).id(visitId);
            if (visit) {
              visit.order = order;
            }
          });

          await protocol.save();

          res.json({
            success: true,
            data: protocol.toJSON(),
            message: 'Orden de visitas actualizado exitosamente',
          });
          return; // Éxito, salir del bucle
        } catch (error: any) {
          attempts++;
          // Si es un error de versión y aún hay intentos, reintentar
          if (error.name === 'VersionError' && attempts < maxAttempts) {
            // Esperar un poco antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            continue;
          }
          // Si no es un error de versión o se agotaron los intentos, lanzar el error
          throw error;
        }
      }
    } catch (error) {
      console.error('Error al actualizar orden de visitas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al actualizar el orden de las visitas',
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

  // Importar plantilla en una visita
  importTemplate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;
      const { templateId } = req.body;

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

      const template = await Template.findById(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plantilla no encontrada',
        });
        return;
      }

      // Copiar actividades de la plantilla a la visita
      // Generar nuevos IDs para las actividades importadas
      const importedActivities = template.activities.map((activity: any) => {
        const activityObj = activity.toObject ? activity.toObject() : activity;
        // Eliminar el _id para que MongoDB genere uno nuevo
        delete activityObj._id;
        delete activityObj.id;
        // Ajustar el orden para que se agreguen al final
        activityObj.order = (visit.activities?.length || 0) + (activityObj.order || 0) + 1;
        return activityObj;
      });

      visit.activities.push(...importedActivities);
      await protocol.save();

      res.json({
        success: true,
        data: protocol.toJSON(),
        message: `Plantilla "${template.name}" importada exitosamente. Se agregaron ${importedActivities.length} actividades.`,
      });
    } catch (error) {
      console.error('Error al importar plantilla:', error);
      res.status(500).json({
        success: false,
        error: 'Error al importar plantilla',
      });
    }
  },
};

