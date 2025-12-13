import { storage } from "./storage";
import { connectDB } from "./db";

async function seedUsers() {
  console.log('🌱 Seeding test users...');
  
  try {
    // Connect to MongoDB and wait for it to be ready
    const connected = await connectDB();
    
    if (!connected) {
      console.error('❌ Cannot seed users without database connection');
      console.error('   Please check MongoDB connection and try again');
      process.exit(1);
    }
    
    // Give MongoDB a moment to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create admin account
    const admin = await storage.upsertUser({
      id: 'admin-user-001',
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'editor',
    });
    console.log('✅ Created admin:', admin.email);

    // Create 1 editor (gatekeeper) account
    const editor = await storage.upsertUser({
      id: 'editor-user-001',
      email: 'editor@test.com',
      firstName: 'Editor',
      lastName: 'Gate',
      role: 'editor',
    });
    console.log('✅ Created editor (gatekeeper):', editor.email);

    // Create 3 reviewer (grader) accounts
    for (let i = 1; i <= 3; i++) {
      const reviewer = await storage.upsertUser({
        id: `reviewer-user-00${i}`,
        email: `reviewer${i}@test.com`,
        firstName: `Reviewer`,
        lastName: `${i}`,
        role: 'reviewer',
      });
      console.log(`✅ Created reviewer ${i}:`, reviewer.email);
    }

    // Create 1 faculty (project owner) account
    const faculty = await storage.upsertUser({
      id: 'faculty-user-001',
      email: 'faculty@test.com',
      firstName: 'Dr. John',
      lastName: 'Faculty',
      role: 'faculty',
    });
    console.log('✅ Created faculty:', faculty.email);

    console.log('\n📋 Test Account Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin/Editor:');
    console.log('  📧 admin@test.com');
    console.log('  🔑 password123');
    console.log('\nEditor (Gatekeeper):');
    console.log('  📧 editor@test.com');
    console.log('  🔑 password123');
    console.log('\nReviewers/Graders (x3):');
    console.log('  📧 reviewer1@test.com');
    console.log('  📧 reviewer2@test.com');
    console.log('  📧 reviewer3@test.com');
    console.log('  🔑 password123');
    console.log('\nFaculty (Project Owner):');
    console.log('  📧 faculty@test.com');
    console.log('  🔑 password123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✨ Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedUsers();
