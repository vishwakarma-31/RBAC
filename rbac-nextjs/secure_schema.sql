-- 1. Admin Check Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'Admin'
  ) INTO is_admin;
  RETURN COALESCE(is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Clean Slate - Drop existing insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON permissions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON permissions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON permissions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON permissions;

DROP POLICY IF EXISTS "Enable read access for all users" ON roles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON roles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON roles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON roles;

DROP POLICY IF EXISTS "Enable read access for all users" ON role_permissions;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON role_permissions;

DROP POLICY IF EXISTS "Enable read access for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON user_roles;

-- 3. Secure Policies
-- Permissions table
CREATE POLICY "Allow read access for authenticated users" ON permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access for admins only" ON permissions
FOR ALL TO authenticated USING (public.is_admin());

-- Roles table
CREATE POLICY "Allow read access for authenticated users" ON roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access for admins only" ON roles
FOR ALL TO authenticated USING (public.is_admin());

-- Role_permissions table
CREATE POLICY "Allow read access for authenticated users" ON role_permissions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access for admins only" ON role_permissions
FOR ALL TO authenticated USING (public.is_admin());

-- User_roles table
CREATE POLICY "Allow read access for authenticated users" ON user_roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write access for admins only" ON user_roles
FOR ALL TO authenticated USING (public.is_admin());

-- Ensure RLS is enabled on all tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;