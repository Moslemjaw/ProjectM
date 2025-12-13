# MongoDB Connection String Configuration

## ⚠️ IMPORTANT: Keep Connection String Private

**The MongoDB connection string contains sensitive credentials and should NEVER be:**

- ❌ Committed to Git
- ❌ Hardcoded in source code
- ❌ Shared publicly
- ✅ **ONLY stored in environment variables**

## Your NEW Connection String

```
mongodb+srv://musallamjaw:Musallamjaw123@cluster0.aut2oyc.mongodb.net/projectM
```

### Connection String Breakdown:

- **Protocol:** `mongodb+srv://` (MongoDB Atlas connection)
- **Username:** `musallamjaw`
- **Password:** `Musallamjaw123`
- **Cluster:** `cluster0.aut2oyc.mongodb.net` ⬅️ **NEW CLUSTER**
- **Database:** `projectM`

## ✅ Configuration Checklist

### 1. Set in Render Environment Variables (REQUIRED)

**In Render Dashboard:**

1. Go to your service → **Environment** tab
2. Add/Update environment variable:
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://musallamjaw:Musallamjaw123@cluster0.aut2oyc.mongodb.net/projectM`
3. **Save** and **Redeploy**

**⚠️ CRITICAL:** This is the ONLY place the connection string should be stored!

### 2. Verify MongoDB Atlas Network Access

**In MongoDB Atlas:**

1. Go to **Network Access** → **IP Access List**
2. Add IP Address:
   - **Option 1:** `0.0.0.0/0` (Allow all IPs - for Render)
   - **Option 2:** Add Render's specific IPs (if known)
3. **Confirm** the change

### 3. Verify Database User Permissions

**In MongoDB Atlas:**

1. Go to **Database Access** → **Database Users**
2. Verify user `musallamjaw` has:
   - **Atlas Admin** role, OR
   - **Read and write to any database** permissions

### 4. Test Connection

After setting the environment variable in Render, check the logs:

**Expected Success Message:**

```
✅ Connected to MongoDB
```

**If Connection Fails:**

```
❌ MongoDB connection failed: [error message]
⚠️  Please check your MongoDB connection settings
```

## Database Name: `projectM`

**Important:** The database name in your connection string is `projectM` (capital M).

MongoDB is case-sensitive, so make sure:

- Connection string uses: `projectM`
- Collections will be created in the `projectM` database

## Verify Connection in Render

### Check Render Logs:

1. Go to Render Dashboard → Your Service → **Logs**
2. Look for: `✅ Connected to MongoDB`
3. If you see connection errors, check:
   - Environment variable is set correctly
   - Network Access allows Render's IPs
   - Username/password are correct

### Test via API Endpoint:

After deployment, test the database connection:

```
GET https://project-management-system-4phy.onrender.com/api/debug/db-status
```

**Expected Response:**

```json
{
  "mongodbConnected": true,
  "mongodbUri": "Set (hidden for security)",
  "userCount": 5,
  "projectCount": 0,
  ...
}
```

## Security Best Practices

✅ **DO:**

- Store connection string ONLY in environment variables
- Use Render's secure environment variable storage
- Keep connection string private and secure
- Rotate passwords periodically

❌ **DON'T:**

- Commit connection strings to Git
- Hardcode connection strings in source code
- Share connection strings publicly
- Include connection strings in documentation that gets committed

## Code Verification

The connection string is **NOT hardcoded** in the codebase. It's only read from environment variables:

```typescript
// server/db.ts
const MONGODB_URI = process.env.MONGODB_URI!; // ✅ Only from environment
```

This ensures the connection string remains private and secure.

## Common Issues

### Issue: "MongoDB connection failed"

**Solutions:**

1. ✅ Verify `MONGODB_URI` is set in Render with the NEW cluster URL
2. ✅ Check MongoDB Atlas Network Access (allow `0.0.0.0/0`)
3. ✅ Verify username/password are correct
4. ✅ Ensure database user has proper permissions

### Issue: "Authentication failed"

**Solutions:**

1. ✅ Check username/password in connection string
2. ✅ Verify user exists in MongoDB Atlas
3. ✅ Check user has database access permissions

### Issue: "Network timeout"

**Solutions:**

1. ✅ Add `0.0.0.0/0` to Network Access (allows all IPs)
2. ✅ Check MongoDB Atlas cluster is running
3. ✅ Verify cluster URL is correct: `cluster0.aut2oyc.mongodb.net`

## Migration from Old Cluster

If you were using the old cluster (`cluster0.oh4suml.mongodb.net`):

1. ✅ **Update Render environment variable** to new cluster URL
2. ✅ **Update MongoDB Atlas Network Access** (if needed)
3. ✅ **Redeploy** Render service
4. ✅ **Verify connection** in logs

## Summary

✅ **Connection String:** `mongodb+srv://musallamjaw:Musallamjaw123@cluster0.aut2oyc.mongodb.net/projectM`  
✅ **Database Name:** `projectM`  
✅ **Storage:** Environment variables ONLY (not hardcoded)  
✅ **Security:** Connection string is private and secure  
✅ **Next Step:** Set `MONGODB_URI` in Render environment variables with NEW cluster URL  
✅ **Verify:** Check Render logs for "✅ Connected to MongoDB"
