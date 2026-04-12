export const QUEUE_SIZE = 15;
export const MAX_BUILD_MANA = 120;
export const SPEED_STEPS = [1, 2, 4];

export const DEFAULT_STARTER = ['atk', 'fireball', 'heal', 'icebolt', 'guard', 'heavy', 'regen', 'shock', 'atk', 'fireball'];

export const DEFAULT_PLAYER_STATS = Object.freeze({
  hp: 500,
  mp: 200,
  atk: 20,
  def: 8,
  speed: 10,
  crit: 0.05,
  strength: 12,
  dexterity: 10,
  intelligence: 14,
  vitality: 12,
});

export const DEFAULT_PLAYER_PROGRESSION = Object.freeze({
  level: 1,
  exp: 0,
  nextExp: 60,
});

export const EFFECT_ICONS = Object.freeze({
  burn: '🔥',
  freeze: '❄',
  poison: '☠',
  stun: '💫',
  slow: '🐢',
  root: '⛓',
  paralyze: '⚡',
  curse: '🌑',
  regen: '💚',
  powerup: '✨',
  berserk: '🩸',
  shield: '🛡',
  dodge: '💨',
  guard: '🧱',
  knockback: '💥',
});

export const ELEMENT_COLORS = Object.freeze({
  physical: '#c8b060',
  fire: '#e05020',
  ice: '#4090d0',
  lightning: '#d0c020',
  dark: '#8050d0',
  nature: '#40b040',
  holy: '#d0b050',
  buff: '#50c0a0',
});

export const RARITY_LABELS = Object.freeze({
  common: '일반',
  magic: '마법',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
});

export const RANK_LABELS = Object.freeze({
  normal: '일반',
  elite: '엘리트',
  midboss: '중간보스',
  boss: '보스',
});
