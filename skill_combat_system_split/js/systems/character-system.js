import { EQUIPMENT_SLOT_LABELS } from '../data/items.js';
import { battleState } from '../domain/battle-state.js';
import { getPassiveBonuses } from './skill-system.js';
import { getActiveSpecialSlotModifiers } from './slot-system.js';

export function createEmptyEquipment() {
  return {
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
}

export function recalculatePlayerStats(playerState = battleState.player) {
  const { level } = playerState.progression;
  const { strength, dexterity, intelligence, vitality } = playerState.attributes;
  const gearStats = sumEquipmentStats(playerState);
  const passiveStats = getPassiveBonuses();
  const slotStats = getActiveSpecialSlotModifiers(playerState);

  const flatAtk = (gearStats.atk ?? 0) + (passiveStats.atk ?? 0);
  const flatDef = (gearStats.def ?? 0) + (passiveStats.def ?? 0);
  const flatMagicAtk = (gearStats.magicAtk ?? 0) + (passiveStats.magicAtk ?? 0);
  const flatMaxHp = (gearStats.hp ?? 0) + (gearStats.maxHp ?? 0) + (passiveStats.maxHp ?? 0);
  const flatMaxMp = (gearStats.mp ?? 0) + (gearStats.maxMp ?? 0) + (passiveStats.maxMp ?? 0);
  const flatSpeed = (gearStats.speed ?? 0) + (passiveStats.speed ?? 0);
  const critBonus = (gearStats.crit ?? 0) + (passiveStats.crit ?? 0);

  const baseAtk = 12 + level * 2 + strength * 2 + Math.floor(dexterity * 0.3) + flatAtk;
  const baseDef = 4 + level + Math.floor(vitality * 0.7) + flatDef;
  const baseMagicAtk = 14 + level * 2 + intelligence * 2 + Math.floor(strength * 0.35) + flatMagicAtk;
  const baseSpeed = Math.round(10 + dexterity * 0.5 + flatSpeed);

  const atkMultiplier = 1 + (slotStats.atkMultiplier ?? 0);
  const defMultiplier = 1 + (slotStats.defMultiplier ?? 0);
  const magicAtkMultiplier = 1 + (slotStats.magicAtkMultiplier ?? 0);
  const maxHpMultiplier = 1 + (slotStats.maxHpMultiplier ?? 0);
  const maxMpMultiplier = 1 + (slotStats.maxMpMultiplier ?? 0);

  playerState.stats.atk = Math.round(baseAtk * atkMultiplier);
  playerState.stats.def = Math.round(baseDef * defMultiplier);
  playerState.stats.magicAtk = Math.round(baseMagicAtk * magicAtkMultiplier);
  playerState.stats.speed = baseSpeed;
  playerState.stats.crit = 0.03 + dexterity * 0.002 + critBonus + (slotStats.critFlat ?? 0);
  playerState.stats.maxHp = Math.round((220 + vitality * 18 + level * 12 + flatMaxHp) * maxHpMultiplier);
  playerState.stats.maxMp = Math.round((90 + intelligence * 12 + level * 8 + flatMaxMp) * maxMpMultiplier);
  playerState.stats.slotAtkMultiplier = atkMultiplier;
  playerState.stats.slotDefMultiplier = defMultiplier;
  playerState.stats.slotMagicMultiplier = magicAtkMultiplier;

  playerState.build.costLimit = getBuildCostLimit(level);
  playerState.resources.hp = Math.min(playerState.resources.hp, playerState.stats.maxHp);
  playerState.resources.mp = Math.min(playerState.resources.mp, playerState.stats.maxMp);
}

export function allocateStat(statKey) {
  if (battleState.player.progression.statPoints <= 0) {
    return { ok: false, reason: '남은 스탯 포인트가 없습니다.' };
  }

  if (!(statKey in battleState.player.attributes)) {
    return { ok: false, reason: '알 수 없는 스탯입니다.' };
  }

  battleState.player.attributes[statKey] += 1;
  battleState.player.progression.statPoints -= 1;
  recalculatePlayerStats();
  return { ok: true };
}

export function equipItem(itemId) {
  const index = battleState.player.inventory.findIndex((item) => item.id === itemId && item.category === 'equipment');
  if (index < 0) {
    return { ok: false, reason: '장비 아이템을 찾을 수 없습니다.' };
  }

  const item = battleState.player.inventory[index];
  const targetSlot = resolveEquipSlot(item.slot);
  const current = battleState.player.equipment[targetSlot];

  if (current) {
    battleState.player.inventory.push(current);
  }

  battleState.player.equipment[targetSlot] = item;
  battleState.player.inventory.splice(index, 1);
  recalculatePlayerStats();
  return { ok: true };
}

export function unequipItem(slotKey) {
  const item = battleState.player.equipment[slotKey];
  if (!item) {
    return { ok: false, reason: '해당 슬롯에 장비가 없습니다.' };
  }

  battleState.player.inventory.push(item);
  battleState.player.equipment[slotKey] = null;
  recalculatePlayerStats();
  return { ok: true };
}

export function useConsumable(itemId) {
  const index = battleState.player.inventory.findIndex((item) => item.id === itemId && item.category === 'consumable');
  if (index < 0) {
    return { ok: false, reason: '소비 아이템을 찾을 수 없습니다.' };
  }

  const item = battleState.player.inventory[index];
  if (item.effect?.heal) {
    battleState.player.resources.hp = Math.min(battleState.player.stats.maxHp, battleState.player.resources.hp + item.effect.heal);
  }
  if (item.effect?.mana) {
    battleState.player.resources.mp = Math.min(battleState.player.stats.maxMp, battleState.player.resources.mp + item.effect.mana);
  }

  battleState.player.inventory.splice(index, 1);
  return { ok: true, item };
}

export function getEquipmentSlots() {
  return Object.keys(battleState.player.equipment).map((slotKey) => ({
    slotKey,
    label: EQUIPMENT_SLOT_LABELS[slotKey] ?? slotKey,
    item: battleState.player.equipment[slotKey],
  }));
}

export function getBuildCostLimit(level = battleState.player.progression.level) {
  return 78 + level * 8;
}

function resolveEquipSlot(slot) {
  if (slot !== 'ring') {
    return slot;
  }

  if (!battleState.player.equipment.ring1) {
    return 'ring1';
  }
  if (!battleState.player.equipment.ring2) {
    return 'ring2';
  }
  return 'ring1';
}

function sumEquipmentStats(playerState = battleState.player) {
  return Object.values(playerState.equipment).filter(Boolean).reduce((acc, item) => {
    Object.entries(item.stats ?? {}).forEach(([key, value]) => {
      acc[key] = (acc[key] ?? 0) + value;
    });
    return acc;
  }, {});
}
