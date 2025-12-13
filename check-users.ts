// Script to check and fix test users
import { UserModel, connectDB } from './server/db';
import bcrypt from 'bcryptjs';

async function checkAndFixUsers() {
  try {
    const connected = await connectDB();
    if (!connected) {
      throw new Error('Failed to connect to MongoDB');
    }
    console.log('Connected to MongoDB');

    // Wait a bit for connection to be fully ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check existing users
    const users = await UserModel.find({
      email: { $in: ['faculty@test.com', 'editor@test.com', 'admin@test.com'] }
    });

    console.log('\nExisting test users:');
    users.forEach(user => {
      console.log(`- ${user.email}: role=${user.role}, id=${user.id}`);
    });

    // Fix faculty user if needed
    const facultyUser = users.find(u => u.email === 'faculty@test.com');
    if (facultyUser && facultyUser.role !== 'faculty') {
      console.log(`\nFixing faculty@test.com role from ${facultyUser.role} to faculty`);
      await UserModel.updateOne(
        { email: 'faculty@test.com' },
        { role: 'faculty' }
      );
      console.log('✅ Fixed faculty user role');
    } else if (facultyUser) {
      console.log('\n✅ Faculty user role is already correct');
    } else {
      console.log('\n❌ Faculty user not found');
    }

    // Check editor user
    const editorUser = users.find(u => u.email === 'editor@test.com');
    if (editorUser && editorUser.role !== 'editor') {
      console.log(`\nFixing editor@test.com role from ${editorUser.role} to editor`);
      await UserModel.updateOne(
        { email: 'editor@test.com' },
        { role: 'editor' }
      );
      console.log('✅ Fixed editor user role');
    } else if (editorUser) {
      console.log('\n✅ Editor user role is already correct');
    } else {
      console.log('\n❌ Editor user not found');
    }

    // Check admin user
    const adminUser = users.find(u => u.email === 'admin@test.com');
    if (adminUser && adminUser.role !== 'editor') {
      console.log(`\nFixing admin@test.com role from ${adminUser.role} to editor`);
      await UserModel.updateOne(
        { email: 'admin@test.com' },
        { role: 'editor' }
      );
      console.log('✅ Fixed admin user role');
    } else if (adminUser) {
      console.log('\n✅ Admin user role is already correct');
    } else {
      console.log('\n❌ Admin user not found');
    }

    // Verify fixes
    const updatedUsers = await UserModel.find({
      email: { $in: ['faculty@test.com', 'editor@test.com', 'admin@test.com'] }
    });

    console.log('\nUpdated test users:');
    updatedUsers.forEach(user => {
      console.log(`- ${user.email}: role=${user.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixUsers();
