import mongoose from "mongoose";
import { UserModel, generateId } from "../server/db.js";
import { hashPassword } from "../server/auth.js";
import { USER_ROLES } from "../shared/schema.js";

async function createTestUsers() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI!;
    
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Enable buffering for this script
    mongoose.set('bufferCommands', true);
    
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Test user credentials
    const testUsers = [
      {
        email: "faculty@test.com",
        password: "password123",
        firstName: "John",
        lastName: "Faculty",
        academicLevel: "Professor",
        college: "College of Engineering",
        specialty: "Computer Science",
        role: USER_ROLES.FACULTY,
      },
      {
        email: "newuser@aasu.edu",
        password: "newpass123",
        firstName: "New",
        lastName: "Faculty",
        academicLevel: "Doctor",
        college: "Engineering",
        specialty: "Computer Science",
        role: USER_ROLES.FACULTY,
      },
      {
        email: "editor@test.com",
        password: "password123",
        firstName: "Sarah",
        lastName: "Editor",
        academicLevel: "Doctor",
        college: "College of Science",
        specialty: "Mathematics",
        role: USER_ROLES.EDITOR,
      },
      {
        email: "editor@aasu.edu",
        password: "editor123",
        firstName: "Editor",
        lastName: "User",
        academicLevel: "Professor",
        college: "Engineering",
        specialty: "Computer Science",
        role: USER_ROLES.EDITOR,
      },
      {
        email: "saraheditor@test.com",
        password: "password",
        firstName: "Sarah",
        lastName: "Editor",
        academicLevel: "Doctor",
        college: "Science",
        specialty: "Mathematics",
        role: USER_ROLES.EDITOR,
      },
      {
        email: "thirdeditor@test.com",
        password: "password123",
        firstName: "Third",
        lastName: "Editor",
        academicLevel: "Professor",
        college: "Engineering",
        specialty: "Physics",
        role: USER_ROLES.EDITOR,
      },
      {
        email: "admin@test.com",
        password: "password123",
        firstName: "Admin",
        lastName: "Lead",
        academicLevel: "Professor",
        college: "Administration",
        specialty: "Management",
        role: USER_ROLES.EDITOR,
      },
      {
        email: "admin@aasu.edu",
        password: "admin123",
        firstName: "Admin",
        lastName: "User",
        academicLevel: "Professor",
        college: "Administration",
        specialty: "Management",
        role: USER_ROLES.EDITOR,
      },
    ];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: userData.email });
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create user
      const user = new UserModel({
        id: generateId(),
        ...userData,
        password: hashedPassword,
      });
      
      await user.save();

      console.log(`✓ Created ${user.role} account: ${user.email}`);
    }
    
    await mongoose.disconnect();

    console.log("\n=== Test Accounts Created ===");
    console.log("Faculty Account:");
    console.log("  Email: faculty@test.com");
    console.log("  Password: password123");
    console.log("\nEditor/Admin Accounts:");
    console.log("  Email: editor@test.com");
    console.log("  Password: password123");
    console.log("  Email: admin@test.com");
    console.log("  Password: password123");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating test users:", error);
    process.exit(1);
  }
}

createTestUsers();
