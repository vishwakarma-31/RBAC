import { createClient } from '@/lib/supabase/server'
import type { Role, Permission, RolePermission } from '@/types/rbac'

export async function getRolesData() {
  const supabase = await createClient()

  // Fetch roles with their permissions in a single query
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select(`
      *,
      role_permissions (
        permission_id,
        permissions (
          id,
          name,
          description
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (rolesError) {
    throw new Error(`Error fetching roles: ${rolesError.message}`)
  }

  // Also fetch all permissions separately for the assignment interface
  const { data: allPermissions, error: permissionsError } = await supabase
    .from('permissions')
    .select('*')
    .order('name')

  if (permissionsError) {
    throw new Error(`Error fetching permissions: ${permissionsError.message}`)
  }

  return {
    roles: roles || [],
    permissions: allPermissions || []
  }
}