import { RolesClient } from './client'
import { getRolesData } from './data'

export default async function RolesPage() {
  const { roles, permissions } = await getRolesData()

  return <RolesClient initialRoles={roles} initialPermissions={permissions} />
} 