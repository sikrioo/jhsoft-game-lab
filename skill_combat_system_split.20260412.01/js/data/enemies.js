export const ENEMIES = [
  { id: 'zombie', name: '좀비', icon: '🧟', level: 1, exp: 18, rank: 'normal', rarity: 'common', hp: 250, mp: 0, atk: [15, 25], el: 'physical', reward: 100, special: null, attributes: { strength: 8, dexterity: 4, intelligence: 1, vitality: 10 } },
  { id: 'skeleton', name: '스켈레톤', icon: '💀', level: 2, exp: 28, rank: 'normal', rarity: 'magic', hp: 320, mp: 30, atk: [20, 32], el: 'physical', reward: 150, special: 'poison', attributes: { strength: 10, dexterity: 8, intelligence: 4, vitality: 11 } },
  { id: 'demon', name: '데몬', icon: '👹', level: 4, exp: 46, rank: 'elite', rarity: 'rare', hp: 450, mp: 90, atk: [28, 42], el: 'fire', reward: 200, special: 'fire', attributes: { strength: 16, dexterity: 9, intelligence: 10, vitality: 16 } },
  { id: 'dragon', name: '드래곤', icon: '🐉', level: 7, exp: 80, rank: 'midboss', rarity: 'epic', hp: 600, mp: 140, atk: [35, 55], el: 'fire', reward: 300, special: 'fire_breath', attributes: { strength: 24, dexterity: 12, intelligence: 12, vitality: 24 } },
  { id: 'lich_king', name: '리치 킹', icon: '👑', level: 10, exp: 160, rank: 'boss', rarity: 'legendary', hp: 800, mp: 220, atk: [40, 65], el: 'dark', reward: 500, special: 'drain', attributes: { strength: 14, dexterity: 12, intelligence: 28, vitality: 20 } },
];
