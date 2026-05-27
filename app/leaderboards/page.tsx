import { Metadata } from 'next'
import { LeaderboardsClient } from './leaderboards-client'

export const metadata: Metadata = {
  title: 'Leaderboards | Yu-Gi-Oh! Hub',
  description: 'View top duelists, rankings, and match history',
}

export default function LeaderboardsPage() {
  return <LeaderboardsClient />
}
