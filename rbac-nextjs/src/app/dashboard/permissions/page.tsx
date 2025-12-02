import { PermissionsClient } from './client'
import { getPermissionsData } from './data'

export default async function PermissionsPage() {
  const { permissions } = await getPermissionsData()

  return <PermissionsClient initialPermissions={permissions} />
} 