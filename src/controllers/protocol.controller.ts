import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { Protocol } from '../models/Protocol';
import { Template } from '../models/Template';
import { User } from '../models/User';
import { OpenAIService } from '../services/openai.service';

// ==========================================
// FUNCIONES AUXILIARES PARA GENERAR HISTORIA CLÍNICA
// ==========================================

// Validar datos de entrada para generar historia clínica
function validateClinicalHistoryInput(visitData: any): { isValid: boolean; error?: string } {
  if (!visitData || !visitData.activities) {
    return { isValid: false, error: 'Los datos de la visita son requeridos' };
  }
  return { isValid: true };
}

// Obtener protocolo y visita
async function getProtocolAndVisit(protocolId: string, visitId: string): Promise<{ protocol: any; visit: any } | null> {
  const protocol = await Protocol.findById(protocolId);
  if (!protocol) {
    return null;
  }

  const visit = (protocol.visits as any).id(visitId);
  if (!visit) {
    return null;
  }

  return { protocol, visit };
}

// Leer system prompt desde archivo
function readSystemPrompt(): string {
  const promptPath = path.join(__dirname, '../system-prompts/clinical-history.prompt.txt');
  return fs.readFileSync(promptPath, 'utf-8');
}

// Extraer número de hoja de las actividades
function extractNumeroHoja(activities: any[]): string | null {
  const numeroHojaActivity = activities.find((a: any) => 
    a.name === 'Número de hoja' || a.name?.toLowerCase() === 'número_de_hoja'
  );
  
  if (numeroHojaActivity && numeroHojaActivity.value !== undefined && 
      numeroHojaActivity.value !== null && numeroHojaActivity.value !== '') {
    return String(numeroHojaActivity.value);
  }
  
  return null;
}

// Construir descripción de una actividad individual
function buildActivityDescription(activityData: any, activity: any, index: number): string {
  const descriptionText = activity?.description || activityData.description || '';
  let description = `\n${index + 1}. ${activityData.name}`;
  
  if (descriptionText) {
    description += `\n   Descripción: ${descriptionText}`;
  }
  
  // Agregar valores
  if (activityData.value !== undefined && activityData.value !== null && activityData.value !== '') {
    if (typeof activityData.value === 'object' && !Array.isArray(activityData.value)) {
      const compoundValues = Object.entries(activityData.value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      description += `\n   Valores: ${compoundValues}`;
    } else if (Array.isArray(activityData.value)) {
      description += `\n   Mediciones: ${activityData.value.join(', ')}`;
    } else {
      description += `\n   Valor: ${activityData.value}`;
    }
  }
  
  // Agregar mediciones detalladas
  if (activityData.measurements && activityData.measurements.length > 0) {
    description += `\n   Mediciones:`;
    activityData.measurements.forEach((measurement: any, idx: number) => {
      description += `\n     - Medición ${idx + 1}:`;
      if (measurement.value !== undefined) description += ` Valor: ${measurement.value}`;
      if (measurement.date) description += ` Fecha: ${measurement.date}`;
      if (measurement.time) description += ` Hora: ${measurement.time}`;
    });
  }
  
  // Agregar fecha y hora si existen
  if (activityData.date) description += `\n   Fecha: ${activityData.date}`;
  if (activityData.time) description += `\n   Hora: ${activityData.time}`;
  
  return description;
}

// Construir descripciones de actividades (excluyendo numero_hoja)
function buildActivitiesDescriptions(visitData: any, visit: any): string {
  const filteredActivities = visitData.activities.filter((activityData: any) => {
    return activityData.name !== 'numero_hoja' && activityData.name?.toLowerCase() !== 'numero_hoja';
  });

  return filteredActivities
    .map((activityData: any, index: number) => {
      const activity = visit.activities.find((a: any) => a._id.toString() === activityData.id);
      return buildActivityDescription(activityData, activity, index);
    })
    .join('\n');
}

// Construir user prompt completo
function buildUserPrompt(protocol: any, visit: any, visitData: any, activitiesDescriptions: string): string {
  return `Protocolo: ${protocol.name} (${protocol.code})
Visita: ${visitData.visitName || visit.name}
Fecha de la visita: ${visitData.timestamp ? new Date(visitData.timestamp).toLocaleDateString('es-AR') : 'No especificada'}

Actividades realizadas:
${activitiesDescriptions}`;
}

// Obtener usuario autenticado
async function getAuthenticatedUser(userId: string): Promise<any> {
  return await User.findById(userId);
}

// Generar texto de historia clínica (con o sin mock)
async function generateClinicalHistoryText(systemPrompt: string, userPrompt: string): Promise<string> {
  const mockAI = process.env.MOCK_AI_CLINICAL_HISTORY === 'true';
  
  if (mockAI) {
    return "Paciente Juan Pérez, sexo masculino, de 39 años, nacido el 15/06/1985, con domicilio en Av. Siempre Viva 742, Buenos Aires, Argentina, quien concurre en el marco del protocolo Ezequiel Horowitz (PRO-1) para la visita denominada \"assassa\", correspondiente al seguimiento clínico. La evaluación se realizó el día 10/01/2025, quedando registrada dentro de la visita fechada el 26/12/2025 según cronograma del protocolo.\n\nAl inicio de la consulta se confirmó el trabajo bajo protocolo, la versión vigente del Consentimiento Informado y la firma del mismo, así como la correcta evaluación de los criterios de inclusión y exclusión. Se asignó al paciente el número IWRS-000123. Se efectuó una reinterrogación completa de antecedentes médicos, refiriendo obesidad grado I desde hace aproximadamente cinco años e hipertensión arterial leve. Niega antecedentes de diabetes mellitus tipo 2, enfermedad de la vesícula biliar, carcinoma medular de tiroides y pancreatitis. Refiere apnea obstructiva del sueño leve, sin uso de CPAP.\n\nEn cuanto a hábitos, el paciente presenta antecedente de tabaquismo previo, con inicio en 2005 y cese en diciembre de 2018, con un consumo aproximado de 10 cigarrillos diarios. Refiere consumo actual de alcohol desde el año 2003, con una frecuencia aproximada de dos veces por semana, equivalente a ocho consumos mensuales, habitualmente dos unidades de cerveza y una unidad de vino por ocasión, sin consumo de bebidas destiladas.\n\nSe reinterrogó la medicación concomitante, constatándose uso previo de medicación reductora de peso con orlistat durante seis meses en el último año, así como tratamiento con metformina 850 mg. Niega uso previo de agonistas GLP-1.\n\nEn la evaluación antropométrica se registró una talla de 175,5 cm y un peso de 92,3 kg, con un índice de masa corporal de 29,9 kg/m². Al examen físico, el paciente se encontraba en buen estado general. El examen cardiovascular mostró ruidos cardíacos rítmicos, sin soplos audibles. El examen respiratorio evidenció murmullo vesicular conservado bilateralmente. El abdomen se palpó blando y no doloroso, sin visceromegalias. El examen neurológico no mostró signos de focalización y la glándula tiroides no resultó palpable.\n\nSe realizaron mediciones de presión arterial en brazo derecho. A las 09:15 h se registró una presión arterial de 130/85 mmHg con una frecuencia cardíaca de 72 latidos por minuto, y a las 09:20 h una segunda medición mostró valores de 128/82 mmHg con una frecuencia cardíaca de 70 latidos por minuto, evidenciando cifras tensionales levemente elevadas pero estables entre ambas tomas.\n\nDurante la visita, el médico realizó la evaluación inicial de riesgo suicida mediante C-SSRS y el paciente completó el cuestionario PHQ-9, obteniendo una puntuación de 6, compatible con sintomatología depresiva leve. Se efectuó extracción de muestras de laboratorio a las 10:30 h del mismo día y se realizó entrega de muestra de orina. No correspondió la realización de test de embarazo ni determinaciones hormonales específicas por tratarse de un paciente masculino.\n\nNo se registraron eventos adversos durante el transcurso de la visita. Se brindó entrenamiento específico sobre medicación prohibida, incluyendo agonistas GLP-1, así como indicaciones dirigidas a hombres respecto a la no donación de esperma y el uso de preservativo en caso de tener pareja fértil. Finalmente, se entregó tarjeta de contacto y se indicó al paciente comunicarse con el centro ante cualquier duda o eventualidad, dejando constancia de una adecuada comprensión de las indicaciones y sin incidencias clínicas al cierre de la consulta.";
  }
  
  const aiService = new OpenAIService();
  console.log("prompt", aiService.buildPrompt(systemPrompt, userPrompt));
  return await aiService.sendMessageText(systemPrompt, userPrompt);
}

// Configurar headers de respuesta para PDF
function setPDFResponseHeaders(res: Response, protocolCode: string, visitName: string): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="historia-clinica-${protocolCode}-${visitName.replace(/\s+/g, '-')}.pdf"`
  );
}

// Escribir encabezado del PDF
function writePDFHeader(doc: any, protocol: any, visit: any, visitData: any, numeroHoja: string | null): void {
  doc.fontSize(16).font('Helvetica-Bold').text('HISTORIA CLÍNICA', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).font('Helvetica')
    .text(`Protocolo: ${protocol.name} (${protocol.code})`, { align: 'left' })
    .text(`Visita: ${visitData.visitName || visit.name}`, { align: 'left' })
    .text(`Fecha: ${visitData.timestamp ? new Date(visitData.timestamp).toLocaleDateString('es-AR') : 'No especificada'}`, { align: 'left' });
  
  if (numeroHoja) {
    doc.text(`Número de Hoja: ${numeroHoja}`, { align: 'left' });
  }
  
  doc.moveDown(2);
}

// Escribir contenido de la historia clínica en el PDF
function writePDFContent(doc: any, clinicalHistoryText: string): void {
  doc.fontSize(11).text(clinicalHistoryText, {
    align: 'justify',
    lineGap: 5,
  });
}

// Convertir base64 a buffer de imagen
function convertBase64ToBuffer(base64String: string): Buffer {
  let imageData = base64String;
  if (imageData.startsWith('data:image/')) {
    imageData = imageData.split(',')[1];
  }
  return Buffer.from(imageData, 'base64');
}

// Agregar firma al PDF
function addSignatureToPDF(doc: any, sealSignaturePhoto: string): void {
  if (!sealSignaturePhoto) return;

  doc.moveDown(2);
  
  try {
    const imageBuffer = convertBase64ToBuffer(sealSignaturePhoto);
    const pageWidth = doc.page.width;
    const margin = 50;
    const imageWidth = 150;
    const imageHeight = 80;
    const x = pageWidth - margin - imageWidth;
    const y = doc.y;
    
    doc.image(imageBuffer, x, y, {
      width: imageWidth,
      height: imageHeight,
    });
    
    doc.y = y + imageHeight;
  } catch (error) {
    console.error('Error al agregar firma al PDF:', error);
  }
}

// Agregar línea de tachado al espacio sobrante
function addStrikethroughLine(doc: any): void {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  const currentY = doc.y;
  
  if (currentY < pageHeight - margin - 100) {
    const lineStartX = margin;
    const lineStartY = currentY + 20;
    const lineEndX = pageWidth - margin;
    const lineEndY = pageHeight - margin;
    
    doc
      .moveTo(lineStartX, lineStartY)
      .lineTo(lineEndX, lineEndY)
      .strokeColor('#000000')
      .lineWidth(1)
      .stroke();
  }
}

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

  // Previsualizar texto de historia clínica con IA (sin generar PDF)
  previewClinicalHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;
      const { visitData } = req.body;

      // Validar datos de entrada
      const validation = validateClinicalHistoryInput(visitData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // Obtener protocolo y visita
      const protocolAndVisit = await getProtocolAndVisit(protocolId, visitId);
      if (!protocolAndVisit) {
        res.status(404).json({
          success: false,
          error: 'Protocolo o visita no encontrados',
        });
        return;
      }
      const { protocol, visit } = protocolAndVisit;

      // Leer system prompt
      const systemPrompt = readSystemPrompt();

      // Construir prompt de actividades
      const activitiesDescriptions = buildActivitiesDescriptions(visitData, visit);

      // Construir user prompt completo
      const userPrompt = buildUserPrompt(protocol, visit, visitData, activitiesDescriptions);

      // Generar texto de historia clínica
      const clinicalHistoryText = await generateClinicalHistoryText(systemPrompt, userPrompt);

      // Retornar texto en formato JSON
      res.json({
        success: true,
        data: {
          clinicalHistoryText,
        },
      });
    } catch (error) {
      console.error('Error al previsualizar historia clínica:', error);
      res.status(500).json({
        success: false,
        error: 'Error al previsualizar historia clínica',
      });
    }
  },

  // Generar historia clínica con IA
  generateClinicalHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      const { protocolId, visitId } = req.params;
      const { visitData, clinicalHistoryText: editedText } = req.body;

      // Validar datos de entrada
      const validation = validateClinicalHistoryInput(visitData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // Obtener protocolo y visita
      const protocolAndVisit = await getProtocolAndVisit(protocolId, visitId);
      if (!protocolAndVisit) {
        res.status(404).json({
          success: false,
          error: 'Protocolo o visita no encontrados',
        });
        return;
      }
      const { protocol, visit } = protocolAndVisit;

      // Obtener usuario autenticado
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        });
        return;
      }

      const user = await getAuthenticatedUser(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
        return;
      }

      // Si se proporciona texto editado, usarlo; si no, generar nuevo texto
      let clinicalHistoryText: string;
      if (editedText && typeof editedText === 'string' && editedText.trim()) {
        clinicalHistoryText = editedText;
      } else {
        // Leer system prompt
        const systemPrompt = readSystemPrompt();

        // Construir prompt de actividades
        const activitiesDescriptions = buildActivitiesDescriptions(visitData, visit);

        // Construir user prompt completo
        const userPrompt = buildUserPrompt(protocol, visit, visitData, activitiesDescriptions);

        // Generar texto de historia clínica
        clinicalHistoryText = await generateClinicalHistoryText(systemPrompt, userPrompt);
      }

      // Extraer número de hoja
      const numeroHoja = extractNumeroHoja(visitData.activities);

      // Crear documento PDF
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Configurar headers de respuesta
      setPDFResponseHeaders(res, protocol.code, visit.name);

      // Escribir contenido al PDF
      doc.pipe(res);
      writePDFHeader(doc, protocol, visit, visitData, numeroHoja);
      writePDFContent(doc, clinicalHistoryText);
      addSignatureToPDF(doc, user.sealSignaturePhoto || '');
      addStrikethroughLine(doc);

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

