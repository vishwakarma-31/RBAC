'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import type { Permission } from '@/types/rbac'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { motion, AnimatePresence } from 'framer-motion'

export function PermissionsClient({ 
  initialPermissions 
}: { 
  initialPermissions: Permission[]
}) {
  const [permissions, setPermissions] = useState<Permission[]>(initialPermissions)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPermission, setNewPermission] = useState({ name: '', description: '' })
  const [showForm, setShowForm] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })
  const router = useRouter()
  const supabase = createClient()

  const refreshData = async () => {
    // In a real implementation, this would fetch fresh data from the server
    // For now, we'll just reset the form states
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!newPermission.name.trim()) return

    try {
      const { error } = await supabase
        .from('permissions')
        .insert([newPermission])

      if (error) throw error

      toast.success('Permission created successfully')
      setNewPermission({ name: '', description: '' })
      setShowForm(false)
      
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      toast.error('Error creating permission: ' + (error as Error).message)
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Permission>) => {
    try {
      const { error } = await supabase
        .from('permissions')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Permission updated successfully')
      setEditingId(null)
      refreshData()
    } catch (error) {
      toast.error('Error updating permission: ' + (error as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Permission',
      description: 'Are you sure you want to delete this permission?',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('permissions')
            .delete()
            .eq('id', id)

          if (error) throw error

          toast.success('Permission deleted successfully')
          refreshData()
          
          // Refresh the page to get updated data
          router.refresh()
        } catch (error) {
          toast.error('Error deleting permission: ' + (error as Error).message)
        }
      }
    })
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

      <AnimatePresence>
        <motion.div 
          className="grid gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {permissions.map((permission, index) => (
            <motion.div
              key={permission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
            >
              <Card>
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
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={() => handleUpdate(permission.id, permission)}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </motion.div>
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
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingId(permission.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(permission.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

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