import { createClient } from '@/lib/supabase/server'
import type { Role, Permission, RolePermission } from '@/types/rbac'

export async function getRolesData() {
  const supabase = await createClient()

  try {
    // Fetch roles with their permissions in a single query
    const rolesQuery = supabase
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
      
    const { data: roles, error: rolesError } = await rolesQuery

    if (rolesError) {
      // Handle the case where the table doesn't exist yet
      if (rolesError.message.includes('not found in the schema cache') || rolesError.message.includes('does not exist')) {
        console.warn('Roles table not found. Returning empty arrays.')
        return {
          roles: [],
          permissions: []
        }
      }
      throw new Error(`Error fetching roles: ${rolesError.message}`)
    }

    // Also fetch all permissions separately for the assignment interface
    const permissionsQuery = supabase
      .from('permissions')
      .select('*')
      
    const { data: allPermissions, error: permissionsError } = await permissionsQuery

    if (permissionsError) {
      // Handle the case where the permissions table doesn't exist yet
      if (permissionsError.message.includes('not found in the schema cache') || permissionsError.message.includes('does not exist')) {
        console.warn('Permissions table not found. Returning empty permissions array.')
        return {
          roles: roles || [],
          permissions: []
        }
      }
      throw new Error(`Error fetching permissions: ${permissionsError.message}`)
    }

    // Sort roles manually since we can't use order() in the query
    const sortedRoles = roles ? [...roles].sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime()
      const dateB = new Date(b.created_at || '').getTime()
      return dateB - dateA // Descending order (newest first)
    }) : []

    // Sort permissions manually since we can't use order() in the query
    const sortedPermissions = allPermissions ? [...allPermissions].sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '') // Alphabetical order
    }) : []

    return {
      roles: sortedRoles,
      permissions: sortedPermissions
    }
  } catch (error) {
    // Handle network errors or other issues
    console.error('Error fetching roles data:', error)
    return {
      roles: [],
      permissions: []
    }
  }
}