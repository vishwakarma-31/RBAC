# Manual Fix Instructions for Database Schema Error

Since the automated scripts are having issues with environment variables, here's a simple manual approach to fix the "Could not find the table 'public.permissions' in the schema cache" error.

## Step-by-Step Manual Fix

### Step 1: Run SQL Commands Directly in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each of the following SQL commands one by one:

#### Command 1: Create permissions table
```sql
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Command 2: Create roles table
```sql
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Command 3: Create role_permissions table
```sql
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

#### Command 4: Create user_roles table
```sql
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
```

#### Command 5: Enable Row Level Security
```sql
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

#### Command 6: Refresh PostgREST Schema Cache (CRITICAL)
```sql
NOTIFY pgrst, 'reload config';
```

### Step 2: Restart Your Development Server

After running all the above commands:

1. Stop your Next.js development server (Ctrl+C)
2. Start it again with:
   ```
   npm run dev
   ```

### Why This Fixes the Issue

The error occurs because:

1. **Missing Tables**: The required tables (`permissions`, `roles`, `role_permissions`, `user_roles`) don't exist in your database
2. **Stale Schema Cache**: Even if the tables existed, PostgREST maintains a schema cache that needs to be refreshed to recognize new tables

The `NOTIFY pgrst, 'reload config';` command is the most critical - it forces PostgREST to refresh its schema cache and recognize the newly created tables.

### Verification

After completing these steps, the error should be resolved. If you still encounter issues:

1. Double-check that all commands executed successfully
2. Ensure the final `NOTIFY pgrst, 'reload config';` command was run
3. Restart your development server again

This manual approach bypasses any environment variable or script issues and directly addresses the root cause of the problem.