import { createClient } from '@/lib/supabase/server'
import type { Permission } from '@/types/rbac'

export async function getPermissionsData() {
  const supabase = await createClient()

  try {
    const query = supabase
      .from('permissions')
      .select('*')
      
    // Only add order if there's no error in the query chain
    const { data: permissions, error } = await query

    if (error) {
      // Handle the case where the table doesn't exist yet
      if (error.message.includes('not found in the schema cache') || error.message.includes('does not exist')) {
        console.warn('Permissions table not found. Returning empty array.')
        return {
          permissions: []
        }
      }
      throw new Error(`Error fetching permissions: ${error.message}`)
    }

    // Sort the data manually since we can't use order() in the query
    const sortedPermissions = permissions ? [...permissions].sort((a, b) => {
      const dateA = new Date(a.created_at || '').getTime()
      const dateB = new Date(b.created_at || '').getTime()
      return dateB - dateA // Descending order (newest first)
    }) : []

    return {
      permissions: sortedPermissions
    }
  } catch (error) {
    // Handle network errors or other issues
    console.error('Error fetching permissions:', error)
    return {
      permissions: []
    }
  }
}