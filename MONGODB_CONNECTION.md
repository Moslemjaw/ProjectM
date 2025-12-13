# MongoDB Connection String Configuration

## Your Connection String

```
mongodb+srv://musallamjaw:Musallamjaw123@cluster0.oh4suml.mongodb.net/projectM
```

## Connection String Breakdown

- **Protocol:** `mongodb+srv://` (MongoDB Atlas connection)
- **Username:** `musallamjaw`
- **Password:** `Musallamjaw123`
- **Cluster:** `cluster0.oh4suml.mongodb.net`
- **Database:** `projectM`

## ✅ Configuration Status

### In Render (Backend)

Make sure this environment variable is set in your Render dashboard:

**Environment Variable:**

```
MONGODB_URI=mongodb+srv://musallamjaw:Musallamjaw123@cluster0.oh4suml.mongodb.net/projectM
```

**Steps to verify:**

1. Go to Render Dashboard → Your Service → Environment
2. Check if `MONGODB_URI` is set with the above value
3. If not set, add it and redeploy

### How It's Used

The connection string is read by your app in `server/db.ts`:

```typescript
const MONGODB_URI = process.env.MONGODB_URI!;
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
});
```

## 🔒 Security Note

⚠️ **Important:** You've shared your MongoDB credentials publicly. Consider:

1. **Change your MongoDB password** in MongoDB Atlas:

   - Go to MongoDB Atlas → Database Access
   - Edit the user `musallamjaw`
   - Generate a new password
   - Update `MONGODB_URI` in Render with the new password

2. **Check MongoDB Atlas Network Access:**
   - Go to MongoDB Atlas → Network Access
   - Ensure `0.0.0.0/0` is allowed (or add Render's IP ranges)
   - This allows Render to connect to your database

## ✅ Verification

To verify the connection is working:

1. **Check Render Logs:**

   - Look for: `✅ Connected to MongoDB`
   - If you see: `❌ MongoDB connection failed` → Check Network Access settings

2. **Test the connection:**
   - The app will automatically connect on startup
   - Check Render logs after deployment

## Database Collections

Your database `projectM` should contain these collections:

- `users` - User accounts
- `projects` - Research projects
- `grades` - Reviewer grades
- `reviewerassignments` - Reviewer assignments
- `notifications` - User notifications
- `activitylogs` - Activity logs
- `fileuploads` - Uploaded files

## Summary

✅ **Connection String Format:** Correct  
✅ **Database Name:** `projectM`  
⚠️ **Action Needed:** Verify it's set in Render environment variables  
🔒 **Security:** Consider changing password after sharing it publicly
