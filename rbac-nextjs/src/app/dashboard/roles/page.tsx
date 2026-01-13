import { RolesClient } from './client'

// Force this page to be dynamic to avoid build-time data fetching issues
export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  // Defer data loading to the client component to avoid build-time issues
  return <RolesClient initialRoles={[]} allPermissions={[]} />
}