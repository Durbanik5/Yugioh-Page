import { Metadata } from 'next'
import { AchievementsClient } from './achievements-client'

export const metadata: Metadata = {
  title: 'Achievements | Yu-Gi-Oh Dueling Platform',
  description: 'Track your dueling achievements and earn medals',
}

export default function AchievementsPage() {
  return <AchievementsClient />
}
