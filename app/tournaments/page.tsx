import { Metadata } from 'next'
import { TournamentsClient } from './tournaments-client'

export const metadata: Metadata = {
  title: 'Tournaments | Yu-Gi-Oh! Hub',
  description: 'Join and compete in Yu-Gi-Oh! tournaments',
}

export default function TournamentsPage() {
  return <TournamentsClient />
}
