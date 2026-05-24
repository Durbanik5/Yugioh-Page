import type { ProfileTheme, YugiohSeries, CardMechanic, CardType } from './types'

export interface ThemeConfig {
  id: ProfileTheme
  name: string
  character: string
  series: string
  description: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    card: string
    border: string
    text: string
    muted: string
  }
  gradientFrom: string
  gradientTo: string
}

export const PROFILE_THEMES: Record<ProfileTheme, ThemeConfig> = {
  kaiba: {
    id: 'kaiba',
    name: 'Kaiba Corp',
    character: 'Seto Kaiba',
    series: 'Duel Monsters',
    description: 'The cold, calculating style of Kaiba Corporation',
    colors: {
      primary: '#3b82f6',
      secondary: '#1e3a5f',
      accent: '#60a5fa',
      background: '#0a0f1a',
      card: '#111827',
      border: '#1e3a5f',
      text: '#f8fafc',
      muted: '#64748b',
    },
    gradientFrom: '#1e3a5f',
    gradientTo: '#0a0f1a',
  },
  yugi: {
    id: 'yugi',
    name: 'King of Games',
    character: 'Yugi Muto',
    series: 'Duel Monsters',
    description: 'The legendary King of Games, wielder of the Millennium Puzzle',
    colors: {
      primary: '#a855f7',
      secondary: '#581c87',
      accent: '#c084fc',
      background: '#0f0a1a',
      card: '#1a1025',
      border: '#581c87',
      text: '#faf5ff',
      muted: '#a78bfa',
    },
    gradientFrom: '#581c87',
    gradientTo: '#0f0a1a',
  },
  joey: {
    id: 'joey',
    name: 'Brooklyn Rage',
    character: 'Joey Wheeler',
    series: 'Duel Monsters',
    description: 'The underdog fighter with heart and determination',
    colors: {
      primary: '#f59e0b',
      secondary: '#92400e',
      accent: '#fbbf24',
      background: '#1a1207',
      card: '#292011',
      border: '#92400e',
      text: '#fefce8',
      muted: '#d97706',
    },
    gradientFrom: '#92400e',
    gradientTo: '#1a1207',
  },
  marik: {
    id: 'marik',
    name: 'Rare Hunters',
    character: 'Marik Ishtar',
    series: 'Duel Monsters',
    description: 'The dark power of the Millennium Rod',
    colors: {
      primary: '#a855f7',
      secondary: '#4a1d6e',
      accent: '#d8b4fe',
      background: '#0d0815',
      card: '#1a0f2e',
      border: '#4a1d6e',
      text: '#f3e8ff',
      muted: '#9333ea',
    },
    gradientFrom: '#4a1d6e',
    gradientTo: '#0d0815',
  },
  pegasus: {
    id: 'pegasus',
    name: 'Industrial Illusions',
    character: 'Maximillion Pegasus',
    series: 'Duel Monsters',
    description: 'The elegant creator of Duel Monsters',
    colors: {
      primary: '#ec4899',
      secondary: '#831843',
      accent: '#f472b6',
      background: '#1a0a14',
      card: '#2d1322',
      border: '#831843',
      text: '#fdf2f8',
      muted: '#db2777',
    },
    gradientFrom: '#831843',
    gradientTo: '#1a0a14',
  },
  jaden: {
    id: 'jaden',
    name: 'Slifer Red',
    character: 'Jaden Yuki',
    series: 'GX',
    description: 'Get your game on! The hero of Duel Academy',
    colors: {
      primary: '#ef4444',
      secondary: '#7f1d1d',
      accent: '#f87171',
      background: '#1a0a0a',
      card: '#2d1111',
      border: '#7f1d1d',
      text: '#fef2f2',
      muted: '#dc2626',
    },
    gradientFrom: '#7f1d1d',
    gradientTo: '#1a0a0a',
  },
  yusei: {
    id: 'yusei',
    name: 'Team 5Ds',
    character: 'Yusei Fudo',
    series: '5Ds',
    description: 'The Shooting Star of Satellite, master of Synchros',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0c4a6e',
      accent: '#38bdf8',
      background: '#0a1520',
      card: '#0f2536',
      border: '#0c4a6e',
      text: '#f0f9ff',
      muted: '#0284c7',
    },
    gradientFrom: '#0c4a6e',
    gradientTo: '#0a1520',
  },
  yuma: {
    id: 'yuma',
    name: 'High Five the Sky',
    character: 'Yuma Tsukumo',
    series: 'ZEXAL',
    description: 'Feeling the flow with Xyz power!',
    colors: {
      primary: '#f97316',
      secondary: '#9a3412',
      accent: '#fb923c',
      background: '#1a0f0a',
      card: '#2d1a10',
      border: '#9a3412',
      text: '#fff7ed',
      muted: '#ea580c',
    },
    gradientFrom: '#9a3412',
    gradientTo: '#1a0f0a',
  },
  yuya: {
    id: 'yuya',
    name: 'Pendulum',
    character: 'Yuya Sakaki',
    series: 'Arc-V',
    description: 'Swing into action with Pendulum Summoning!',
    colors: {
      primary: '#22c55e',
      secondary: '#14532d',
      accent: '#4ade80',
      background: '#0a1a0f',
      card: '#112d1a',
      border: '#14532d',
      text: '#f0fdf4',
      muted: '#16a34a',
    },
    gradientFrom: '#14532d',
    gradientTo: '#0a1a0f',
  },
  yusaku: {
    id: 'yusaku',
    name: 'VRAINS',
    character: 'Yusaku Fujiki',
    series: 'VRAINS',
    description: 'Into the VRAINS! Master of Link Summoning',
    colors: {
      primary: '#06b6d4',
      secondary: '#164e63',
      accent: '#22d3ee',
      background: '#0a1a1f',
      card: '#0f2a33',
      border: '#164e63',
      text: '#ecfeff',
      muted: '#0891b2',
    },
    gradientFrom: '#164e63',
    gradientTo: '#0a1a1f',
  },
}

export const YUGIOH_SERIES: Record<YugiohSeries, { label: string; years: string }> = {
  duel_monsters: { label: 'Duel Monsters', years: '2000-2004' },
  gx: { label: 'GX', years: '2004-2008' },
  five_ds: { label: '5Ds', years: '2008-2011' },
  zexal: { label: 'ZEXAL', years: '2011-2014' },
  arc_v: { label: 'Arc-V', years: '2014-2017' },
  vrains: { label: 'VRAINS', years: '2017-2019' },
  sevens: { label: 'SEVENS', years: '2020-2022' },
  go_rush: { label: 'Go Rush!!', years: '2022-present' },
}

export const CARD_MECHANICS: Record<CardMechanic, { label: string; color: string; icon: string }> = {
  normal: { label: 'Normal', color: '#d4a574', icon: 'Square' },
  effect: { label: 'Effect', color: '#c45c26', icon: 'Sparkles' },
  ritual: { label: 'Ritual', color: '#3b82f6', icon: 'Moon' },
  fusion: { label: 'Fusion', color: '#a855f7', icon: 'Merge' },
  synchro: { label: 'Synchro', color: '#f8fafc', icon: 'Orbit' },
  xyz: { label: 'Xyz', color: '#1f1f1f', icon: 'Stars' },
  pendulum: { label: 'Pendulum', color: '#22c55e', icon: 'ArrowUpDown' },
  link: { label: 'Link', color: '#06b6d4', icon: 'Link' },
}

export const CARD_TYPES: Record<CardType, { label: string; icon: string }> = {
  dragon: { label: 'Dragon', icon: 'Flame' },
  spellcaster: { label: 'Spellcaster', icon: 'Wand2' },
  warrior: { label: 'Warrior', icon: 'Sword' },
  fiend: { label: 'Fiend', icon: 'Skull' },
  fairy: { label: 'Fairy', icon: 'Sparkles' },
  zombie: { label: 'Zombie', icon: 'Ghost' },
  machine: { label: 'Machine', icon: 'Cog' },
  aqua: { label: 'Aqua', icon: 'Droplets' },
  pyro: { label: 'Pyro', icon: 'Flame' },
  rock: { label: 'Rock', icon: 'Mountain' },
  winged_beast: { label: 'Winged Beast', icon: 'Bird' },
  plant: { label: 'Plant', icon: 'Leaf' },
  insect: { label: 'Insect', icon: 'Bug' },
  thunder: { label: 'Thunder', icon: 'Zap' },
  dinosaur: { label: 'Dinosaur', icon: 'Bone' },
  reptile: { label: 'Reptile', icon: 'Snail' },
  fish: { label: 'Fish', icon: 'Fish' },
  sea_serpent: { label: 'Sea Serpent', icon: 'Waves' },
  beast: { label: 'Beast', icon: 'Cat' },
  beast_warrior: { label: 'Beast-Warrior', icon: 'Shield' },
  psychic: { label: 'Psychic', icon: 'Brain' },
  divine_beast: { label: 'Divine-Beast', icon: 'Crown' },
  wyrm: { label: 'Wyrm', icon: 'Wind' },
  cyberse: { label: 'Cyberse', icon: 'Cpu' },
}

export function getThemeCSS(theme: ProfileTheme): string {
  const t = PROFILE_THEMES[theme]
  return `
    --theme-primary: ${t.colors.primary};
    --theme-secondary: ${t.colors.secondary};
    --theme-accent: ${t.colors.accent};
    --theme-background: ${t.colors.background};
    --theme-card: ${t.colors.card};
    --theme-border: ${t.colors.border};
    --theme-text: ${t.colors.text};
    --theme-muted: ${t.colors.muted};
    --theme-gradient-from: ${t.gradientFrom};
    --theme-gradient-to: ${t.gradientTo};
  `
}
