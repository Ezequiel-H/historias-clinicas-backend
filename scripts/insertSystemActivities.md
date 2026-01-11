# MongoDB Insert Statements for System Activities

## Option 1: Using MongoDB Shell (mongosh)

Run this command in your terminal:

```bash
mongosh "mongodb://localhost:27017/historias-clinicas" < scripts/insertSystemActivities.js
```

Or if you're already connected to MongoDB:

```bash
mongosh
use historias-clinicas
load("scripts/insertSystemActivities.js")
```

## Option 2: Direct MongoDB Insert (Copy & Paste)

Connect to your MongoDB database and run:

```javascript
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
```

## Option 3: Using MongoDB Compass or Studio 3T

1. Connect to your database
2. Select the `systemactivities` collection
3. Click "Insert Document"
4. Paste the JSON for each activity (one at a time) or use the insertMany format above

## Verification

After inserting, verify the data was inserted correctly:

```javascript
db.systemactivities.find().sort({ order: 1 }).pretty()
```

You should see both activities with their respective configurations.

