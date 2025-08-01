'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import type { Permission } from '@/types/rbac'

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPermission, setNewPermission] = useState({ name: '', description: '' })
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error('Error fetching permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newPermission.name.trim()) return

    try {
      const { error } = await supabase
        .from('permissions')
        .insert([newPermission])

      if (error) throw error

      setNewPermission({ name: '', description: '' })
      setShowForm(false)
      fetchPermissions()
    } catch (error) {
      console.error('Error creating permission:', error)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Permission>) => {
    try {
      const { error } = await supabase
        .from('permissions')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      setEditingId(null)
      fetchPermissions()
    } catch (error) {
      console.error('Error updating permission:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) return

    try {
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', id)

      if (error) throw error

      fetchPermissions()
    } catch (error) {
      console.error('Error deleting permission:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Permissions</h1>
          <p className="text-gray-600 mt-2">
            Manage system permissions and access controls
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Permission
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Permission</CardTitle>
            <CardDescription>
              Add a new permission to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permission Name
                </label>
                <Input
                  value={newPermission.name}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., can_edit_articles"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={newPermission.description}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the permission"
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleCreate}>
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

      <div className="grid gap-4">
        {permissions.map((permission) => (
          <Card key={permission.id}>
            <CardContent className="p-6">
              {editingId === permission.id ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Permission Name
                    </label>
                    <Input
                      value={permission.name}
                      onChange={(e) => {
                        const updated = { ...permission, name: e.target.value }
                        setPermissions(prev => prev.map(p => p.id === permission.id ? updated : p))
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Input
                      value={permission.description || ''}
                      onChange={(e) => {
                        const updated = { ...permission, description: e.target.value }
                        setPermissions(prev => prev.map(p => p.id === permission.id ? updated : p))
                      }}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => handleUpdate(permission.id, permission)}>
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
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold">{permission.name}</h3>
                      <Badge variant="secondary">Permission</Badge>
                    </div>
                    {permission.description && (
                      <p className="text-gray-600">{permission.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Created: {new Date(permission.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(permission.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(permission.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {permissions.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No permissions found. Create your first permission to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 