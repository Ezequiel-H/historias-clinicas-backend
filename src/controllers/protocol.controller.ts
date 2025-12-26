import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Protocol } from '../models/Protocol';
import { Template } from '../models/Template';
import { OpenAIService } from '../services/openai.service';

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

  // Función helper para obtener la plantilla "Visita Basica" (siempre busca la versión más reciente)
  getBasicVisitTemplate: async (): Promise<any> => {
    const templateName = 'Visita Basica';
    
    // Siempre buscar la plantilla más reciente por nombre (case-insensitive)
    let template = await Template.findOne({ 
      name: { $regex: new RegExp(`^${templateName}$`, 'i') } 
    });
    
    if (!template) {
      // Si no existe, crear la plantilla con los campos requeridos
      const basicActivities = [
        {
          name: 'nombre_apellido',
          description: 'Nombre y apellido del paciente',
          fieldType: 'text_short',
          required: true,
          order: 1,
        },
        {
          name: 'dni',
          description: 'DNI del paciente',
          fieldType: 'text_short',
          required: true,
          order: 2,
        },
        {
          name: 'fecha_visita',
          description: 'Fecha de la visita',
          fieldType: 'datetime',
          required: true,
          order: 3,
          datetimeIncludeDate: true,
          datetimeIncludeTime: false,
        },
        {
          name: 'numero_hoja',
          description: 'Número de hoja',
          fieldType: 'number_simple',
          required: true,
          order: 4,
        },
      ];

      template = new Template({
        name: 'Visita Basica',
        description: 'Plantilla básica que se incluye automáticamente en todas las visitas nuevas',
        activities: basicActivities,
      });

      await template.save();
      console.log(`Plantilla "${templateName}" creada automáticamente`);
    }
    
    return template;
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

      // Crear la visita
      protocol.visits.push(visitData);
      await protocol.save();

      // Recargar el protocolo para obtener los IDs correctos
      const updatedProtocol = await Protocol.findById(protocolId);
      
      if (!updatedProtocol) {
        res.status(500).json({
          success: false,
          error: 'Error al recargar el protocolo',
        });
        return;
      }

      // Obtener la visita recién creada (la última en el array)
      const visitsArray = updatedProtocol.visits as any;
      const newVisit = visitsArray[visitsArray.length - 1];
      const visitId = newVisit._id.toString();

      // Buscar la plantilla "visita basica" (siempre busca la versión más reciente)
      const basicTemplate = await protocolController.getBasicVisitTemplate();

      // Importar automáticamente la plantilla "visita basica" con sus actividades actuales
      if (basicTemplate && basicTemplate.activities && basicTemplate.activities.length > 0) {
        const visit = visitsArray.id(visitId);
        
        if (visit) {
          // Obtener nombres de actividades existentes para evitar duplicados
          const existingActivityNames = new Set(
            (visit.activities || []).map((a: any) => a.name?.toLowerCase() || '')
          );

          // Copiar actividades de la plantilla a la visita (usando la versión más reciente)
          // Solo agregar actividades que no existan ya por nombre
          const importedActivities = basicTemplate.activities
            .filter((activity: any) => {
              const activityName = activity.name?.toLowerCase() || '';
              return !existingActivityNames.has(activityName);
            })
            .map((activity: any) => {
              const activityObj = activity.toObject ? activity.toObject() : activity;
              // Eliminar el _id para que MongoDB genere uno nuevo
              delete activityObj._id;
              delete activityObj.id;
              // Ajustar el orden para que se agreguen al principio
              activityObj.order = (visit.activities?.length || 0) + activityObj.order;
              return activityObj;
            });

          if (importedActivities.length > 0) {
            visit.activities.push(...importedActivities);
            await updatedProtocol.save();
          }
        }
      }

      // Recargar el protocolo final para devolver los datos actualizados
      const finalProtocol = await Protocol.findById(protocolId);

      res.status(201).json({
        success: true,
        data: finalProtocol?.toJSON() || updatedProtocol.toJSON(),
        message: 'Visita agregada exitosamente con la plantilla básica incluida',
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

      // Obtener nombres de actividades existentes para evitar duplicados
      const existingActivityNames = new Set(
        (visit.activities || []).map((a: any) => a.name?.toLowerCase() || '')
      );

      // Copiar actividades de la plantilla a la visita
      // Generar nuevos IDs para las actividades importadas
      // Solo agregar actividades que no existan ya por nombre
      const importedActivities = template.activities
        .filter((activity: any) => {
          const activityName = activity.name?.toLowerCase() || '';
          return !existingActivityNames.has(activityName);
        })
        .map((activity: any) => {
          const activityObj = activity.toObject ? activity.toObject() : activity;
          // Eliminar el _id para que MongoDB genere uno nuevo
          delete activityObj._id;
          delete activityObj.id;
          // Ajustar el orden para que se agreguen al final
          activityObj.order = (visit.activities?.length || 0) + (activityObj.order || 0) + 1;
          return activityObj;
        });

      if (importedActivities.length > 0) {
        visit.activities.push(...importedActivities);
        await protocol.save();
      }

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

  // Generar historia clínica con IA
  generateClinicalHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;
      const { visitData } = req.body; // Datos completados de la visita

      if (!visitData || !visitData.activities) {
        res.status(400).json({
          success: false,
          error: 'Los datos de la visita son requeridos',
        });
        return;
      }

      // Obtener protocolo y visita para contexto
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

      // Leer system prompt
      const promptPath = path.join(__dirname, '../system-prompts/clinical-history.prompt.txt');
      const systemPrompt = fs.readFileSync(promptPath, 'utf-8');

      // Construir user prompt con los datos de la visita
      const activitiesDescriptions = visitData.activities
        .map((activityData: any, index: number) => {
          const activity = visit.activities.find((a: any) => a._id.toString() === activityData.id);
          const descriptionText = activity?.description || activityData.description || '';
          
          let description = `\n${index + 1}. ${activityData.name}`;
          if (descriptionText) {
            description += `\n   Descripción: ${descriptionText}`;
          }
          
          if (activityData.value !== undefined && activityData.value !== null && activityData.value !== '') {
            if (typeof activityData.value === 'object' && !Array.isArray(activityData.value)) {
              // Campo compuesto
              const compoundValues = Object.entries(activityData.value)
                .map(([key, val]) => `${key}: ${val}`)
                .join(', ');
              description += `\n   Valores: ${compoundValues}`;
            } else if (Array.isArray(activityData.value)) {
              // Múltiples mediciones
              description += `\n   Mediciones: ${activityData.value.join(', ')}`;
            } else {
              description += `\n   Valor: ${activityData.value}`;
            }
          }
          
          if (activityData.measurements && activityData.measurements.length > 0) {
            description += `\n   Mediciones:`;
            activityData.measurements.forEach((measurement: any, idx: number) => {
              description += `\n     - Medición ${idx + 1}:`;
              if (measurement.value !== undefined) description += ` Valor: ${measurement.value}`;
              if (measurement.date) description += ` Fecha: ${measurement.date}`;
              if (measurement.time) description += ` Hora: ${measurement.time}`;
            });
          }
          
          if (activityData.date) description += `\n   Fecha: ${activityData.date}`;
          if (activityData.time) description += `\n   Hora: ${activityData.time}`;
          
          return description;
        })
        .join('\n');

      const userPrompt = `Protocolo: ${protocol.name} (${protocol.code})
Visita: ${visitData.visitName || visit.name}
Fecha de la visita: ${visitData.timestamp ? new Date(visitData.timestamp).toLocaleDateString('es-AR') : 'No especificada'}

Actividades realizadas:
${activitiesDescriptions}`;

      // Usar OpenAI para generar el texto
      const aiService = new OpenAIService();
      
      // Generar texto libre (sin schema)
      const clinicalHistoryText = await aiService.sendMessageText(
        systemPrompt,
        userPrompt
      );

      // Generar PDF en memoria
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Configurar headers para descarga
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="historia-clinica-${protocol.code}-${visit.name.replace(/\s+/g, '-')}.pdf"`
      );

      // Escribir contenido al PDF
      doc.pipe(res);
      
      // Encabezado
      doc.fontSize(16).font('Helvetica-Bold').text('HISTORIA CLÍNICA', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Protocolo: ${protocol.name} (${protocol.code})`, { align: 'left' });
      doc.text(`Visita: ${visitData.visitName || visit.name}`, { align: 'left' });
      doc.text(`Fecha: ${visitData.timestamp ? new Date(visitData.timestamp).toLocaleDateString('es-AR') : 'No especificada'}`, { align: 'left' });
      doc.moveDown(2);

      // Contenido de la historia clínica
      doc.fontSize(11).text(clinicalHistoryText, {
        align: 'justify',
        lineGap: 5,
      });

      // Finalizar PDF
      doc.end();
    } catch (error) {
      console.error('Error al generar historia clínica:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar historia clínica',
      });
    }
  },
};

