/**
 * Shared element → Tailwind styling map for agent UI (gallery cards, agent codex,
 * profile). Keys match the `Element` union ('Fire' | 'Water' | 'Air' | 'Earth').
 * Single source of truth — was previously duplicated across three files.
 */
export const ELEMENT_METADATA = {
  Air: {
    glow: 'agent-glow-air border-substance-air/30',
    bg: 'bg-substance-air',
    text: 'text-substance-air',
    glowColor: 'rgba(185, 140, 214, 0.4)',
  },
  Water: {
    glow: 'agent-glow-water border-essence-water/30',
    bg: 'bg-essence-water',
    text: 'text-essence-water',
    glowColor: 'rgba(74, 163, 216, 0.4)',
  },
  Fire: {
    glow: 'agent-glow-fire border-spirit-fire/30',
    bg: 'bg-spirit-fire',
    text: 'text-spirit-fire',
    glowColor: 'rgba(224, 162, 58, 0.4)',
  },
  Earth: {
    glow: 'agent-glow-earth border-matter-earth/30',
    bg: 'bg-matter-earth',
    text: 'text-matter-earth',
    glowColor: 'rgba(95, 179, 122, 0.4)',
  },
} as const
