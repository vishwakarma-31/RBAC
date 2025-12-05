-- SETUP: Create Admin role and assign to a user

-- Step 1: Create the Admin role (if it doesn't exist)
INSERT INTO roles (name, description)
VALUES ('Admin', 'Administrator with full access to RBAC system')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Assign Admin role to a specific user
-- Replace 'USER_ID_HERE' with the actual user ID from your Supabase Auth
-- You can find this in your Supabase Dashboard > Authentication > Users

/*
INSERT INTO user_roles (user_id, role_id)
SELECT 
  'USER_ID_HERE' as user_id,  -- Replace with actual user ID
  id as role_id
FROM roles 
WHERE name = 'Admin'
ON CONFLICT DO NOTHING;
*/

-- Alternative: If you want to make the currently authenticated user an admin
-- (This would be run in the context of an authenticated user)
/*
INSERT INTO user_roles (user_id, role_id)
SELECT 
  auth.uid() as user_id,
  r.id as role_id
FROM roles r
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;
*/