# Troubleshooting Guide

## 404 Error on Login/API Calls

If you're getting a 404 error when trying to login or make API calls, it means the frontend is not correctly pointing to your backend.

### Solution: Set VITE_API_URL in Vercel

1. Go to your Vercel project: https://project-management-system-pi-two.vercel.app
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://project-management-system-4phy.onrender.com`
   - **Environment:** Production, Preview, Development (select all)
4. **Important:** After adding the variable, you MUST redeploy:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on the latest deployment
   - Click **Redeploy**

### Verify Backend is Running

Test your backend health endpoint:

```
https://project-management-system-4phy.onrender.com/api/health
```

You should see:

```json
{
  "status": "ok",
  "timestamp": "...",
  "environment": "production"
}
```

### Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Network** tab
3. Try to login
4. Look for the API request - it should be going to:
   - ✅ `https://project-management-system-4phy.onrender.com/api/login`
   - ❌ NOT `https://project-management-system-pi-two.vercel.app/api/login`

### Common Issues

#### Issue: Still getting 404 after setting VITE_API_URL

**Solution:** Make sure you redeployed Vercel after adding the environment variable. Environment variables are only available after a new deployment.

#### Issue: CORS errors

**Solution:** Verify that `FRONTEND_URL` in Render is set to:

```
https://project-management-system-pi-two.vercel.app
```

#### Issue: Backend returns 404

**Solution:**

1. Check that your Render service is running (not sleeping)
2. Verify the backend URL is correct: `https://project-management-system-4phy.onrender.com`
3. Test the health endpoint first

### Testing Steps

1. **Test Backend Health:**

   ```bash
   curl https://project-management-system-4phy.onrender.com/api/health
   ```

2. **Test Login Endpoint (from browser console):**

   ```javascript
   fetch("https://project-management-system-4phy.onrender.com/api/login", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     credentials: "include",
     body: JSON.stringify({ email: "test@example.com", password: "test" }),
   });
   ```

3. **Check Frontend API Config:**
   Open browser console and type:
   ```javascript
   // This should show your backend URL in production
   console.log(import.meta.env.VITE_API_URL);
   ```

## Backend Build Issues

### Issue: "vite: not found" or "Cannot find module"

**Solution:** All build dependencies are now in `dependencies` section. Make sure you've pushed the latest `package.json` changes.

### Issue: Build succeeds but app doesn't start

**Solution:** Check Render logs for runtime errors. Common issues:

- Missing environment variables
- MongoDB connection issues
- Port configuration

## Database Connection Issues

### Issue: MongoDB connection fails

**Solution:**

1. Verify `MONGODB_URI` is set correctly in Render
2. Check MongoDB Atlas Network Access - allow `0.0.0.0/0` or Render's IPs
3. Verify MongoDB credentials are correct

## Session/Cookie Issues

### Issue: Login works but user gets logged out immediately

**Solution:**

1. Verify `SESSION_SECRET` is set in Render
2. Check that cookies are being set (browser DevTools → Application → Cookies)
3. Ensure CORS `credentials: true` is configured (already done)
