import mongoose, { Schema, Document } from 'mongoose';
import { IActivity } from '../types';

// Schema para Activity (reutilizado del Protocol)
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
        'number_compound',
        'select_single',
        'boolean',
        'datetime',
        'file',
        'conditional',
        'calculated',
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
        required: {
          type: Boolean,
          default: false,
        },
        exclusive: {
          type: Boolean,
          default: false,
        },
      },
    ],
    selectMultiple: {
      type: Boolean,
      default: false,
    },
    allowCustomOptions: {
      type: Boolean,
      default: false,
    },
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
    allowMultiple: Boolean,
    repeatCount: Number,
    datetimeIncludeDate: {
      type: Boolean,
      default: true,
    },
    datetimeIncludeTime: {
      type: Boolean,
      default: false,
    },
    requireDate: {
      type: Boolean,
      default: false,
    },
    requireTime: {
      type: Boolean,
      default: false,
    },
    requireDatePerMeasurement: {
      type: Boolean,
      default: true,
    },
    requireTimePerMeasurement: {
      type: Boolean,
      default: true,
    },
    timeIntervalMinutes: Number,
    calculationFormula: String,
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

// Interface para Template
export interface ITemplate extends Document {
  name: string;
  description?: string;
  activities: IActivity[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema para Template
const templateSchema = new Schema<ITemplate>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la plantilla es requerido'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    activities: {
      type: [activitySchema],
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
        
        // Transformar IDs de actividades
        if (ret.activities) {
          ret.activities = ret.activities.map((activity: any) => {
            const transformedActivity = { ...activity, id: activity._id };
            delete transformedActivity._id;
            return transformedActivity;
          });
        }
        
        return ret;
      },
    },
  }
);

// Índices
templateSchema.index({ name: 1 });
templateSchema.index({ createdAt: -1 });

export const Template = mongoose.model<ITemplate>('Template', templateSchema);

