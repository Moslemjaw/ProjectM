import { MongoClient } from 'mongodb';

async function deleteAllProjects() {
  let client: MongoClient | null = null;
  
  try {
    console.log('🗑️  Starting deletion of all projects and related data...');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    client = new MongoClient(mongoUri);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();

    // Delete all projects
    const projectsDeleted = await db.collection('projects').deleteMany({});
    console.log(`✅ Deleted ${projectsDeleted.deletedCount} projects`);

    // Delete all grades
    const gradesDeleted = await db.collection('grades').deleteMany({});
    console.log(`✅ Deleted ${gradesDeleted.deletedCount} grades`);

    // Delete all reviewer assignments
    const assignmentsDeleted = await db.collection('reviewerassignments').deleteMany({});
    console.log(`✅ Deleted ${assignmentsDeleted.deletedCount} reviewer assignments`);

    // Delete all notifications
    const notificationsDeleted = await db.collection('notifications').deleteMany({});
    console.log(`✅ Deleted ${notificationsDeleted.deletedCount} notifications`);

    // Delete all activity logs
    const logsDeleted = await db.collection('activitylogs').deleteMany({});
    console.log(`✅ Deleted ${logsDeleted.deletedCount} activity logs`);

    // Delete all file uploads
    const filesDeleted = await db.collection('fileuploads').deleteMany({});
    console.log(`✅ Deleted ${filesDeleted.deletedCount} file uploads`);

    console.log('\n🎉 All projects and related data have been successfully deleted!');
    
    await client.close();
    console.log('✅ Disconnected from MongoDB');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting projects:', error);
    if (client) {
      await client.close();
    }
    process.exit(1);
  }
}

deleteAllProjects();
