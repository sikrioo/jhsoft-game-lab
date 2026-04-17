import { ITEM_BASES, EQUIPMENT_BASES } from '../data/items.js';

let lootSeed = 0;

export function rollLootForEnemy(enemy) {
  const drops = [];
  const guaranteedRolls = enemy.rank === 'boss' ? 2 : enemy.rank === 'midboss' ? 1 : 0;
  const bonusChance = enemy.rank === 'elite' ? 0.62 : enemy.rank === 'normal' ? 0.42 : 0.75;

  for (let i = 0; i < guaranteedRolls; i += 1) {
    const item = createDrop(enemy, true);
    if (item) drops.push(item);
  }

  if (Math.random() < bonusChance) {
    const item = createDrop(enemy, false);
    if (item) drops.push(item);
  }

  return drops;
}

function createDrop(enemy, guaranteed) {
  const roll = Math.random();

  if (enemy.rank === 'boss' && roll < 0.18) {
    return createItem('quest', enemy);
  }
  if (roll < (guaranteed ? 0.45 : 0.28)) {
    return createEquipment(enemy);
  }
  if (roll < 0.58) {
    return createItem('consumable', enemy);
  }
  if (roll < 0.82) {
    return createItem('material', enemy);
  }
  return createItem('rune_fragment', enemy);
}

function createEquipment(enemy) {
  const base = EQUIPMENT_BASES[Math.floor(Math.random() * EQUIPMENT_BASES.length)];
  const suffix = enemy.rank === 'boss' ? '왕의' : enemy.rank === 'midboss' ? '고대' : enemy.rank === 'elite' ? '정예' : '수습';
  const rarity = enemy.rarity ?? base.rarity;
  const stats = { ...(base.stats ?? {}) };

  if (rarity === 'rare') {
    stats.atk = (stats.atk ?? 0) + 3;
    stats.def = (stats.def ?? 0) + 2;
  }
  if (rarity === 'epic') {
    stats.atk = (stats.atk ?? 0) + 6;
    stats.maxHp = (stats.maxHp ?? 0) + 20;
  }
  if (rarity === 'legendary') {
    stats.atk = (stats.atk ?? 0) + 9;
    stats.maxMp = (stats.maxMp ?? 0) + 18;
    stats.crit = (stats.crit ?? 0) + 0.03;
  }

  return {
    id: `loot_${base.key}_${lootSeed++}`,
    category: 'equipment',
    rarity,
    levelReq: enemy.level ?? 1,
    name: `${suffix} ${base.name}`,
    icon: base.icon,
    slot: base.slot,
    stats,
    desc: `${enemy.name}에게서 떨어진 장비.`,
  };
}

function createItem(category, enemy) {
  const pool = ITEM_BASES[category];
  const base = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: `loot_${base.key}_${lootSeed++}`,
    category,
    rarity: category === 'quest' ? 'rare' : enemy.rarity ?? 'common',
    name: base.name,
    icon: base.icon,
    effect: base.effect ? { ...base.effect } : undefined,
    desc: base.desc,
  };
}
