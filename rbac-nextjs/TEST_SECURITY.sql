-- TEST_SECURITY.sql
-- This script helps verify that the security enhancements are working correctly

-- First, let's check if the is_admin function exists
SELECT proname FROM pg_proc WHERE proname = 'is_admin';

-- Test the is_admin function (this will return false if you're not logged in as an admin)
SELECT public.is_admin();

-- Check current user (will show your user ID if logged in)
SELECT auth.uid();

-- Check current user role
SELECT auth.role();

-- View existing policies on permissions table
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'permissions'::regclass;

-- View existing policies on roles table
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'roles'::regclass;

-- View existing policies on role_permissions table
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'role_permissions'::regclass;

-- View existing policies on user_roles table
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'user_roles'::regclass;

-- Check if RLS is enabled on all tables
SELECT tablename, relrowsecurity 
FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' 
AND tablename IN ('permissions', 'roles', 'role_permissions', 'user_roles');