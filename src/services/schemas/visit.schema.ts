import { z } from 'zod';

/**
 * Schema de Zod para validación de reglas de actividad
 */
export const ActivityRuleSchema = z.object({
  name: z.string().min(1, 'El nombre de la regla es requerido'),
  condition: z.enum(['range', 'min', 'max', 'equals', 'not_equals', 'formula'], {
    errorMap: () => ({ message: 'Condición inválida' }),
  }),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  formula: z.string().optional(),
  formulaOperator: z.enum(['>', '<', '>=', '<=', '==', '!=']).optional(),
  severity: z.enum(['warning', 'error']).default('warning'),
  message: z.string().min(1, 'El mensaje es requerido'),
  isActive: z.boolean().default(true),
});

/**
 * Schema de Zod para validación de opciones de selección
 */
export const SelectOptionSchema = z.object({
  value: z.string().min(1, 'El valor es requerido'),
  label: z.string().min(1, 'La etiqueta es requerida'),
  required: z.boolean().optional().default(false),
  exclusive: z.boolean().optional().default(false),
});

/**
 * Schema de Zod para validación de configuración de campo compuesto
 */
export const CompoundFieldConfigSchema = z.object({
  fields: z.array(
    z.object({
      name: z.string().min(1, 'El nombre del campo es requerido'),
      label: z.string().min(1, 'La etiqueta es requerida'),
      unit: z.string().optional(),
    })
  ).min(1, 'Debe haber al menos un campo'),
});

/**
 * Schema de Zod para validación de configuración condicional
 */
export const ConditionalConfigSchema = z.object({
  dependsOn: z.string().min(1, 'El campo dependiente es requerido'),
  showWhen: z.union([z.string(), z.boolean(), z.number()]),
});

/**
 * Schema de Zod para validación de actividades
 */
export const ActivitySchema = z.object({
  name: z.string().min(1, 'El nombre de la actividad es requerido'),
  description: z.string().optional().default(''),
  fieldType: z.enum([
    'text_short',
    'text_long',
    'number_simple',
    'number_compound',
    'select_single',
    'boolean',
    'datetime',
    'file',
    'conditional',
    'calculated',
  ], {
    errorMap: () => ({ message: 'Tipo de campo inválido' }),
  }),
  required: z.boolean().default(false),
  order: z.number().int().min(0, 'El orden debe ser un número entero positivo'),
  measurementUnit: z.string().optional(),
  expectedMin: z.number().optional(),
  expectedMax: z.number().optional(),
  decimalPlaces: z.number().int().min(0).max(10).optional(),
  options: z.array(SelectOptionSchema).optional(),
  selectMultiple: z.boolean().optional().default(false),
  allowCustomOptions: z.boolean().optional().default(false),
  compoundConfig: CompoundFieldConfigSchema.optional(),
  conditionalConfig: ConditionalConfigSchema.optional(),
  allowMultiple: z.boolean().optional(),
  repeatCount: z.number().int().positive().optional(),
  datetimeIncludeDate: z.boolean().optional().default(true),
  datetimeIncludeTime: z.boolean().optional().default(false),
  requireDate: z.boolean().optional().default(false),
  requireTime: z.boolean().optional().default(false),
  requireDatePerMeasurement: z.boolean().optional().default(true),
  requireTimePerMeasurement: z.boolean().optional().default(true),
  timeIntervalMinutes: z.number().int().positive().optional(),
  calculationFormula: z.string().optional(),
  helpText: z.string().optional(),
  validationRules: z.array(ActivityRuleSchema).optional(),
});

/**
 * Schema de Zod para validación de visitas
 * Basado en el modelo IVisit de la base de datos
 */
export const VisitSchema = z.object({
  name: z.string().min(1, 'El nombre de la visita es requerido'),
  type: z.enum(['presencial', 'telefonica', 'no_programada'], {
    errorMap: () => ({ message: 'Tipo de visita inválido' }),
  }),
  order: z.number().int().min(1, 'El orden debe ser un número entero positivo'),
  activities: z.array(ActivitySchema).default([]),
});

/**
 * Tipo TypeScript inferido del schema de Visit
 */
export type VisitSchemaType = z.infer<typeof VisitSchema>;

/**
 * Tipo TypeScript inferido del schema de Activity
 */
export type ActivitySchemaType = z.infer<typeof ActivitySchema>;
