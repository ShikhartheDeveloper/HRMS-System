import mongoose from 'mongoose';
import { env } from './env.js';
import { seedDatabase } from './seed.js';

let mongod = null;

export const connectDB = async () => {
  try {
    let connectionString = env.mongoose.uri;

    if (!connectionString || connectionString === 'memory') {
      console.log('MongoDB URI not specified or set to memory. Starting in-memory MongoDB server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      connectionString = mongod.getUri();
      console.log(`In-memory MongoDB started at: ${connectionString}`);
    }

    mongoose.set('strictQuery', false);
    await mongoose.connect(connectionString, env.mongoose.options);
    console.log('MongoDB Connected successfully!');
    
    // Seed default tenant, roles, and profiles
    await seedDatabase();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
    console.log('MongoDB disconnected.');
  } catch (error) {
    console.error('Error disconnecting database:', error.message);
  }
};
