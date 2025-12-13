import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI!;

async function resetPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db!.collection('users');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Update the reviewer user
    const result = await usersCollection.updateOne(
      { email: 'editor@aasu.edu' },
      { $set: { password: hashedPassword } }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successfully for editor@aasu.edu');
      console.log('   New password: password123');
    } else {
      console.log('⚠️  User not found or password already set');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
