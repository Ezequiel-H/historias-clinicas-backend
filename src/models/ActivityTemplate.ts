import mongoose, { Schema } from 'mongoose';
import { IActivityTemplate, IActivity } from '../types';

// Schema para Activity (sin id ni visitId, ya que es una plantilla)
const templateActivitySchema = new Schema<Omit<IActivity, 'id' | 'visitId'>>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del campo es requerido'],
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
        'medication_tracking',
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
    medicationTrackingConfig: {
      medicationName: String,
      dosageUnit: String, // Unidad de dosis (ej: 'comprimidos', 'ml', 'gotas', etc.)
      quantityPerDose: Number,
      frequencyType: {
        type: String,
        enum: ['once_daily', 'twice_daily', 'three_daily', 'every_x_hours', 'once_weekly'],
      },
      customHoursInterval: Number,
      expectedDailyDose: Number,
      shouldConsumeOnDeliveryDay: Boolean,
      shouldTakeOnVisitDay: Boolean,
    },
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
  { _id: false }
);

// Schema para ActivityTemplate
const activityTemplateSchema = new Schema<IActivityTemplate>(
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
      type: [templateActivitySchema],
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
        return ret;
      },
    },
  }
);

// Índices
activityTemplateSchema.index({ name: 1 });
activityTemplateSchema.index({ createdAt: -1 });

export const ActivityTemplate = mongoose.model<IActivityTemplate>('ActivityTemplate', activityTemplateSchema);


