# Deployment Guide

## Frontend (Vercel)

Your frontend is deployed at: **https://project-management-system-pi-two.vercel.app**

### Environment Variables in Vercel

Add this environment variable in your Vercel project settings:

```
VITE_API_URL=https://project-management-system-4phy.onrender.com
```

**Important:** After adding this variable, you need to **redeploy** your Vercel project for the changes to take effect.

## Backend (Render)

Your backend is deployed at: **https://project-management-system-4phy.onrender.com**

### CORS Setup

The backend is configured to accept requests from your Vercel frontend. The CORS configuration allows:

- `https://project-management-system-pi-two.vercel.app` (your Vercel frontend)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5000` (local development)

### Environment Variables for Backend

When deploying your backend on Render, make sure to set:

```
NODE_ENV=production
MONGODB_URI=your-mongodb-connection-string
SESSION_SECRET=your-session-secret
DEEPSEEK_API_KEY=your-deepseek-api-key
FRONTEND_URL=https://project-management-system-pi-two.vercel.app
```

**Note:** Render automatically sets `PORT`, so you don't need to set it manually.

### Build Command for Render

Use this build command in Render:

```
npm install && npm run build
```

This ensures dev dependencies (like `vite` and `esbuild`) are installed for the build process.

## How It Works

1. **Development**: Frontend uses relative URLs (`/api/...`) - works when frontend and backend are on the same origin
2. **Production**: Frontend uses `VITE_API_URL` environment variable to point to your backend API

## Current Deployment Status

✅ **Frontend:** https://project-management-system-pi-two.vercel.app  
✅ **Backend:** https://project-management-system-4phy.onrender.com

## Next Steps

1. ✅ Backend is deployed on Render
2. ⚠️ **Update `VITE_API_URL` in Vercel** to: `https://project-management-system-4phy.onrender.com`
3. ⚠️ **Redeploy your Vercel frontend** after adding the environment variable
4. ✅ Backend CORS is already configured to allow your frontend

## Testing

After updating Vercel environment variables and redeploying:

- **Frontend:** https://project-management-system-pi-two.vercel.app
- **Backend API:** https://project-management-system-4phy.onrender.com/api/...

### Test Endpoints:

- Auth endpoint: `https://project-management-system-4phy.onrender.com/api/auth/user`
- Login: `https://project-management-system-4phy.onrender.com/api/login`

Make sure CORS is properly configured and cookies/sessions work across domains.

## Troubleshooting

If you encounter CORS errors:

1. Verify `FRONTEND_URL` in Render environment variables matches your Vercel URL
2. Check that `VITE_API_URL` in Vercel matches your Render backend URL
3. Ensure both services are redeployed after environment variable changes
