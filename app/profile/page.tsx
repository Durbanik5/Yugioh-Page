import { redirect } from 'next/navigation'
import { getProfile } from '@/app/auth/actions'
import { ProfileClient } from './profile-client'

export default async function ProfilePage() {
  const profile = await getProfile()
  
  if (!profile) {
    redirect('/auth/login')
  }
  
  return <ProfileClient profile={profile} />
}
