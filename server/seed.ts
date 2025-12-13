/**
 * Database Seeding Script
 * Run this to populate your production database with initial data
 * Usage: npm run seed
 */

import { storage } from "./storage";
import { connectDB } from "./db";
import { hashPassword, generateUserId } from "./auth";
import { USER_ROLES } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Connect to MongoDB
    const connected = await connectDB();
    if (!connected) {
      console.error("❌ Failed to connect to MongoDB");
      console.error("⚠️  Please check your MongoDB connection settings");
      process.exit(1);
    }

    // Create Editor user
    console.log("👤 Creating Editor account...");
    const editorPassword = await hashPassword("editor123");
    const editorId = generateUserId();

    const editor = await storage.createUser({
      id: editorId,
      email: "editor@aasu.edu.kw",
      password: editorPassword,
      firstName: "System",
      lastName: "Editor",
      role: USER_ROLES.EDITOR,
      department: "Administration",
    });
    console.log(`✅ Created Editor: ${editor.email}`);

    // Create Reviewer users
    console.log("\n👥 Creating Reviewer accounts...");
    const reviewers = [];

    for (let i = 1; i <= 3; i++) {
      const reviewerPassword = await hashPassword("reviewer123");
      const reviewerId = generateUserId();

      const reviewer = await storage.createUser({
        id: reviewerId,
        email: `reviewer${i}@aasu.edu.kw`,
        password: reviewerPassword,
        firstName: `Reviewer`,
        lastName: `${i}`,
        role: USER_ROLES.REVIEWER,
        department:
          i === 1 ? "Computer Science" : i === 2 ? "Engineering" : "Business",
        specialty:
          i === 1
            ? "AI & Machine Learning"
            : i === 2
            ? "Software Engineering"
            : "Information Systems",
      });

      reviewers.push(reviewer);
      console.log(`✅ Created Reviewer: ${reviewer.email}`);
    }

    // Create Faculty users
    console.log("\n👨‍🏫 Creating Faculty accounts...");
    const faculty = [];

    for (let i = 1; i <= 3; i++) {
      const facultyPassword = await hashPassword("faculty123");
      const facultyId = generateUserId();

      const facultyMember = await storage.createUser({
        id: facultyId,
        email: `faculty${i}@aasu.edu.kw`,
        password: facultyPassword,
        firstName: `Faculty`,
        lastName: `Member ${i}`,
        role: USER_ROLES.FACULTY,
        academicLevel:
          i === 1
            ? "Professor"
            : i === 2
            ? "Associate Professor"
            : "Assistant Professor",
        college:
          i === 1
            ? "College of Computing"
            : i === 2
            ? "College of Engineering"
            : "College of Business",
        department:
          i === 1
            ? "Computer Science"
            : i === 2
            ? "Civil Engineering"
            : "Management",
        specialty:
          i === 1
            ? "Artificial Intelligence"
            : i === 2
            ? "Structural Engineering"
            : "Strategic Management",
      });

      faculty.push(facultyMember);
      console.log(`✅ Created Faculty: ${facultyMember.email}`);
    }

    console.log("\n📊 Database seeding completed successfully!");
    console.log("\n📝 Created Accounts:");
    console.log("   Editor: editor@aasu.edu.kw / editor123");
    console.log("   Reviewers: reviewer1-3@aasu.edu.kw / reviewer123");
    console.log("   Faculty: faculty1-3@aasu.edu.kw / faculty123");
    console.log(
      "\n💡 Log in with any of these accounts to start using the system!"
    );

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
