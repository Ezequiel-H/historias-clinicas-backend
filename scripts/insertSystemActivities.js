// MongoDB script to insert system activities
// Run this in MongoDB shell or using mongosh:
// mongosh <your-database-name> < insertSystemActivities.js
// Or use: mongosh "mongodb://localhost:27017/historias-clinicas" < insertSystemActivities.js

// First, clear any existing system activities (optional - comment out if you want to keep existing ones)
// db.systemactivities.deleteMany({});

// Insert system activities
db.systemactivities.insertMany([
  {
    name: "Número de hoja",
    description: "",
    fieldType: "number_simple",
    required: true,
    order: 0,
    measurementUnit: "",
    decimalPlaces: 0,
    options: [],
    selectMultiple: false,
    allowCustomOptions: false,
    compoundConfig: {
      fields: []
    },
    datetimeIncludeDate: true,
    datetimeIncludeTime: false,
    requireDate: false,
    requireTime: false,
    requireDatePerMeasurement: true,
    requireTimePerMeasurement: true,
    helpText: "Número de la hoja en la que comienza esta visita",
    validationRules: [],
    excludeFromAI: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Frente de hoja",
    description: "",
    fieldType: "boolean",
    required: false,
    order: 1,
    measurementUnit: "",
    selectMultiple: false,
    allowCustomOptions: false,
    compoundConfig: {
      fields: []
    },
    datetimeIncludeDate: true,
    datetimeIncludeTime: false,
    requireDate: false,
    requireTime: false,
    requireDatePerMeasurement: true,
    requireTimePerMeasurement: true,
    helpText: "",
    validationRules: [],
    options: [],
    excludeFromAI: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("System activities inserted successfully!");

