'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
import type { Permission } from '@/types/rbac'
import { useToast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { motion, AnimatePresence } from 'framer-motion'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Add this effect to synchronize state with props
  useEffect(() => {
    setPermissions(initialPermissions)
  }, [initialPermissions])

  const refreshData = async () => {
    // In a real implementation, this would fetch fresh data from the server
    // For now, we'll just reset the form states
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!newPermission.name.trim()) return

    try {
      setLoadingStates(prev => ({ ...prev, create: true }))
      const { error } = await supabase
        .from('permissions')
        .insert([newPermission])

      if (error) throw error

      toast({
        title: "Success",
        description: "Permission created successfully",
      })
      setNewPermission({ name: '', description: '' })
      setShowForm(false)
      
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Error creating permission: " + (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }))
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Permission>) => {
    try {
      setLoadingStates(prev => ({ ...prev, [id]: true }))
      const { error } = await supabase
        .from('permissions')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Permission updated successfully",
      })
      setEditingId(null)
      refreshData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Error updating permission: " + (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoadingStates(prev => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      })
    }
  }

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Permission',
      description: 'Are you sure you want to delete this permission?',
      onConfirm: async () => {
        try {
          setLoadingStates(prev => ({ ...prev, [`delete-${id}`]: true }))
          const { error } = await supabase
            .from('permissions')
            .delete()
            .eq('id', id)

          if (error) throw error

          toast({
            title: "Success",
            description: "Permission deleted successfully",
          })
          refreshData()
          
          // Refresh the page to get updated data
          router.refresh()
        } catch (error) {
          toast({
            title: "Error",
            description: "Error deleting permission: " + (error as Error).message,
            variant: "destructive",
          })
        } finally {
          setLoadingStates(prev => {
            const newState = { ...prev }
            delete newState[`delete-${id}`]
            return newState
          })
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
      <motion.div 
        className="flex justify-between items-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Permissions</h1>
          <p className="text-muted-foreground mt-2">
            Manage system permissions and access controls
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Permission
          </Button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
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
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Permission Name
                    </label>
                    <Input
                      value={newPermission.name}
                      onChange={(e) => setNewPermission(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., can_edit_articles"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <Input
                      value={newPermission.description}
                      onChange={(e) => setNewPermission(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the permission"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={handleCreate} disabled={loadingStates.create}>
                        <Save className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" onClick={() => setShowForm(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        <motion.div 
          className="grid gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {permissions.map((permission, index) => (
            <motion.div
              key={permission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              layout
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  {editingId === permission.id ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
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
                        <label className="block text-sm font-medium text-foreground mb-1">
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
                          <Button onClick={() => handleUpdate(permission.id, permission)} disabled={!!loadingStates[permission.id]}>
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
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="flex justify-between items-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold">{permission.name}</h3>
                          <Badge variant="secondary">Permission</Badge>
                        </div>
                        {permission.description && (
                          <p className="text-muted-foreground">{permission.description}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
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
                            disabled={!!loadingStates[`delete-${permission.id}`]}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {permissions.length === 0 && !showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No permissions found. Create your first permission to get started.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}