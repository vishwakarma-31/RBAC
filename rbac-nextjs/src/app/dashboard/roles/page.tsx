'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Save, X, Link as LinkIcon } from 'lucide-react'
import type { Role, Permission, RolePermission } from '@/types/rbac'

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState({ name: '' })
  const [showForm, setShowForm] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false })

      if (rolesError) throw rolesError

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('name')

      if (permissionsError) throw permissionsError

      // Fetch role permissions
      const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
        .from('role_permissions')
        .select('*')

      if (rolePermissionsError) throw rolePermissionsError

      setRoles(rolesData || [])
      setPermissions(permissionsData || [])
      setRolePermissions(rolePermissionsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return

    try {
      const { error } = await supabase
        .from('roles')
        .insert([newRole])

      if (error) throw error

      setNewRole({ name: '' })
      setShowForm(false)
      fetchData()
    } catch (error) {
      console.error('Error creating role:', error)
    }
  }

  const handleUpdateRole = async (id: string, updates: Partial<Role>) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      fetchData()
    } catch (error) {
      console.error('Error updating role:', error)
    }
  }

  const handleDeleteRole = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role? This will also remove all permission assignments.')) return

    try {
      // Delete role permissions first
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', id)

      // Delete the role
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchData()
    } catch (error) {
      console.error('Error deleting role:', error)
    }
  }

  const handleAssignPermission = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{ role_id: roleId, permission_id: permissionId }])

      if (error) throw error

      fetchData()
    } catch (error) {
      console.error('Error assigning permission:', error)
    }
  }

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)

      if (error) throw error

      fetchData()
    } catch (error) {
      console.error('Error removing permission:', error)
    }
  }

  const getRolePermissions = (roleId: string) => {
    return rolePermissions.filter(rp => rp.role_id === roleId)
  }

  const getPermissionById = (permissionId: string) => {
    return permissions.find(p => p.id === permissionId)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles</h1>
          <p className="text-gray-600 mt-2">
            Manage user roles and assign permissions
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Role
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Role</CardTitle>
            <CardDescription>
              Add a new role to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role Name
                </label>
                <Input
                  value={newRole.name}
                  onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Administrator"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCreateRole}>
                  <Save className="h-4 w-4 mr-2" />
                  Create
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="p-6">
              {editingId === role.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name
                    </label>
                    <Input
                      value={role.name}
                      onChange={(e) => {
                        const updated = { ...role, name: e.target.value }
                        setRoles(prev => prev.map(r => r.id === role.id ? updated : r))
                      }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => handleUpdateRole(role.id, role)}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{role.name}</h3>
                        <Badge variant="secondary">Role</Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(role.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(role.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium">Assigned Permissions</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {selectedRole === role.id ? 'Hide' : 'Manage'} Permissions
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {getRolePermissions(role.id).map((rp) => {
                        const permission = getPermissionById(rp.permission_id)
                        return permission ? (
                          <Badge key={rp.permission_id} variant="outline">
                            {permission.name}
                            <button
                              onClick={() => handleRemovePermission(role.id, rp.permission_id)}
                              className="ml-2 text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </Badge>
                        ) : null
                      })}
                      {getRolePermissions(role.id).length === 0 && (
                        <p className="text-sm text-gray-500">No permissions assigned</p>
                      )}
                    </div>

                    {selectedRole === role.id && (
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <h5 className="font-medium mb-3">Available Permissions</h5>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {permissions.map((permission) => {
                            const isAssigned = getRolePermissions(role.id).some(
                              rp => rp.permission_id === permission.id
                            )
                            return (
                              <Button
                                key={permission.id}
                                variant={isAssigned ? "default" : "outline"}
                                size="sm"
                                disabled={isAssigned}
                                onClick={() => handleAssignPermission(role.id, permission.id)}
                                className="justify-start"
                              >
                                {permission.name}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No roles found. Create your first role to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 