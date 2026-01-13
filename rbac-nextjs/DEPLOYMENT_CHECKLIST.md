# Vercel Deployment Checklist

## Pre-deployment Checklist

- [ ] Database schema has been set up in production Supabase project
- [ ] `NOTIFY pgrst, 'reload config';` has been executed in production
- [ ] Environment variables are configured in Vercel dashboard
- [ ] Custom domains are configured (if applicable)
- [ ] SSL certificates are properly set up
- [ ] Health check endpoint is working (`/api/health`)

## Environment Variables Required

These environment variables must be set in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key
NEXT_PUBLIC_SITE_URL=https://yourdomain.com (replace with your actual domain)
```

## Repository Structure for Vercel

**Critical**: Make sure your repository structure matches what Vercel expects:

- If your Next.js project is in the root of your repository (recommended):
  ```
  your-repo/
  ├── package.json          ← Must be here
  ├── next.config.ts
  ├── src/
  └── ...
  ```

- If your Next.js project is in a subdirectory, you MUST set the "Root Directory" in Vercel:
  ```
  your-repo/
  ├── backend/
  ├── rbac-nextjs/          ← Your Next.js project
  │   ├── package.json      ← Contains the "next" dependency
  │   └── ...
  └── ...
  ```
  In this case, set "Root Directory" to `rbac-nextjs` in Vercel settings.

## Deployment Steps

### 1. Prepare the Repository
- [ ] Commit all changes
- [ ] Push to your GitHub/GitLab/Bitbucket repository
- [ ] Ensure the repository is accessible to Vercel

### 2. Deploy via Vercel Dashboard
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click "Add New Project"
- [ ] Select your repository
- [ ] **Important**: Check the "Build & Development Settings":
  - Framework Preset: Should auto-detect as "Next.js"
  - Root Directory: Set to "." (if project is in repo root) or the subdirectory name (if project is in subfolder)
- [ ] In the "Environment Variables" section, add:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SITE_URL` (optional, for sitemap generation)
- [ ] Click "Deploy"

### 3. Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Link project to Vercel
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production  # optional

# Deploy to production
vercel --prod
```

## Post-deployment Verification

- [ ] Site loads correctly at the assigned URL
- [ ] Login/registration flows work
- [ ] Database connections are working
- [ ] Health check endpoint responds (`/api/health`)
- [ ] Sitemap is accessible (`/sitemap.xml`)
- [ ] Robots.txt is accessible (`/robots.txt`)
- [ ] All dashboard functionality works
- [ ] RBAC policies are enforced properly

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify your Supabase project URL and keys are correct
   - Ensure the database schema is set up in your production Supabase project
   - Confirm that `NOTIFY pgrst, 'reload config';` was executed

2. **Build Failures - "No Next.js version detected"**
   - Verify that your package.json has "next" in either "dependencies" or "devDependencies"
   - Ensure your repository root directory contains the package.json file
   - In Vercel dashboard, check the "Build & Development Settings":
     - Framework Preset: Should be "Next.js" or "Auto"
     - Root Directory: Should point to the directory containing package.json (usually "." for root, or the subfolder name if your project is in a subdirectory)
   - If your project is in a subdirectory like `/rbac-nextjs/`, set Root Directory to `rbac-nextjs`
   - Make sure there's no conflicting configuration that prevents Next.js detection

3. **Build Failures - Environment Variable Validation Errors**
   - Some pages may attempt to validate environment variables during build time
   - Dashboard pages (`/dashboard/permissions`, `/dashboard/roles`) are now set to `dynamic = 'force-dynamic'` to prevent static generation issues
   - This ensures environment variables are only validated at runtime when they're available

4. **Environment Variables Not Working**
   - Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
   - Verify they are set in the correct environment (preview vs production)

5. **Authentication Issues**
   - Check that your Supabase authentication settings allow the domain
   - Verify redirect URLs are configured in your Supabase dashboard

## Performance Optimization

- [ ] Leverage Vercel's global edge network
- [ ] Use Supabase's global database replication if needed
- [ ] Implement proper caching strategies
- [ ] Monitor performance metrics in Vercel Analytics

## Security Best Practices

- [ ] Use HTTPS for all connections
- [ ] Regularly rotate Supabase keys
- [ ] Monitor for suspicious activity
- [ ] Keep dependencies updated
- [ ] Review RBAC policies regularly

## Monitoring & Maintenance

- [ ] Set up alerts for downtime
- [ ] Monitor database performance
- [ ] Regular security audits
- [ ] Backup strategies for critical data
- [ ] Plan for scaling as needed

## Rollback Plan

In case of critical issues after deployment:

1. Identify the problematic changes
2. Revert to the previous stable version in Vercel dashboard
3. Investigate and fix the issue locally
4. Redeploy the corrected version