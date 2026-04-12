export const QUEUE_SIZE = 13;
export const PASSIVE_SLOT_INDEX = 12;
export const SPEED_STEPS = [1, 2, 4];

export const SLOT_DEFINITIONS = Object.freeze([
  { index: 0, key: 'a1', row: 'attack', col: 1, label: 'A1', special: false, heroSlot: false, bonusKey: null },
  { index: 1, key: 'a2', row: 'attack', col: 2, label: 'A2', special: false, heroSlot: false, bonusKey: null },
  { index: 2, key: 'ah', row: 'attack', col: 3, label: 'AH', special: false, heroSlot: true, bonusKey: null },
  { index: 3, key: 'a3', row: 'attack', col: 4, label: 'A3', special: true, heroSlot: false, bonusKey: 'attack' },
  { index: 4, key: 'd1', row: 'defense', col: 1, label: 'D1', special: false, heroSlot: false, bonusKey: null },
  { index: 5, key: 'd2', row: 'defense', col: 2, label: 'D2', special: false, heroSlot: false, bonusKey: null },
  { index: 6, key: 'dh', row: 'defense', col: 3, label: 'DH', special: false, heroSlot: true, bonusKey: null },
  { index: 7, key: 'd3', row: 'defense', col: 4, label: 'D3', special: true, heroSlot: false, bonusKey: 'defense' },
  { index: 8, key: 'm1', row: 'magic', col: 1, label: 'M1', special: false, heroSlot: false, bonusKey: null },
  { index: 9, key: 'm2', row: 'magic', col: 2, label: 'M2', special: false, heroSlot: false, bonusKey: null },
  { index: 10, key: 'mh', row: 'magic', col: 3, label: 'MH', special: false, heroSlot: true, bonusKey: null },
  { index: 11, key: 'm3', row: 'magic', col: 4, label: 'M3', special: true, heroSlot: false, bonusKey: 'magic' },
  { index: 12, key: 'p1', row: 'passive', col: 1, label: 'P1', special: false, heroSlot: false, bonusKey: null },
]);

export const SLOT_ROW_LABELS = Object.freeze({
  attack: '공격',
  defense: '방어',
  magic: '마법',
  passive: '패시브',
});

export const STRATEGIES = Object.freeze({
  aggressive: {
    id: 'aggressive',
    name: '공격형',
    description: '공격 계열과 고화력 스킬을 먼저 찾습니다.',
  },
  balanced: {
    id: 'balanced',
    name: '균형형',
    description: '공격, 방어, 회복을 전황에 맞게 섞어서 사용합니다.',
  },
  defensive: {
    id: 'defensive',
    name: '방어형',
    description: '생존과 회복을 우선하며 위기에서 버티는 전략입니다.',
  },
});

export const TACTIC_OPTIONS = Object.freeze({
  atb_saver: {
    id: 'atb_saver',
    name: 'ATB 절약',
    description: 'ATB 비용이 낮은 스킬의 우선도를 높입니다.',
  },
  mana_saver: {
    id: 'mana_saver',
    name: 'MP 절약',
    description: '전투 MP가 낮을수록 저비용 스킬을 선호합니다.',
  },
  expensive_first: {
    id: 'expensive_first',
    name: '고비용 우선',
    description: '충전이 넉넉할 때 고비용 스킬을 먼저 사용합니다.',
  },
});

export const DEFAULT_STARTER = Object.freeze([
  'atk',
  null,
  null,
  null,
  'guard',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]);

export const DEFAULT_PLAYER_STATS = Object.freeze({
  hp: 500,
  mp: 200,
  atk: 20,
  def: 8,
  magicAtk: 24,
  speed: 15,
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
  bleed: '🩸',
  freeze: '❄',
  poison: '☠',
  stun: '💫',
  slow: '🫧',
  root: '🌿',
  paralyze: '⚡',
  curse: '💀',
  regen: '💚',
  powerup: '💪',
  berserk: '😡',
  shield: '🛡',
  dodge: '💨',
  guard: '🔰',
  haste: '⚙',
  reflect: '✨',
  stealth: '🌫',
  knockback: '💥',
});

export const ELEMENT_COLORS = Object.freeze({
  physical: '#c8b060',
  fire: '#ff7f50',
  cold: '#7fd7ff',
  lightning: '#d8d34f',
  poison: '#67c96f',
  arcane: '#b78cff',
  holy: '#ffd36a',
  support: '#62d0b0',
  shadow: '#8d79d9',
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
