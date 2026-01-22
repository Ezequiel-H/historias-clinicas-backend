import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import mammoth from 'mammoth';
import { Protocol } from '../models/Protocol';
import { Template } from '../models/Template';
import { User } from '../models/User';
import { OpenAIService } from '../services/openai.service';
import { ProtocolGenerationSchema } from '../services/schemas/protocol.schema';

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

// Leer system prompt para generar protocolo desde sistemática
function readSystematicPrompt(): string {
  const promptPath = path.join(__dirname, '../system-prompts/generate-protocol-from-systematic.prompt.txt');
  return fs.readFileSync(promptPath, 'utf-8');
}

// Generar protocolo mock para pruebas (sin usar OpenAI)
function generateMockProtocol(_systematicText: string): any {
  // Basado en el ejemplo proporcionado por el usuario
  // El parámetro systematicText no se usa en el mock, pero se mantiene para consistencia con la API real
  return {
    name: "Protocolo de Laboratorio Eli Lilly I8F-MC-GPIT",
    code: "I8F-MC-GPIT",
    sponsor: "Eli Lilly",
    description: "Un estudio de Fase 2, randomizado, doble ciego, controlado con placebo para evaluar la eficacia y la seguridad de dosis de Tirzepatida en investigación en participantes con diabetes Tipo 2 y obesidad",
    visits: [
      {
        name: "Visita 1",
        type: "presencial",
        order: 1,
        activities: [
          {
            name: "Nombre y apellido",
            description: "Ingrese el nombre completo del paciente",
            fieldType: "text_short",
            required: true,
            order: 1,
            helpText: "Escriba el nombre tal como aparece en el documento"
          },
          {
            name: "Fecha de nacimiento",
            description: "Fecha de nacimiento del paciente",
            fieldType: "datetime",
            required: true,
            order: 2,
            datetimeIncludeDate: true,
            datetimeIncludeTime: false
          },
          {
            name: "Edad",
            description: "Edad del paciente",
            fieldType: "number_simple",
            required: true,
            order: 3,
            expectedMin: 0,
            expectedMax: 120,
            decimalPlaces: 0
          },
          {
            name: "Dirección",
            description: "Dirección completa del paciente",
            fieldType: "text_long",
            required: true,
            order: 4
          },
          {
            name: "Teléfonos",
            description: "Números de teléfono de contacto",
            fieldType: "text_short",
            required: true,
            order: 5
          },
          {
            name: "Mail",
            description: "Dirección de correo electrónico",
            fieldType: "text_short",
            required: false,
            order: 6
          },
          {
            name: "Raza",
            description: "Raza del paciente",
            fieldType: "select_single",
            required: true,
            order: 7,
            selectMultiple: false,
            options: [
              { value: "blanca", label: "Blanca" },
              { value: "indioamericano", label: "Indioamericano" }
            ]
          },
          {
            name: "Etnia",
            description: "Etnia del paciente",
            fieldType: "select_single",
            required: true,
            order: 8,
            selectMultiple: false,
            options: [
              { value: "hispano_latino", label: "Hispano o latino" },
              { value: "no_hispano_latino", label: "No hispano o latino" }
            ]
          },
          {
            name: "Fecha de visita",
            description: "Fecha en que se realiza la visita",
            fieldType: "datetime",
            required: true,
            order: 9,
            datetimeIncludeDate: true,
            datetimeIncludeTime: false,
            isVisitDate: true
          },
          {
            name: "Protocolo",
            description: "Información del protocolo",
            fieldType: "text_long",
            required: true,
            order: 10,
            helpText: "Protocolo: de Laboratorio Eli Lilly I8F-MC-GPIT \"Un estudio de Fase 2, randomizado, doble ciego, controlado con placebo para evaluar la eficacia y la seguridad de dosis de Tirzepatida en investigación en participantes con diabetes Tipo 2 y obesidad\""
          },
          {
            name: "Evaluar criterios de inclusión y exclusión",
            description: "Evaluar criterios de inclusión y exclusión en FORMULARIO DE ELEGIBILIDAD",
            fieldType: "boolean",
            required: true,
            order: 11,
            helpText: "Evaluar en FORMULARIO DE ELEGIBILIDAD (Versión 2.0 del 15/11/2023)"
          },
          {
            name: "Número de paciente IWRS",
            description: "Número de paciente asignado por IWRS",
            fieldType: "text_short",
            required: true,
            order: 12,
            helpText: "Después de la firma del ICF"
          },
          {
            name: "Antecedentes médicos",
            description: "Reinterrogar antecedentes médicos",
            fieldType: "text_long",
            required: true,
            order: 13,
            helpText: "Aclarar la intensidad de cada antecedente. Incluir: Obesidad, Diabetes 2, enfermedad de la vesícula biliar, antecedentes CV, carcinoma medular de tiroides, pancreatitis y apnea obstructiva del sueño"
          },
          {
            name: "Uso de sustancias",
            description: "Uso de sustancias pasado/actual",
            fieldType: "select_single",
            required: false,
            order: 14,
            selectMultiple: true,
            options: [
              { value: "tabaco", label: "Tabaco" },
              { value: "alcohol", label: "Alcohol" },
              { value: "otras", label: "Otras sustancias" }
            ]
          },
          {
            name: "Tabaco",
            description: "Historial de tabaquismo",
            fieldType: "select_single",
            required: false,
            order: 15,
            selectMultiple: false,
            options: [
              { value: "nunca_fumo", label: "Nunca fumó" },
              { value: "actual", label: "Actual" },
              { value: "previo", label: "Previo" },
              { value: "dejo", label: "Dejó" }
            ],
            helpText: "Si dejó o es actual, especificar fecha de inicio y fin, cantidad"
          },
          {
            name: "Alcohol",
            description: "Consumo de alcohol",
            fieldType: "select_single",
            required: false,
            order: 16,
            selectMultiple: false,
            options: [
              { value: "nunca", label: "Nunca" },
              { value: "dejo", label: "Dejó" },
              { value: "actual", label: "Actual" }
            ],
            helpText: "Fecha de inicio, frecuencia semanal y mensual. Cerveza (Unidad 360 ml), Vino (unidad 150 ml), Spirits (Unidad 45 ml)"
          },
          {
            name: "Medicación concomitante",
            description: "Reinterrogar medicación concomitante",
            fieldType: "text_long",
            required: true,
            order: 17,
            helpText: "Documentar uso de medicación reductora de peso y para la DBTs en los últimos 12 meses. Registrar DBI AP (1 GR) o DBI AP FORTE o DBI AP 500. Documentar si el paciente usó GLP1 (en caso afirmativo, fecha en que dejó)"
          },
          {
            name: "Talla",
            description: "Talla del paciente en centímetros",
            fieldType: "number_simple",
            required: true,
            order: 18,
            measurementUnit: "cm",
            expectedMin: 100,
            expectedMax: 250,
            decimalPlaces: 1,
            helpText: "Descalzo, en cm CON 1 DECIMAL DE MILIMETRO"
          },
          {
            name: "Peso",
            description: "Peso corporal del paciente",
            fieldType: "number_simple",
            required: true,
            order: 19,
            measurementUnit: "kg",
            expectedMin: 30,
            expectedMax: 200,
            decimalPlaces: 1,
            helpText: "Con ropa ligera, sin calzado, luego de vaciar la vejiga",
            validationRules: [
              {
                name: "IMC mínimo requerido",
                condition: "min",
                minValue: 35.0,
                severity: "error",
                message: "IMC debe ser mayor a 35.0 kg/m2",
                isActive: true
              }
            ]
          },
          {
            name: "IMC",
            description: "Índice de Masa Corporal (calculado automáticamente)",
            fieldType: "calculated",
            required: false,
            order: 20,
            calculationFormula: "peso / ((talla / 100) * (talla / 100))",
            measurementUnit: "kg/m²",
            decimalPlaces: 2,
            helpText: "Debe ser mayor a >35.0 kg/m2",
            validationRules: [
              {
                name: "IMC fuera de criterio",
                condition: "formula",
                formula: "peso / ((talla / 100) * (talla / 100))",
                formulaOperator: "<=",
                value: 35.0,
                severity: "error",
                message: "IMC debe ser mayor a 35.0 kg/m2",
                isActive: true
              }
            ]
          },
          {
            name: "Examen físico",
            description: "Examen físico completo",
            fieldType: "text_long",
            required: true,
            order: 21,
            helpText: "Cardiovascular, respiratorio, gastrointestinal, neurológico y examen de tiroides"
          },
          {
            name: "Presión arterial",
            description: "Medición de presión arterial",
            fieldType: "number_compound",
            required: true,
            order: 22,
            allowMultiple: true,
            repeatCount: 2,
            requireTime: true,
            requireTimePerMeasurement: true,
            timeIntervalMinutes: 1,
            compoundConfig: {
              fields: [
                { name: "sistolica", label: "Sistólica", unit: "mmHg" },
                { name: "diastolica", label: "Diastólica", unit: "mmHg" }
              ]
            },
            helpText: "Signos vitales: sentado luego de 5 minutos de reposo. Elegir brazo preferentemente no dominante. Intervalo entre TAs de al menos 1 minuto. Ejemplo: TA 1: 10:01, TA 2: 10:02"
          },
          {
            name: "Frecuencia cardíaca",
            description: "Frecuencia cardíaca en reposo",
            fieldType: "number_simple",
            required: true,
            order: 23,
            measurementUnit: "lpm",
            expectedMin: 40,
            expectedMax: 120,
            decimalPlaces: 0,
            allowMultiple: true,
            repeatCount: 2,
            requireTime: true,
            requireTimePerMeasurement: true,
            helpText: "Registrar junto con cada TA"
          },
          {
            name: "C-SSRS",
            description: "Médico realiza C-SSRS inicial",
            fieldType: "boolean",
            required: true,
            order: 24
          },
          {
            name: "PHQ-9",
            description: "Paciente completa PHQ-9. Se revisa y documenta puntuación. Firma el médico",
            fieldType: "number_simple",
            required: true,
            order: 25,
            expectedMin: 0,
            expectedMax: 27,
            decimalPlaces: 0
          },
          {
            name: "Laboratorio",
            description: "Extracciones de laboratorio",
            fieldType: "text_long",
            required: true,
            order: 26,
            helpText: "No requiere ayunas. Entrega Orina. Test de embarazo en fértiles en sangre. En mujeres con amenorrea pedir FSH para confirmar menopausia Y HCG (Sub unidad Beta)"
          },
          {
            name: "Eventos adversos",
            description: "Registrar si presentó eventos adversos durante la visita",
            fieldType: "boolean",
            required: false,
            order: 27
          },
          {
            name: "Entrenamiento al paciente",
            description: "Se entrena al paciente acerca de medicación prohibida durante el estudio",
            fieldType: "text_long",
            required: true,
            order: 28,
            helpText: "Medicación prohibida (son los GLP-1). Hombre: no donar esperma durante el estudio ni 4 meses después. Hombres con pareja fértil: usar preservativos durante todo el estudio y hasta 4 meses después. Mujer fértil: utilizar 2 métodos anticonceptivos efectivos, al menos 1 método debe ser altamente efectivo durante el estudio y 2 meses después de la última dosis"
          },
          {
            name: "Tarjeta de contacto",
            description: "Se entrega tarjeta de contacto, versión 15-Sep-14",
            fieldType: "boolean",
            required: true,
            order: 29,
            helpText: "Indicar al paciente que se contacte con el centro en caso de consultas"
          }
        ]
      }
    ]
  };
}

// Extraer texto de archivo PDF
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2.4.5 exporta PDFParse como clase
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = require('pdf-parse');

    // La versión 2.x usa una clase PDFParse
    if (pdfParseModule.PDFParse) {
      const PDFParseClass = pdfParseModule.PDFParse;
      const parser = new PDFParseClass({ data: buffer });
      const result = await parser.getText({});
      return result.text;
    }

    // Fallback para versiones anteriores que exportan función directa
    const pdfParse = typeof pdfParseModule === 'function'
      ? pdfParseModule
      : pdfParseModule.default || pdfParseModule;

    if (typeof pdfParse !== 'function') {
      throw new Error('No se pudo encontrar la función pdfParse en el módulo');
    }

    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error(`Error al leer PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Extraer texto de archivo DOCX
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new Error(`Error al leer DOCX: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

// Extraer texto de archivo según su extensión
async function extractTextFromFile(buffer: Buffer, mimetype: string): Promise<string> {
  if (mimetype === 'application/pdf') {
    return extractTextFromPDF(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    return extractTextFromDOCX(buffer);
  } else {
    throw new Error(`Tipo de archivo no soportado: ${mimetype}. Se soportan PDF y DOCX.`);
  }
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

// Extraer valor de "Frente de hoja" de las actividades
function extractFrenteDeHoja(activities: any[]): boolean {
  const frenteDeHojaActivity = activities.find((a: any) =>
    a.name === 'Frente de hoja' ||
    a.name?.toLowerCase() === 'frente de hoja' ||
    a.name?.toLowerCase() === 'frente_de_hoja'
  );

  if (frenteDeHojaActivity && frenteDeHojaActivity.value !== undefined &&
    frenteDeHojaActivity.value !== null && frenteDeHojaActivity.value !== '') {
    // Convertir a boolean: puede ser true, "true", 1, "1", etc.
    const value = frenteDeHojaActivity.value;
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    if (typeof value === 'number') {
      return value === 1;
    }
  }

  // Por defecto, asumir que la primera página es frente si no se especifica
  return true;
}

// Extraer "Nombre y Apellido" de las actividades
function extractNombreApellido(activities: any[]): string | null {
  const nombreApellidoActivity = activities.find((a: any) =>
    a.name === 'Nombre y Apellido' ||
    a.name?.toLowerCase() === 'nombre y apellido' ||
    a.name?.toLowerCase() === 'nombre_apellido' ||
    a.name?.toLowerCase() === 'nombre_apellido'
  );

  if (nombreApellidoActivity && nombreApellidoActivity.value !== undefined &&
    nombreApellidoActivity.value !== null && nombreApellidoActivity.value !== '') {
    return String(nombreApellidoActivity.value);
  }

  return null;
}

// Extraer "DNI" de las actividades
function extractDNI(activities: any[]): string | null {
  const dniActivity = activities.find((a: any) =>
    a.name === 'DNI' ||
    a.name?.toLowerCase() === 'dni'
  );

  if (dniActivity && dniActivity.value !== undefined &&
    dniActivity.value !== null && dniActivity.value !== '') {
    return String(dniActivity.value);
  }

  return null;
}

// Leer imagen del header desde archivo estático
function getHeaderImage(): Buffer | null {
  try {
    // Buscar la imagen del logo
    const imageName = 'Logo Cedic chico.png';
    const assetsPath = path.join(__dirname, '../assets');
    const imagePath = path.join(assetsPath, imageName);

    if (fs.existsSync(imagePath)) {
      return fs.readFileSync(imagePath);
    }

    console.warn('No se encontró imagen del header en assets');
    return null;
  } catch (error) {
    console.error('Error al leer imagen del header:', error);
    return null;
  }
}

// Construir descripción de una actividad individual
// Función helper para extraer contenido entre paréntesis
function extractParenthesesContent(value: any): string {
  if (typeof value !== 'string') {
    value = value?.toString() || '';
  }
  const match = value.match(/\(([^)]+)\)/);
  return match ? match[1] : value;
}

function buildActivityDescription(activityData: any, activity: any, index: number): string {
  const descriptionText = activity?.description || activityData.description || '';
  const displayStructure = activity?.displayStructure || activityData.displayStructure || 'none';
  let description = `\n${index + 1}. ${activityData.name}`;

  if (descriptionText) {
    description += `\n   Descripción: ${descriptionText}`;
  }

  // Agregar estructura de visualización si no es 'none'
  if (displayStructure && displayStructure !== 'none') {
    // Si hay múltiples valores/mediciones, enfatizar que cada uno debe ir en línea separada
    const hasMultipleValues = (activityData.value && Array.isArray(activityData.value) && activityData.value.length > 1) ||
      (activityData.measurements && activityData.measurements.length > 1) ||
      (activityData.value && typeof activityData.value === 'string' && activityData.value.includes(','));

    if (hasMultipleValues && displayStructure === 'indented') {
      description += `\n   NOTA CRÍTICA: Presenta estos valores uno debajo del otro, cada uno indentado con espacios (al menos 2 espacios), integrado naturalmente en el texto narrativo. NO menciones la estructura, NO digas "con estructura de indentación", NO expliques cómo se debe mostrar. Simplemente muéstralos indentados de forma natural. Ejemplo del formato:\n"El peso del paciente es:\n  Flaco\n  Pruebinha\n  Pruebinha"`;
    } else if (hasMultipleValues && displayStructure === 'bullets') {
      description += `\n   NOTA CRÍTICA: Presenta estos valores con viñetas (•), uno por línea, integrado naturalmente en el texto narrativo. NO menciones la estructura, NO digas "con viñetas", NO expliques cómo se debe mostrar. Simplemente muéstralos con viñetas de forma natural. Ejemplo del formato:\n"El peso del paciente es:\n• Flaco\n• Pruebinha\n• Pruebinha"`;
    } else if (hasMultipleValues && displayStructure === 'numbered') {
      description += `\n   NOTA CRÍTICA: Presenta estos valores numerados (1., 2., etc.), uno por línea, integrado naturalmente en el texto narrativo. NO menciones la estructura, NO digas "numerado", NO expliques cómo se debe mostrar. Simplemente muéstralos numerados de forma natural. Ejemplo del formato:\n"El peso del paciente es:\n1. Flaco\n2. Pruebinha\n3. Pruebinha"`;
    } else if (hasMultipleValues && displayStructure === 'parentheses') {
      description += `\n   NOTA CRÍTICA: Presenta estos valores entre paréntesis, uno por línea. Extrae solo el contenido entre "()" de cada valor. Si no hay paréntesis, muestra el valor completo entre paréntesis. Integra esto naturalmente en el texto narrativo. NO menciones la estructura, NO digas "entre paréntesis", NO expliques cómo se debe mostrar. Simplemente muéstralos entre paréntesis de forma natural. Ejemplo del formato:\n"El peso del paciente es:\n(Flaco)\n(Pruebinha)\n(Pruebinha)"`;
    } else if (displayStructure === 'parentheses') {
      description += `\n   NOTA CRÍTICA: Extrae solo el contenido entre paréntesis "()" del valor. Si no hay paréntesis, muestra el valor completo entre paréntesis. NO menciones la estructura, NO expliques cómo se debe mostrar. Ejemplo: si el valor es "Descripción (Contenido)", muestra "(Contenido)" de forma natural en el texto.`;
    } else {
      description += `\n   NOTA CRÍTICA: Aplica la estructura especificada de forma natural en el texto, sin mencionarla ni explicarla. NO digas "con estructura de...", NO expliques la estructura, simplemente aplícala silenciosamente.`;
    }
  }

  // Agregar valores
  if (activityData.value !== undefined && activityData.value !== null && activityData.value !== '') {
    if (typeof activityData.value === 'object' && !Array.isArray(activityData.value)) {
      const compoundValues = Object.entries(activityData.value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      description += `\n   Valores: ${compoundValues}`;
    } else if (Array.isArray(activityData.value)) {
      // Si hay estructura requerida y es array, listar cada valor por separado
      if (displayStructure && displayStructure !== 'none') {
        if (displayStructure === 'indented') {
          description += `\n   Mediciones (cada una DEBE aparecer en una línea separada, indentada con espacios):`;
          activityData.value.forEach((val: any) => {
            description += `\n     ${val}`;
          });
        } else if (displayStructure === 'bullets') {
          description += `\n   Mediciones (cada una DEBE aparecer en una línea separada con viñeta):`;
          activityData.value.forEach((val: any) => {
            description += `\n     • ${val}`;
          });
        } else if (displayStructure === 'numbered') {
          description += `\n   Mediciones (cada una DEBE aparecer en una línea separada numerada):`;
          activityData.value.forEach((val: any, idx: number) => {
            description += `\n     ${idx + 1}. ${val}`;
          });
        } else if (displayStructure === 'parentheses') {
          description += `\n   Mediciones (cada una DEBE aparecer en una línea separada entre paréntesis, solo el contenido entre "()"):`;
          activityData.value.forEach((val: any) => {
            const extractedValue = extractParenthesesContent(val);
            description += `\n     (${extractedValue})`;
          });
        }
      } else {
        description += `\n   Mediciones: ${activityData.value.join(', ')}`;
      }
    } else {
      if (displayStructure === 'parentheses') {
        const extractedValue = extractParenthesesContent(activityData.value);
        description += `\n   Valor (solo mostrar contenido entre paréntesis): (${extractedValue})`;
      } else {
        description += `\n   Valor: ${activityData.value}`;
      }
    }
  }

  // Agregar mediciones detalladas
  if (activityData.measurements && activityData.measurements.length > 0) {
    // Si hay estructura requerida, enfatizar que cada medición debe ir en línea separada
    if (displayStructure && displayStructure !== 'none') {
      if (displayStructure === 'indented') {
        description += `\n   Mediciones (cada una DEBE aparecer en una línea separada, indentada con espacios):`;
        activityData.measurements.forEach((measurement: any, idx: number) => {
          let measurementText = '';
          if (measurement.value !== undefined) {
            measurementText = measurement.value.toString();
          }
          if (measurement.date) measurementText += (measurementText ? ' - ' : '') + `Fecha: ${measurement.date}`;
          if (measurement.time) measurementText += (measurementText ? ' - ' : '') + `Hora: ${measurement.time}`;
          if (measurementText) {
            description += `\n     ${measurementText}`;
          } else {
            description += `\n     Medición ${idx + 1}`;
          }
        });
      } else if (displayStructure === 'bullets') {
        description += `\n   Mediciones (cada una DEBE aparecer en una línea separada con viñeta):`;
        activityData.measurements.forEach((measurement: any, idx: number) => {
          let measurementText = '';
          if (measurement.value !== undefined) {
            measurementText = measurement.value.toString();
          }
          if (measurement.date) measurementText += (measurementText ? ' - ' : '') + `Fecha: ${measurement.date}`;
          if (measurement.time) measurementText += (measurementText ? ' - ' : '') + `Hora: ${measurement.time}`;
          if (measurementText) {
            description += `\n     • ${measurementText}`;
          } else {
            description += `\n     • Medición ${idx + 1}`;
          }
        });
      } else if (displayStructure === 'numbered') {
        description += `\n   Mediciones (cada una DEBE aparecer en una línea separada numerada):`;
        activityData.measurements.forEach((measurement: any, idx: number) => {
          let measurementText = '';
          if (measurement.value !== undefined) {
            measurementText = measurement.value.toString();
          }
          if (measurement.date) measurementText += (measurementText ? ' - ' : '') + `Fecha: ${measurement.date}`;
          if (measurement.time) measurementText += (measurementText ? ' - ' : '') + `Hora: ${measurement.time}`;
          if (measurementText) {
            description += `\n     ${idx + 1}. ${measurementText}`;
          } else {
            description += `\n     ${idx + 1}. Medición ${idx + 1}`;
          }
        });
      } else if (displayStructure === 'parentheses') {
        description += `\n   Mediciones (cada una DEBE aparecer en una línea separada entre paréntesis, solo el contenido entre "()"):`;
        activityData.measurements.forEach((measurement: any, idx: number) => {
          let measurementText = '';
          if (measurement.value !== undefined) {
            measurementText = extractParenthesesContent(measurement.value);
          }
          if (measurement.date) measurementText += (measurementText ? ' - ' : '') + `Fecha: ${measurement.date}`;
          if (measurement.time) measurementText += (measurementText ? ' - ' : '') + `Hora: ${measurement.time}`;
          if (measurementText) {
            description += `\n     (${measurementText})`;
          } else {
            description += `\n     (Medición ${idx + 1})`;
          }
        });
      }
    } else {
      description += `\n   Mediciones:`;
      activityData.measurements.forEach((measurement: any, idx: number) => {
        description += `\n     - Medición ${idx + 1}:`;
        if (measurement.value !== undefined) description += ` Valor: ${measurement.value}`;
        if (measurement.date) description += ` Fecha: ${measurement.date}`;
        if (measurement.time) description += ` Hora: ${measurement.time}`;
      });
    }
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

// Escribir contenido de la historia clínica en el PDF
function writePDFContent(doc: any, clinicalHistoryText: string): void {
  doc.fontSize(11).text(clinicalHistoryText, {
    align: 'justify',
    lineGap: 5,
  });
}

// Agregar número de página y datos del paciente al header (top right) de la página actual
function addPageNumberToCurrentPage(doc: any, pageNumber: number, nombreApellido: string | null, dni: string | null): void {
  const pageWidth = doc.page.width;
  const margin = 50;
  const headerY = margin - 25; // Top of the page, higher up
  const fontSize = 10;
  const spacing = 10; // Espacio entre los elementos

  // Save current position
  const savedX = doc.x;
  const savedY = doc.y;

  doc.fontSize(fontSize).font('Helvetica');

  // Calcular posición del número de página (derecha)
  const pageNumberX = pageWidth - margin - 20;
  const pageNumberWidth = doc.widthOfString(String(pageNumber));
  let currentX = pageNumberX - pageNumberWidth;

  // Agregar número de página (derecha)
  doc.text(
    String(pageNumber),
    currentX,
    headerY
  );

  // Agregar DNI si existe (a la izquierda del número de página)
  if (dni) {
    currentX -= spacing;
    const dniWidth = doc.widthOfString(dni);
    currentX -= dniWidth;
    doc.text(
      dni,
      currentX,
      headerY
    );
  }

  // Agregar Nombre y Apellido si existe (a la izquierda del DNI)
  if (nombreApellido) {
    currentX -= spacing;
    const nombreWidth = doc.widthOfString(nombreApellido);
    currentX -= nombreWidth;
    doc.text(
      nombreApellido,
      currentX,
      headerY
    );
  }

  // Restore position
  doc.x = savedX;
  doc.y = savedY;
}

// Agregar imagen centrada en el header (solo en páginas frente)
// Retorna la posición Y donde debería empezar el contenido (debajo de la imagen)
function addHeaderImage(doc: any, imageBuffer: Buffer | null): number | null {
  if (!imageBuffer) return null;

  try {
    const pageWidth = doc.page.width;
    const margin = 50;
    const headerY = margin - 25; // Top of the page, same as page number

    // Save current position
    const savedX = doc.x;
    const savedY = doc.y;

    // Tamaño de la imagen (ajustar según necesidad)
    const imageWidth = 200;
    const imageHeight = 60;

    // Centrar la imagen horizontalmente
    const x = (pageWidth - imageWidth) / 2;
    const y = headerY;

    doc.image(imageBuffer, x, y, {
      width: imageWidth,
      height: imageHeight,
    });

    // Calcular posición Y donde debería empezar el contenido (debajo de la imagen + espacio)
    const contentStartY = y + imageHeight + 15; // 15px de espacio después de la imagen

    // Restore position
    doc.x = savedX;
    doc.y = savedY;

    // Retornar la posición Y para que el contenido empiece ahí
    return contentStartY;
  } catch (error) {
    console.error('Error al agregar imagen del header:', error);
    return null;
  }
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

      // Extraer si la primera página es frente de hoja
      const primeraPaginaEsFrente = extractFrenteDeHoja(visitData.activities);

      // Extraer datos del paciente
      const nombreApellido = extractNombreApellido(visitData.activities);
      const dni = extractDNI(visitData.activities);

      // Leer imagen del header desde archivo estático
      const headerImage = getHeaderImage();

      // Determinar el número inicial de página
      const startingPageNumber = numeroHoja ? parseInt(numeroHoja, 10) : 1;
      let currentPageNumber = startingPageNumber;
      let currentPageIndex = 0; // Índice de página (0-based)

      // Crear documento PDF - generar a buffer primero
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Función para determinar si una página es frente (front) o dorso (back)
      const isFrontPage = (pageIndex: number): boolean => {
        // Si la primera página es frente, las páginas pares (0, 2, 4...) son frente
        // Si la primera página es dorso, las páginas impares (1, 3, 5...) son frente
        if (primeraPaginaEsFrente) {
          return pageIndex % 2 === 0; // 0, 2, 4, 6... son frente
        } else {
          return pageIndex % 2 === 1; // 1, 3, 5, 7... son frente
        }
      };

      // Add page number and header elements to the CURRENT page when a new page is created
      // When pageAdded fires, we're already on the NEW page, so add elements to it
      doc.on('pageAdded', () => {
        currentPageIndex++;
        // Solo agregar header si es una página frente (front)
        if (isFrontPage(currentPageIndex)) {
          // Agregar imagen centrada y obtener posición Y donde debe empezar el contenido
          const pageContentStartY = addHeaderImage(doc, headerImage);
          // Agregar número de página y datos del paciente
          addPageNumberToCurrentPage(doc, currentPageNumber, nombreApellido, dni);
          currentPageNumber++;

          // Si hay imagen, posicionar el contenido debajo de ella
          if (pageContentStartY !== null) {
            doc.y = pageContentStartY;
            doc.x = 50; // Resetear X a margen izquierdo
          }
        }
      });

      // Collect PDF data
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Add header elements to first page before writing content (solo si es frente)
      let contentStartY: number | null = null;
      if (isFrontPage(0)) {
        // Agregar imagen centrada y obtener posición Y donde debe empezar el contenido
        contentStartY = addHeaderImage(doc, headerImage);
        // Agregar número de página y datos del paciente
        addPageNumberToCurrentPage(doc, startingPageNumber, nombreApellido, dni);
        currentPageNumber++;
      }

      // Si hay imagen, posicionar el contenido debajo de ella
      if (contentStartY !== null) {
        doc.y = contentStartY;
        doc.x = 50; // Resetear X a margen izquierdo
      }

      // Escribir contenido al PDF (sin el header antiguo)
      writePDFContent(doc, clinicalHistoryText);
      addSignatureToPDF(doc, user.sealSignaturePhoto || '');
      addStrikethroughLine(doc);

      // Finalizar PDF y esperar a que termine
      doc.end();

      await new Promise<void>((resolve) => {
        doc.on('end', () => {
          resolve();
        });
      });

      // Enviar PDF con headers
      setPDFResponseHeaders(res, protocol.code, visit.name);
      const pdfBuffer = Buffer.concat(chunks);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error al generar historia clínica:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar historia clínica',
      });
    }
  },

  // Generar protocolo desde archivo sistemática
  generateProtocolFromSystematic: async (req: Request, res: Response): Promise<void> => {
    try {
      // Verificar que se haya subido un archivo
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No se proporcionó ningún archivo',
        });
        return;
      }

      const file = req.file;
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          error: 'Tipo de archivo no soportado. Se aceptan PDF y DOCX (.docx)',
        });
        return;
      }

      // Extraer texto del archivo
      const systematicText = await extractTextFromFile(file.buffer, file.mimetype);

      if (!systematicText || systematicText.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'No se pudo extraer texto del archivo o el archivo está vacío',
        });
        return;
      }

      // Verificar si usar mock o IA real
      const mockAI = process.env.MOCK_AI_PROTOCOL_GENERATION === 'true';

      let generatedProtocol: any;

      if (mockAI) {
        console.log('[MOCK] Generando protocolo mock desde sistemática...');
        // Generar protocolo mock
        generatedProtocol = generateMockProtocol(systematicText);

        // Validar que el mock cumple con el schema
        const validationResult = ProtocolGenerationSchema.safeParse(generatedProtocol);
        if (!validationResult.success) {
          console.error('[MOCK] Error de validación en protocolo mock:', validationResult.error);
          throw new Error('Error de validación en protocolo mock generado');
        }
        generatedProtocol = validationResult.data;
      } else {
        // Leer system prompt
        const systemPrompt = readSystematicPrompt();

        // Generar protocolo usando IA
        const aiService = new OpenAIService();
        const userPrompt = `Sistemática:\n\n${systematicText}\n\nGenera el JSON con la estructura de protocolo, visitas y actividades según la sistemática proporcionada.`;

        generatedProtocol = await aiService.sendMessage(
          systemPrompt,
          userPrompt,
          ProtocolGenerationSchema
        );
      }

      // Verificar que el código del protocolo no exista ya
      const existingProtocol = await Protocol.findOne({ code: generatedProtocol.code.toUpperCase() });
      if (existingProtocol) {
        res.status(400).json({
          success: false,
          error: `Ya existe un protocolo con el código ${generatedProtocol.code}. Por favor, verifica la sistemática o edita el código generado.`,
        });
        return;
      }

      // Crear protocolo en la base de datos
      const newProtocol = new Protocol({
        name: generatedProtocol.name,
        code: generatedProtocol.code.toUpperCase(),
        sponsor: generatedProtocol.sponsor,
        description: generatedProtocol.description,
        status: 'draft', // Por defecto en borrador para revisión
        visits: generatedProtocol.visits,
        clinicalRules: [], // Sin reglas clínicas por defecto
      });

      const savedProtocol = await newProtocol.save();

      // Transformar para respuesta
      const protocolResponse = savedProtocol.toJSON();

      res.json({
        success: true,
        data: protocolResponse,
        message: 'Protocolo generado exitosamente desde la sistemática',
      });
    } catch (error) {
      console.error('Error al generar protocolo desde sistemática:', error);

      let errorMessage = 'Error al generar protocolo desde sistemática';
      if (error instanceof Error) {
        if (error.message.includes('Error de validación')) {
          errorMessage = `Error en la validación de datos generados: ${error.message}`;
        } else if (error.message.includes('No se recibió respuesta')) {
          errorMessage = 'No se recibió respuesta de la IA. Por favor, intenta nuevamente.';
        } else if (error.message.includes('Error al leer')) {
          errorMessage = error.message;
        } else {
          errorMessage = error.message;
        }
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  },
};

