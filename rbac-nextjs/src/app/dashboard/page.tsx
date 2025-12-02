import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Key, Link as LinkIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

async function getStats() {
  const supabase = await createClient()

  // Fetch permissions count
  const { count: permissionsCount } = await supabase
    .from('permissions')
    .select('*', { count: 'exact', head: true })

  // Fetch roles count
  const { count: rolesCount } = await supabase
    .from('roles')
    .select('*', { count: 'exact', head: true })

  // Fetch role permissions count
  const { count: rolePermissionsCount } = await supabase
    .from('role_permissions')
    .select('*', { count: 'exact', head: true })

  return {
    permissions: permissionsCount || 0,
    roles: rolesCount || 0,
    rolePermissions: rolePermissionsCount || 0,
  }
}

export default async function DashboardPage() {
  const stats = await getStats()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage your Role-Based Access Control system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.permissions}</div>
            <p className="text-xs text-muted-foreground">
              Individual permissions defined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roles}</div>
            <p className="text-xs text-muted-foreground">
              User roles created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Role-Permission Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rolePermissions}</div>
            <p className="text-xs text-muted-foreground">
              Permissions assigned to roles
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to manage your RBAC system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Create New Permission</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Add a new permission to your system
                </p>
                <a
                  href="/dashboard/permissions"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Go to Permissions →
                </a>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Create New Role</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Create a new role and assign permissions
                </p>
                <a
                  href="/dashboard/roles"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Go to Roles →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 