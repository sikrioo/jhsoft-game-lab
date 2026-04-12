import { SLOT_DEFINITIONS } from '../data/constants.js';
import { SLOT_ITEM_BASES, createSlotItemInstance } from '../data/slot-items.js';
import { battleState } from '../domain/battle-state.js';

const SPECIAL_SLOT_INDEXES = Object.freeze({
  attack: SLOT_DEFINITIONS.find((slot) => slot.bonusKey === 'attack')?.index ?? 2,
  defense: SLOT_DEFINITIONS.find((slot) => slot.bonusKey === 'defense')?.index ?? 5,
  magic: SLOT_DEFINITIONS.find((slot) => slot.bonusKey === 'magic')?.index ?? 8,
});

export function getSpecialSlotItem(slotType, playerState = battleState.player) {
  return playerState.specialSlots?.[slotType] ?? null;
}

export function getSpecialSlotBonusLabel(slotType, playerState = battleState.player) {
  return getSpecialSlotItem(slotType, playerState)?.shortLabel ?? '미장착';
}

export function getOwnedSlotItems(playerState = battleState.player) {
  return playerState.slotInventory ?? [];
}

export function getVisibleSlotItems(playerState = battleState.player) {
  const equippedItems = Object.values(playerState.specialSlots ?? {}).filter(Boolean);
  const inventoryItems = playerState.slotInventory ?? [];
  return [...equippedItems, ...inventoryItems];
}

export function getCurrentSpecialSlots(playerState = battleState.player) {
  return Object.entries(SPECIAL_SLOT_INDEXES).map(([slotType, index]) => ({
    slotType,
    index,
    item: getSpecialSlotItem(slotType, playerState),
    active: Boolean(playerState && battleState.queue[index]),
  }));
}

export function applySpecialSlotItem(itemId) {
  if (battleState.fighting) {
    return { ok: false, reason: '전투 중에는 특수 슬롯을 변경할 수 없습니다.' };
  }

  const inventory = battleState.player.slotInventory ?? [];
  const itemIndex = inventory.findIndex((item) => item.id === itemId);
  if (itemIndex < 0) {
    return { ok: false, reason: '특수 슬롯 아이템을 찾을 수 없습니다.' };
  }

  const item = inventory[itemIndex];
  const current = battleState.player.specialSlots[item.slotType];
  if (current?.id === item.id) {
    return { ok: false, reason: '이미 해당 슬롯에 적용되어 있습니다.' };
  }

  const projectedCost = getProjectedSpecialSlotCost(item);
  if (projectedCost > battleState.player.build.costLimit) {
    return { ok: false, reason: `코스트가 부족합니다. (${projectedCost}/${battleState.player.build.costLimit})` };
  }

  inventory.splice(itemIndex, 1);
  if (current) {
    inventory.push(current);
  }
  battleState.player.specialSlots[item.slotType] = item;

  return { ok: true, item, replaced: current };
}

export function getEquippedSpecialSlotCost(playerState = battleState.player) {
  return Object.values(playerState.specialSlots ?? {}).filter(Boolean).reduce((total, item) => total + (item.cost ?? 0), 0);
}

export function getProjectedSpecialSlotCost(nextItem, playerState = battleState.player) {
  const equipped = Object.values(playerState.specialSlots ?? {}).filter(Boolean);
  const equippedWithoutSameType = equipped.filter((item) => item.slotType !== nextItem.slotType);
  const queueCost = battleState.queue.reduce((total, skill) => total + (skill?.cost ?? 0), 0);
  const slotCost = equippedWithoutSameType.reduce((total, item) => total + (item.cost ?? 0), 0) + (nextItem.cost ?? 0);
  return queueCost + slotCost;
}

export function getActiveSpecialSlotModifiers(playerState = battleState.player, queue = battleState.queue) {
  const modifiers = {
    critFlat: 0,
    atkMultiplier: 0,
    defMultiplier: 0,
    magicAtkMultiplier: 0,
    maxHpMultiplier: 0,
    maxMpMultiplier: 0,
  };

  for (const [slotType, index] of Object.entries(SPECIAL_SLOT_INDEXES)) {
    const equipped = getSpecialSlotItem(slotType, playerState);
    const slottedSkill = queue[index];
    if (!equipped || !slottedSkill || slottedSkill.slotRole !== slotType) {
      continue;
    }

    Object.entries(equipped.modifiers ?? {}).forEach(([key, value]) => {
      modifiers[key] = (modifiers[key] ?? 0) + value;
    });
  }

  return modifiers;
}

export function rollSlotItemDrop() {
  const base = SLOT_ITEM_BASES[Math.floor(Math.random() * SLOT_ITEM_BASES.length)];
  return createSlotItemInstance(base);
}
