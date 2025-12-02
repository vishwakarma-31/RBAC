import { createClient } from '@/lib/supabase/server'
import type { Permission } from '@/types/rbac'

export async function getPermissionsData() {
  const supabase = await createClient()

  const { data: permissions, error } = await supabase
    .from('permissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Error fetching permissions: ${error.message}`)
  }

  return {
    permissions: permissions || []
  }
}