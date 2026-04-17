import { EQUIPMENT_BASES, ITEM_BASES, STARTER_LOADOUT } from '../data/items.js';
import { DEFAULT_PLAYER_PROGRESSION, DEFAULT_PLAYER_STATS, MAX_BUILD_MANA } from '../data/constants.js';
import { SKILLS } from '../data/skills.js';

export function createPlayerState() {
  const emptyEquipment = {
    helm: null,
    chest: null,
    gloves: null,
    boots: null,
    weapon: null,
    offhand: null,
    belt: null,
    amulet: null,
    ring1: null,
    ring2: null,
  };

  const player = {
    profile: {
      name: 'KIRA',
      classId: 'mage',
    },
    progression: {
      level: DEFAULT_PLAYER_PROGRESSION.level,
      exp: DEFAULT_PLAYER_PROGRESSION.exp,
      nextExp: DEFAULT_PLAYER_PROGRESSION.nextExp,
      statPoints: 0,
    },
    attributes: {
      strength: DEFAULT_PLAYER_STATS.strength,
      dexterity: DEFAULT_PLAYER_STATS.dexterity,
      intelligence: DEFAULT_PLAYER_STATS.intelligence,
      vitality: DEFAULT_PLAYER_STATS.vitality,
    },
    stats: {
      ...DEFAULT_PLAYER_STATS,
      maxHp: DEFAULT_PLAYER_STATS.hp,
      maxMp: DEFAULT_PLAYER_STATS.mp,
    },
    resources: {
      hp: DEFAULT_PLAYER_STATS.hp,
      mp: DEFAULT_PLAYER_STATS.mp,
    },
    build: {
      manaLimit: MAX_BUILD_MANA,
      usedMana: 0,
    },
    skillBook: createSkillBook(),
    inventory: [],
    equipment: emptyEquipment,
    effects: {},
  };

  applyStarterLoadout(player);
  return player;
}

function applyStarterLoadout(player) {
  for (const key of STARTER_LOADOUT.equipped) {
    const base = EQUIPMENT_BASES.find((item) => item.key === key);
    if (!base) continue;
    const instance = createEquipmentInstance(base);
    if (base.slot === 'ring') {
      const slotKey = player.equipment.ring1 ? 'ring2' : 'ring1';
      player.equipment[slotKey] = instance;
    } else {
      player.equipment[base.slot] = instance;
    }
  }

  for (const key of STARTER_LOADOUT.inventoryEquipment) {
    const base = EQUIPMENT_BASES.find((item) => item.key === key);
    if (base) {
      player.inventory.push(createEquipmentInstance(base));
    }
  }

  for (const [key, amount] of STARTER_LOADOUT.consumables) {
    const base = ITEM_BASES.consumable.find((item) => item.key === key);
    if (!base) continue;
    for (let i = 0; i < amount; i += 1) {
      player.inventory.push(createItemInstance(base, 'consumable', 'common'));
    }
  }
}

function createEquipmentInstance(base) {
  return {
    id: `starter_${base.key}_${Math.random().toString(36).slice(2, 9)}`,
    category: 'equipment',
    rarity: base.rarity,
    levelReq: 1,
    name: base.name,
    icon: base.icon,
    slot: base.slot,
    stats: { ...(base.stats ?? {}) },
    desc: '초심자를 위한 장비.',
  };
}

function createItemInstance(base, category, rarity) {
  return {
    id: `starter_${base.key}_${Math.random().toString(36).slice(2, 9)}`,
    category,
    rarity,
    name: base.name,
    icon: base.icon,
    effect: base.effect ? { ...base.effect } : undefined,
    desc: base.desc,
  };
}

function createSkillBook() {
  return SKILLS.reduce((acc, skill) => {
    acc[skill.id] = { level: skill.level ?? 1 };
    return acc;
  }, {});
}
