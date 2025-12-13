import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

async function checkReviewers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const usersCollection = db!.collection('users');
    
    const reviewers = await usersCollection.find({ role: 'reviewer' }).toArray();
    
    console.log(`\n📊 Found ${reviewers.length} reviewers:`);
    reviewers.forEach((reviewer: any) => {
      console.log(`  - Email: ${reviewer.email}, Name: ${reviewer.firstName} ${reviewer.lastName}`);
    });
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkReviewers();
