'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Save, X, Link as LinkIcon } from 'lucide-react'
import type { Role, Permission } from '@/types/rbac'
import { useToast } from '@/components/ui/use-toast'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface RoleWithPermissions extends Role {
  role_permissions: {
    permission_id: string
    permissions: {
      id: string
      name: string
      description: string | null
      created_at: string
    }
  }[]
}

export function RolesClient({ 
  initialRoles,
  allPermissions 
}: { 
  initialRoles: RoleWithPermissions[]
  allPermissions: Permission[]
}) {
  const [roles, setRoles] = useState<RoleWithPermissions[]>(initialRoles)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState({ name: '' })
  const [showForm, setShowForm] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {}
  })
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [linkingStates, setLinkingStates] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  // Add this effect to synchronize state with props
  useEffect(() => {
    setRoles(initialRoles)
  }, [initialRoles])

  const refreshData = async () => {
    // In a real implementation, this would fetch fresh data from the server
    // For now, we'll just reset the form states
    setEditingId(null)
  }

  const handleCreate = async () => {
    if (!newRole.name.trim()) return

    try {
      setLoadingStates(prev => ({ ...prev, create: true }))
      const { error } = await supabase
        .from('roles')
        .insert([newRole])

      if (error) throw error

      toast({
        title: "Success",
        description: "Role created successfully",
      })
      setNewRole({ name: '' })
      setShowForm(false)
      
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Error creating role: " + (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setLoadingStates(prev => ({ ...prev, create: false }))
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Role>) => {
    try {
      setLoadingStates(prev => ({ ...prev, [id]: true }))
      const { error } = await supabase
        .from('roles')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Role updated successfully",
      })
      setEditingId(null)
      refreshData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Error updating role: " + (error as Error).message,
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
      title: 'Delete Role',
      description: 'Are you sure you want to delete this role? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setLoadingStates(prev => ({ ...prev, [`delete-${id}`]: true }))
          const { error } = await supabase
            .from('roles')
            .delete()
            .eq('id', id)

          if (error) throw error

          toast({
            title: "Success",
            description: "Role deleted successfully",
          })
          refreshData()
          
          // Refresh the page to get updated data
          router.refresh()
        } catch (error) {
          toast({
            title: "Error",
            description: "Error deleting role: " + (error as Error).message,
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

  const handleLinkPermission = async (roleId: string, permissionId: string) => {
    try {
      setLinkingStates(prev => ({ ...prev, [`${roleId}-${permissionId}`]: true }))
      
      // Check if the link already exists
      const { data: existingLinks, error: fetchError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)
        .limit(1)

      if (fetchError) throw fetchError

      let successMessage = ''
      if (existingLinks && existingLinks.length > 0) {
        // Unlink the permission
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
          .eq('permission_id', permissionId)

        if (error) throw error
        successMessage = 'Permission unlinked successfully'
      } else {
        // Link the permission
        const { error } = await supabase
          .from('role_permissions')
          .insert([{ role_id: roleId, permission_id: permissionId }])

        if (error) throw error
        successMessage = 'Permission linked successfully'
      }

      toast({
        title: "Success",
        description: successMessage,
      })
      
      // Refresh the page to get updated data
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Error linking/unlinking permission: " + (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setLinkingStates(prev => {
        const newState = { ...prev }
        delete newState[`${roleId}-${permissionId}`]
        return newState
      })
    }
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
          <h1 className="text-3xl font-bold text-foreground">Roles</h1>
          <p className="text-muted-foreground mt-2">
            Manage user roles and permission assignments
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Role
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
                <CardTitle>Create New Role</CardTitle>
                <CardDescription>
                  Add a new role to assign to users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Role Name
                    </label>
                    <Input
                      value={newRole.name}
                      onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., editor"
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
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              layout
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  {editingId === role.id ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
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
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={() => handleUpdate(role.id, role)} disabled={!!loadingStates[role.id]}>
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
                      className="space-y-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold">{role.name}</h3>
                            <Badge variant="secondary">Role</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(role.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingId(role.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(role.id)}
                              disabled={!!loadingStates[`delete-${role.id}`]}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </motion.div>
                        </div>
                      </div>

                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3 flex items-center">
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Linked Permissions
                        </h4>
                        {allPermissions && allPermissions.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {allPermissions.map((permission) => {
                              const isLinked = role.role_permissions.some(rp => rp.permission_id === permission.id)
                              return (
                                <motion.div
                                  key={`${role.id}-${permission.id}`}
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <Button
                                    variant={isLinked ? "default" : "outline"}
                                    size="sm"
                                    className="w-full justify-start"
                                    onClick={() => handleLinkPermission(role.id, permission.id)}
                                    disabled={!!linkingStates[`${role.id}-${permission.id}`]}
                                  >
                                    {linkingStates[`${role.id}-${permission.id}`] ? (
                                      <LoadingSpinner size="sm" className="mr-2" />
                                    ) : (
                                      <div className={`w-2 h-2 rounded-full mr-2 ${isLinked ? 'bg-primary-foreground' : 'bg-muted-foreground'}`} />
                                    )}
                                    <span className="truncate">{permission.name}</span>
                                  </Button>
                                </motion.div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            {allPermissions ? 'No permissions available. Create some permissions first.' : 'Loading permissions...'}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {roles.length === 0 && !showForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No roles found. Create your first role to get started.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}