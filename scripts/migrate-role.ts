import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

async function migrateEditorToReviewer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db!.collection('users');
    
    // Update all users with role 'editor' to 'reviewer'
    const result = await usersCollection.updateMany(
      { role: 'editor' },
      { $set: { role: 'reviewer' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users from 'editor' to 'reviewer'`);
    
    await mongoose.disconnect();
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateEditorToReviewer();
