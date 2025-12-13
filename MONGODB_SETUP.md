# MongoDB Setup Guide

## Current Setup

Your project **already has a MongoDB driver installed and configured**:

### ✅ Mongoose (ODM/Driver)

- **Package:** `mongoose@^8.19.4`
- **Status:** ✅ Installed and configured
- **Location:** `server/db.ts`
- **Purpose:** This is the MongoDB driver/ODM that handles all database operations

### What Mongoose Does

- Connects to MongoDB Atlas (cloud database)
- Provides schema definitions for your data models
- Handles all CRUD operations (Create, Read, Update, Delete)
- Manages database connections automatically

## MongoDB Compass (Optional GUI Tool)

**MongoDB Compass** is a **desktop GUI application** that lets you:

- View your database visually
- Browse collections and documents
- Run queries
- Edit data manually
- Monitor database performance

### Do You Need Compass?

**No, Compass is NOT required** for your application to work. It's just a helpful tool for:

- **Development:** Viewing and debugging data
- **Administration:** Managing database manually
- **Learning:** Understanding your database structure

### If You Want to Use Compass

1. **Download:** https://www.mongodb.com/try/download/compass
2. **Connect using your connection string:**
   - Use the same `MONGODB_URI` from your `.env` file
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database`
3. **View your data:**
   - Browse collections: `users`, `projects`, `grades`, etc.
   - Query and edit documents
   - Monitor performance

## Current Database Connection

Your app connects to MongoDB using:

```typescript
// server/db.ts
import mongoose from "mongoose";

await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
});
```

### Connection String Format

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
```

## What's Already Working

✅ **Mongoose driver** - Installed and configured  
✅ **Database connection** - Handled automatically  
✅ **Schema definitions** - All models defined  
✅ **CRUD operations** - All database operations working

## Troubleshooting

### If Database Connection Fails

1. **Check MongoDB Atlas Network Access:**

   - Go to MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` to allow all IPs (or specific Render IPs)

2. **Verify Connection String:**

   - Check `MONGODB_URI` in Render environment variables
   - Ensure username/password are correct
   - Verify database name is correct

3. **Check Render Logs:**
   - Look for "✅ Connected to MongoDB" message
   - If you see "❌ MongoDB connection failed", check the error message

## Summary

- ✅ **Driver:** Mongoose is already installed (no action needed)
- ⚪ **Compass:** Optional GUI tool (only if you want visual database management)
- ✅ **Connection:** Configured via `MONGODB_URI` environment variable
- ✅ **Everything works:** Your app can connect and use MongoDB without Compass

You don't need to install anything else - Mongoose handles everything!
