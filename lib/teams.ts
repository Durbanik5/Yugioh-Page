import type { PlayerTeam } from './types'

export interface TeamConfig {
  id: PlayerTeam
  name: string
  shortName: string
  school: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
    light: string
  }
  icon: string
}

export const TEAMS: Record<PlayerTeam, TeamConfig> = {
  slifer_red: {
    id: 'slifer_red',
    name: 'Slifer Red',
    shortName: 'Red',
    school: 'Slifer Red Academy',
    description: 'The passionate and spirited duelist academy. Home to those with burning determination and an unbreakable will to duel.',
    colors: {
      primary: '#dc2626',
      secondary: '#7f1d1d',
      accent: '#f87171',
      light: '#fee2e2',
    },
    icon: '🔴',
  },
  ra_yellow: {
    id: 'ra_yellow',
    name: 'Ra Yellow',
    shortName: 'Yellow',
    school: 'Ra Yellow Academy',
    description: 'The balanced and strategic duelist academy. Where intellect meets intuition, and calculated moves lead to victory.',
    colors: {
      primary: '#eab308',
      secondary: '#854d0e',
      accent: '#facc15',
      light: '#fef3c7',
    },
    icon: '🟡',
  },
  obelisk_blue: {
    id: 'obelisk_blue',
    name: 'Obelisk Blue',
    shortName: 'Blue',
    school: 'Obelisk Blue Academy',
    description: 'The elite and prestigious duelist academy. Reserved for the most talented duelists who command respect and power.',
    colors: {
      primary: '#2563eb',
      secondary: '#1e40af',
      accent: '#60a5fa',
      light: '#dbeafe',
    },
    icon: '🔵',
  },
}

export function getTeamColor(team: PlayerTeam | null): string {
  if (!team) return '#64748b'
  return TEAMS[team].colors.primary
}

export function getTeamName(team: PlayerTeam | null): string {
  if (!team) return 'No Team'
  return TEAMS[team].name
}

export function getTeamBadgeClasses(team: PlayerTeam | null): string {
  if (!team) return 'bg-slate-700 text-slate-100'
  
  switch (team) {
    case 'slifer_red':
      return 'bg-red-700 text-red-50'
    case 'ra_yellow':
      return 'bg-amber-600 text-amber-50'
    case 'obelisk_blue':
      return 'bg-blue-700 text-blue-50'
    default:
      return 'bg-slate-700 text-slate-100'
  }
}
