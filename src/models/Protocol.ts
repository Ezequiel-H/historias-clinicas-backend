import mongoose, { Schema } from 'mongoose';
import { IProtocol, IVisit, IActivity, IClinicalRule } from '../types';

// Schema para Activity
const activitySchema = new Schema<IActivity>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la actividad es requerido'],
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
      default: '',
    },
    fieldType: {
      type: String,
      required: [true, 'El tipo de campo es requerido'],
      enum: [
        'text_short',
        'text_long',
        'number_simple',
        'number_range',
        'number_compound',
        'select_single',
        'select_multiple',
        'boolean',
        'date',
        'time',
        'datetime',
        'file',
        'table',
        'conditional',
      ],
    },
    required: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      required: true,
    },
    measurementUnit: String,
    expectedMin: Number,
    expectedMax: Number,
    decimalPlaces: {
      type: Number,
      min: 0,
      max: 10,
    },
    options: [
      {
        value: String,
        label: String,
      },
    ],
    compoundConfig: {
      fields: [
        {
          name: String,
          label: String,
          unit: String,
        },
      ],
    },
    conditionalConfig: {
      dependsOn: String,
      showWhen: Schema.Types.Mixed,
    },
    tableConfig: {
      columns: [
        {
          name: String,
          label: String,
          type: String,
          unit: String,
        },
      ],
      minRows: Number,
      maxRows: Number,
    },
    allowMultiple: Boolean,
    repeatCount: Number,
    helpText: String,
    validationRules: [
      {
        name: String,
        condition: {
          type: String,
          enum: ['range', 'min', 'max', 'equals', 'not_equals', 'formula'],
        },
        minValue: Number,
        maxValue: Number,
        value: Schema.Types.Mixed,
        formula: String,
        formulaOperator: {
          type: String,
          enum: ['>', '<', '>=', '<=', '==', '!='],
        },
        severity: {
          type: String,
          enum: ['warning', 'error'],
          default: 'warning',
        },
        message: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  { _id: true }
);

// Schema para Visit
const visitSchema = new Schema<IVisit>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la visita es requerido'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'El tipo de visita es requerido'],
      enum: {
        values: ['presencial', 'telefonica', 'no_programada'],
        message: 'Tipo de visita inválido',
      },
    },
    order: {
      type: Number,
      required: [true, 'El orden es requerido'],
    },
    activities: {
      type: [activitySchema],
      default: [],
    },
  },
  { _id: true }
);

// Schema para Clinical Rule
const clinicalRuleSchema = new Schema<IClinicalRule>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la regla es requerido'],
      trim: true,
    },
    parameter: {
      type: String,
      required: [true, 'El parámetro es requerido'],
      trim: true,
    },
    condition: {
      type: String,
      required: [true, 'La condición es requerida'],
      enum: {
        values: ['range', 'min', 'max', 'equals', 'not_equals'],
        message: 'Condición inválida',
      },
    },
    minValue: Number,
    maxValue: Number,
    value: Schema.Types.Mixed,
    errorMessage: {
      type: String,
      required: [true, 'El mensaje de error es requerido'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// Schema principal de Protocol
const protocolSchema = new Schema<IProtocol>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del protocolo es requerido'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'El código del protocolo es requerido'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    sponsor: {
      type: String,
      required: [true, 'El sponsor es requerido'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es requerida'],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'draft'],
        message: 'Estado inválido',
      },
      default: 'draft',
    },
    visits: {
      type: [visitSchema],
      default: [],
    },
    clinicalRules: {
      type: [clinicalRuleSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        
        // Transformar IDs de subdocumentos
        if (ret.visits) {
          ret.visits = ret.visits.map((visit: any) => {
            const transformedVisit = { ...visit, id: visit._id, protocolId: ret.id };
            delete transformedVisit._id;
            
            if (transformedVisit.activities) {
              transformedVisit.activities = transformedVisit.activities.map((activity: any) => {
                const transformedActivity = { ...activity, id: activity._id, visitId: visit.id || visit._id };
                delete transformedActivity._id;
                return transformedActivity;
              });
            }
            
            return transformedVisit;
          });
        }
        
        if (ret.clinicalRules) {
          ret.clinicalRules = ret.clinicalRules.map((rule: any) => {
            const transformedRule = { ...rule, id: rule._id, protocolId: ret.id };
            delete transformedRule._id;
            return transformedRule;
          });
        }
        
        return ret;
      },
    },
  }
);

// Índices
protocolSchema.index({ code: 1 });
protocolSchema.index({ status: 1 });
protocolSchema.index({ createdAt: -1 });

export const Protocol = mongoose.model<IProtocol>('Protocol', protocolSchema);

