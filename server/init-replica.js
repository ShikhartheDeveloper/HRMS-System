import mongoose from 'mongoose';

async function initReplica() {
  try {
    console.log('Connecting to MongoDB on port 27017 to initiate replica set...');
    await mongoose.connect('mongodb://localhost:27017/admin?directConnection=true');
    
    const adminDb = mongoose.connection.db.admin();
    await adminDb.command({ replSetInitiate: {} });
    console.log('Replica set initiated successfully!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already initialized') || error.message.includes('already has') || error.codeName === 'AlreadyInitialized') {
      console.log('Replica set is already initialized.');
      process.exit(0);
    }
    console.error('Failed to initiate replica set:', error.message);
    process.exit(1);
  }
}

initReplica();
