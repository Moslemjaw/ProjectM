import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

async function migrateCollections() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db!;
    
    // Step 1: Rename editorassignments collection to reviewerassignments
    try {
      const collections = await db.listCollections().toArray();
      const hasEditorAssignments = collections.some(c => c.name === 'editorassignments');
      const hasReviewerAssignments = collections.some(c => c.name === 'reviewerassignments');
      
      if (hasEditorAssignments && !hasReviewerAssignments) {
        await db.renameCollection('editorassignments', 'reviewerassignments');
        console.log('✅ Renamed collection: editorassignments → reviewerassignments');
      } else if (hasReviewerAssignments) {
        console.log('ℹ️  Collection reviewerassignments already exists');
      } else {
        console.log('ℹ️  No editorassignments collection found');
      }
    } catch (error) {
      console.error('⚠️  Collection rename failed:', (error as Error).message);
    }
    
    // Step 2: Rename editorId field to reviewerId in reviewerassignments
    try {
      const reviewerAssignments = db.collection('reviewerassignments');
      const result1 = await reviewerAssignments.updateMany(
        { editorId: { $exists: true } },
        { $rename: { editorId: 'reviewerId' } }
      );
      console.log(`✅ Updated ${result1.modifiedCount} documents in reviewerassignments: editorId → reviewerId`);
    } catch (error) {
      console.error('⚠️  reviewerassignments field rename failed:', (error as Error).message);
    }
    
    // Step 3: Rename editorId field to reviewerId in grades
    try {
      const grades = db.collection('grades');
      const result2 = await grades.updateMany(
        { editorId: { $exists: true } },
        { $rename: { editorId: 'reviewerId' } }
      );
      console.log(`✅ Updated ${result2.modifiedCount} documents in grades: editorId → reviewerId`);
    } catch (error) {
      console.error('⚠️  grades field rename failed:', (error as Error).message);
    }
    
    await mongoose.disconnect();
    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateCollections();
