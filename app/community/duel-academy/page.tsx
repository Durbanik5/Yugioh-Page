import { Metadata } from 'next'
import { DuelAcademyClient } from './duel-academy-client'

export const metadata: Metadata = {
  title: 'Duel Academy | Yu-Gi-Oh! Hub',
  description: 'Learn to duel with tutorials, combo guides, deck building tips, and puzzle challenges',
}

export default function DuelAcademyPage() {
  return <DuelAcademyClient />
}
