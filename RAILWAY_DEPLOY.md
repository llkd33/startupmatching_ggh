Railway Deployment Guide

Prerequisites
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Railway variables
- Optionally set `NODE_ENV=production`

Build & Run
- Railway auto-detects Next.js. This repo includes a `Procfile` to bind the dynamic port:
  - `web: next start -p $PORT`
- Default build command: `npm run build`

Notes
- Ensure Supabase RLS and migrations are applied before deploying
- Admin routes are protected by middleware; verify session cookies propagate correctly on your domain
- For cold starts, first admin load may take a few seconds on free tier

