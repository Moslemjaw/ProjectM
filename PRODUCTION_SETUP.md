# Production Database Setup

## Problem

When you deploy your application, you'll notice there's no data. This is because **production and development databases are completely separate**.

## Solution: Seed the Production Database

### Option 1: Run the Seeding Script (Recommended)

1. **Open your terminal/command prompt**
2. **Run this command:**
   ```bash
   tsx server/seed.ts
   ```

This will create:

- ✅ 1 Editor account: `editor@aasu.edu.kw` / `editor123`
- ✅ 3 Reviewer accounts: `reviewer1-3@aasu.edu.kw` / `reviewer123`
- ✅ 3 Faculty accounts: `faculty1-3@aasu.edu.kw` / `faculty123`

### Option 2: Manual Setup

If you prefer to create accounts manually:

1. Visit your deployed application URL
2. **Register a Faculty account** (public registration creates Faculty role only)
3. **Use the terminal to manually create an Editor account:**

   ```bash
   tsx -e "
   import { storage } from './server/storage.ts';
   import { connectDB } from './server/db.ts';
   import { hashPassword, generateUserId } from './server/auth.ts';

   await connectDB();
   const password = await hashPassword('yourpassword');
   await storage.createUser({
     id: generateUserId(),
     email: 'youremail@aasu.edu.kw',
     password,
     firstName: 'Your',
     lastName: 'Name',
     role: 'editor',
     department: 'Administration'
   });
   console.log('Editor created!');
   "
   ```

4. **Log in as Editor** and create additional users through the Users management page

## After Seeding

1. Visit your deployed application URL
2. Log in with one of the seeded accounts
3. Start creating projects and assigning reviewers!

## Important Notes

- **Development data ≠ Production data**: Your test projects from development won't appear in production
- **Session persistence**: Production uses memory-based sessions, so you'll need to log in again after server restarts
- **MongoDB Atlas**: Make sure to whitelist your server's IP addresses in your MongoDB Atlas Network Access settings

## Troubleshooting

If the seed script fails with "MongoDB connection failed":

1. Check your MongoDB Atlas cluster is running
2. Verify `MONGODB_URI` environment variable is set in production
3. Whitelist your server IP addresses in MongoDB Atlas:
   - Go to Network Access in MongoDB Atlas
   - Click "Add IP Address"
   - Add `0.0.0.0/0` to allow all IPs (or add specific server IPs)
