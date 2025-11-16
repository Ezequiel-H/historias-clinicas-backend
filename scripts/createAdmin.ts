import mongoose from 'mongoose';
import { User } from '../src/models/User';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const createAdmin = async () => {
  try {
    // Conectar a MongoDB
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI no está definido en .env');
    }

    await mongoose.connect(mongoURI);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin y eliminarlo
    const existingAdmin = await User.findOne({ email: 'admin@cedic.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Eliminando usuario existente admin@cedic.com...');
      await User.deleteOne({ email: 'admin@cedic.com' });
      console.log('✅ Usuario anterior eliminado');
    }

    // Crear usuario admin
    const admin = new User({
      email: 'admin@cedic.com',
      password: 'admin123', // Se hasheará automáticamente
      name: 'Administrador CEDIC',
      role: 'admin',
      isActive: true,
    });

    await admin.save();

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('==========================================');
    console.log('Email: admin@cedic.com');
    console.log('Password: admin123');
    console.log('Rol: admin');
    console.log('==========================================');
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Ejecutar
createAdmin();

