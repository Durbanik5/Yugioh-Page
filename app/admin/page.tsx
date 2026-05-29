import { redirect } from 'next/navigation'
import { getProfile } from '@/app/auth/actions'
import { AdminClient } from './admin-client'

export default async function AdminPage() {
  const profile = await getProfile()
  
  if (!profile || (profile.role !== 'admin' && profile.role !== 'owner')) {
    redirect('/')
  }
  
  return <AdminClient profile={profile} />
}
