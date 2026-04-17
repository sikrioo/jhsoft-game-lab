let slotItemSeed = 0;

export const SLOT_ITEM_BASES = Object.freeze([
  {
    key: 'attack_keen_edge',
    slotType: 'attack',
    rarity: 'magic',
    icon: '🟥',
    name: '예리한 전투 인장',
    cost: 6,
    shortLabel: '치명 +5%',
    desc: '공격 특수 슬롯에 장착하면 해당 슬롯이 활성화된 동안 치명타 확률이 상승합니다.',
    modifiers: {
      critFlat: 0.05,
    },
  },
  {
    key: 'attack_bloodmark',
    slotType: 'attack',
    rarity: 'magic',
    icon: '🟥',
    name: '맹공의 혈인',
    cost: 6,
    shortLabel: '공격력 +5%',
    desc: '공격 특수 슬롯에 장착하면 해당 슬롯이 활성화된 동안 공격력이 상승합니다.',
    modifiers: {
      atkMultiplier: 0.05,
    },
  },
  {
    key: 'defense_vital_guard',
    slotType: 'defense',
    rarity: 'magic',
    icon: '🟦',
    name: '생명의 방호 각인',
    cost: 5,
    shortLabel: 'HP +5%',
    desc: '방어 특수 슬롯에 장착하면 해당 슬롯이 활성화된 동안 최대 HP가 증가합니다.',
    modifiers: {
      maxHpMultiplier: 0.05,
    },
  },
  {
    key: 'magic_mana_well',
    slotType: 'magic',
    rarity: 'magic',
    icon: '🟪',
    name: '마나 샘 결정',
    cost: 5,
    shortLabel: 'MP +5%',
    desc: '마법 특수 슬롯에 장착하면 해당 슬롯이 활성화된 동안 최대 MP가 증가합니다.',
    modifiers: {
      maxMpMultiplier: 0.05,
    },
  },
]);

export const STARTER_SLOT_ITEMS = Object.freeze([
  'attack_keen_edge',
  'attack_bloodmark',
  'defense_vital_guard',
  'magic_mana_well',
]);

export function createSlotItemInstance(base) {
  return {
    id: `slot_${base.key}_${slotItemSeed++}`,
    category: 'slot',
    key: base.key,
    slotType: base.slotType,
    rarity: base.rarity,
    icon: base.icon,
    name: base.name,
    cost: base.cost ?? 0,
    shortLabel: base.shortLabel,
    desc: base.desc,
    modifiers: { ...(base.modifiers ?? {}) },
  };
}
