# MongoDB Connection String Configuration

## Your Connection String

```
mongodb+srv://musallamjaw:Musallamjaw123@cluster0.aut2oyc.mongodb.net/projectM
```

### Connection String Breakdown:

- **Protocol:** `mongodb+srv://` (MongoDB Atlas connection)
- **Username:** `musallamjaw`
- **Password:** `Musallamjaw123`
- **Cluster:** `cluster0.aut2oyc.mongodb.net` (NEW)
- **Database:** `projectM`

## ✅ Configuration Checklist

### 1. Set in Render Environment Variables

**In Render Dashboard:**

1. Go to your service → **Environment** tab
2. Add/Update environment variable:
   - **Key:** `MONGODB_URI`
   - **Value:** `mongodb+srv://musallamjaw:Musallamjaw123@cluster0.aut2oyc.mongodb.net/projectM`
3. **Save** and **Redeploy**

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

## Common Issues

### Issue: "MongoDB connection failed"

**Solutions:**

1. ✅ Verify `MONGODB_URI` is set in Render
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
3. ✅ Verify cluster URL is correct

## Security Notes

⚠️ **Important:**

- Never commit the connection string to Git
- Always use environment variables
- The connection string contains your password - keep it secure
- Consider using MongoDB Atlas IP whitelist for better security (after testing)

## Summary

✅ **Connection String:** Provided and formatted correctly  
✅ **Database Name:** `projectM`  
✅ **Next Step:** Set `MONGODB_URI` in Render environment variables  
✅ **Verify:** Check Render logs for "✅ Connected to MongoDB"
