'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Save, X, Link as LinkIcon } from 'lucide-react'
import type { Role, Permission } from '@/types/rbac'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface RoleWithPermissions extends Role {
  role_permissions: {
    permission_id: string
    permissions: {
      id: string
      name: string
      description: string | null
    }
  }[]
}

export function RolesClient({ 
  initialRoles, 
  initialPermissions 
}: { 
  initialRoles: RoleWithPermissions[]
  initialPermissions: Permission[]
}) {
  const [roles, setRoles] = useState<RoleWithPermissions[]>(initialRoles)
  const [permissions] = useState<Permission[]>(initialPermissions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState({ name: '' })
  const [showForm, setShowForm] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })
  const supabase = createClient()

  const refreshData = async () => {
    // In a real implementation, this would fetch fresh data from the server
    // For now, we'll just reset the form states
    setEditingId(null)
    setSelectedRole(null)
  }

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) return

    try {
      const { error } = await supabase
        .from('roles')
        .insert([newRole])

      if (error) throw error

      toast.success('Role created successfully')
      setNewRole({ name: '' })
      setShowForm(false)
      
      // Refresh the page to get updated data
      window.location.reload()
    } catch (error) {
      toast.error('Error creating role: ' + (error as Error).message)
    }
  }

  const handleUpdateRole = async (id: string, updates: Partial<Role>) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Role updated successfully')
      setEditingId(null)
      refreshData()
    } catch (error) {
      toast.error('Error updating role: ' + (error as Error).message)
    }
  }

  const handleDeleteRole = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Role',
      description: 'Are you sure you want to delete this role? This will also remove all permission assignments.',
      onConfirm: async () => {
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

          toast.success('Role deleted successfully')
          refreshData()
          
          // Refresh the page to get updated data
          window.location.reload()
        } catch (error) {
          toast.error('Error deleting role: ' + (error as Error).message)
        }
      }
    })
  }

  const handleAssignPermission = async (roleId: string, permissionId: string) => {
    try {
      const { error } = await supabase
        .from('role_permissions')
        .insert([{ role_id: roleId, permission_id: permissionId }])

      if (error) throw error

      toast.success('Permission assigned successfully')
      
      // Refresh the page to get updated data
      window.location.reload()
    } catch (error) {
      toast.error('Error assigning permission: ' + (error as Error).message)
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

      toast.success('Permission removed successfully')
      
      // Refresh the page to get updated data
      window.location.reload()
    } catch (error) {
      toast.error('Error removing permission: ' + (error as Error).message)
    }
  }

  const getRolePermissions = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    return role?.role_permissions || []
  }

  const getPermissionById = (permissionId: string) => {
    return permissions.find(p => p.id === permissionId)
  }

  return (
    <div>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />
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
                        const permission = rp.permissions
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