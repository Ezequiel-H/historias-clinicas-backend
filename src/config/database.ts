import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definido en las variables de entorno');
    }

    await mongoose.connect(mongoURI);
    
    console.log('✅ MongoDB conectado exitosamente');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

// Manejar eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB desconectado');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Error de MongoDB:', error);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB desconectado debido a la terminación de la aplicación');
  process.exit(0);
});

