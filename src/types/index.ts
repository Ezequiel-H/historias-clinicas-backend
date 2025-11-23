import { Document } from 'mongoose';

// Tipos para Usuarios
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'medico' | 'investigador_principal';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Tipos de campos disponibles
export type FieldType = 
  | 'text_short'
  | 'text_long'
  | 'number_simple'
  | 'number_compound'
  | 'select_single'
  | 'select_multiple'
  | 'boolean'
  | 'date'
  | 'time'
  | 'datetime'
  | 'file'
  | 'conditional';

// Configuración de campo compuesto
export interface CompoundFieldConfig {
  fields: {
    name: string;
    label: string;
    unit?: string;
  }[];
}

// Configuración de opciones para select
export interface SelectOption {
  value: string;
  label: string;
  required?: boolean;      // Si es true, esta opción debe ser seleccionada obligatoriamente
  exclusive?: boolean;     // Si es true, si se selecciona esta opción, el paciente NO califica
}

// Configuración de campo condicional
export interface ConditionalConfig {
  dependsOn: string;
  showWhen: string | boolean;
}

// Actividad
export interface IActivity {
  name: string;
  description?: string;
  fieldType: FieldType;
  required: boolean;
  order: number;
  measurementUnit?: string;
  expectedMin?: number;
  expectedMax?: number;
  decimalPlaces?: number; // Cantidad de decimales para campos numéricos
  options?: SelectOption[];
  allowCustomOptions?: boolean; // Para select_multiple: permite agregar opciones personalizadas
  compoundConfig?: CompoundFieldConfig;
  conditionalConfig?: ConditionalConfig;
  allowMultiple?: boolean;
  repeatCount?: number;
  requireDate?: boolean; // Solicitar fecha en que se realizó la actividad
  requireTime?: boolean; // Solicitar hora en que se realizó la actividad
  helpText?: string;
  validationRules?: IActivityRule[];
}

// Visita
export interface IVisit {
  name: string;
  type: 'presencial' | 'telefonica' | 'no_programada';
  order: number;
  activities: IActivity[];
}

// Regla Clínica (para actividades)
export interface IActivityRule {
  name: string;
  condition: 'range' | 'min' | 'max' | 'equals' | 'not_equals' | 'formula';
  minValue?: number;
  maxValue?: number;
  value?: string | number;
  formula?: string; // Ej: "peso * 10 + altura"
  formulaOperator?: '>' | '<' | '>=' | '<=' | '==' | '!='; // Operador de comparación para fórmulas
  severity: 'warning' | 'error'; // warning = alerta, error = bloqueo
  message: string;
  isActive: boolean;
}

// Regla Clínica (a nivel protocolo - legacy)
export interface IClinicalRule {
  name: string;
  parameter: string;
  condition: 'range' | 'min' | 'max' | 'equals' | 'not_equals';
  minValue?: number;
  maxValue?: number;
  value?: string | number;
  errorMessage: string;
  isActive: boolean;
}

// Protocolo
export interface IProtocol extends Document {
  name: string;
  code: string;
  sponsor: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  visits: IVisit[];
  clinicalRules: IClinicalRule[];
  createdAt: Date;
  updatedAt: Date;
}

// Respuesta API genérica
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Respuesta paginada
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

