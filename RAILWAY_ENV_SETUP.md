# Railway Deployment Setup

## Required Environment Variables

Add the following environment variables to your Railway project:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://bgnuyghvjkqgwwvghqzo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbnV5Z2h2amtxZ3d3dmdocXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxNDg5NDAsImV4cCI6MjA2OTcyNDk0MH0.hLBPh0CUK1vVyHOvw2Ns6XpoP7YIz-8pYJga0VucJjE
```

### Service Role Key (Optional - only if needed for admin operations)
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnbnV5Z2h2amtxZ3d3dmdocXpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE0ODk0MCwiZXhwIjoyMDY5NzI0OTQwfQ.9-syW-5L08gswTk5gr4od8ft4BUeXrd8bo6GMpNrKbQ
```

### Application URL
```
NEXT_PUBLIC_APP_URL=https://your-app-name.up.railway.app
```
Replace `your-app-name` with your actual Railway app URL.

## How to Add Environment Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service (web app)
3. Navigate to the "Variables" tab
4. Click "Add Variable" or "RAW Editor"
5. Add each variable with its key and value
6. Railway will automatically redeploy your app with the new variables

## Important Notes

1. **Build-time vs Runtime Variables**: 
   - Variables starting with `NEXT_PUBLIC_` are exposed to the browser
   - Other variables are server-side only
   - Railway injects these variables during the build process

2. **Security**: 
   - Never commit these values to your repository
   - The service role key should only be used server-side

3. **Verification**:
   - After deployment, check your Railway logs to ensure the app starts correctly
   - Test the connection request approval/rejection endpoints

## Build Configuration

The project includes the following Railway configuration files:

1. **railway.json** - Railway-specific build configuration
2. **nixpacks.toml** - Explicit build steps for Nixpacks
3. **Procfile** - Start command for the deployed app
4. **.nvmrc** - Node.js version specification (v20)

## Troubleshooting

### "Error creating build plan with Railpack"
This error occurs when Railway can't determine how to build your app. The included configuration files should resolve this.

### "Missing Supabase environment variables"
1. Ensure all variables are correctly added in Railway
2. Trigger a new deployment after adding variables
3. Check that variable names match exactly (case-sensitive)
4. Verify the Railway build logs show the variables are being used

### Build failures
1. Check that only `bun.lock` exists (no `package-lock.json` or `yarn.lock`)
2. Ensure the Railway service has enough resources allocated
3. Check the build logs for specific error messages

## Additional Configuration

If you need to use different Node.js version (to fix the deprecation warning):

In your Railway service settings, you can set:
```
NIXPACKS_NODE_VERSION=20
```

Or create a `.nvmrc` file in your project root:
```
20
```