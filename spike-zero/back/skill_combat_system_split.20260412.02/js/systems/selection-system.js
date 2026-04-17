import { DEFAULT_STARTER, QUEUE_SIZE, SLOT_DEFINITIONS } from '../data/constants.js';
import { SKILLS } from '../data/skills.js';
import { battleState } from '../domain/battle-state.js';
import { recalculatePlayerStats } from './character-system.js';
import { getEquippedSpecialSlotCost } from './slot-system.js';

export function loadStarterQueue() {
  clearQueue();
  DEFAULT_STARTER.forEach((id, index) => {
    if (!id) {
      return;
    }
    const skill = SKILLS.find((entry) => entry.id === id);
    if (skill && index < QUEUE_SIZE) {
      battleState.queue[index] = skill;
    }
  });

  syncBuildCost();
  recalculatePlayerStats();
}

export function clearQueue() {
  battleState.queue = Array(QUEUE_SIZE).fill(null);
  battleState.cooldowns = Array(QUEUE_SIZE).fill(0);
  syncBuildCost();
  recalculatePlayerStats();
}

export function removeSkillFromQueue(index) {
  if (battleState.fighting) {
    return false;
  }

  battleState.queue[index] = null;
  battleState.cooldowns[index] = 0;
  syncBuildCost();
  recalculatePlayerStats();
  return true;
}

export function getSlotDefinition(index) {
  return SLOT_DEFINITIONS[index] ?? null;
}

export function getQueueCostUsage() {
  return battleState.queue.reduce((total, skill) => total + (skill?.cost ?? 0), 0) + getEquippedSpecialSlotCost();
}

export function getProjectedQueueCost(skill, targetIndex, originIndex = null) {
  return battleState.queue.reduce((total, queuedSkill, currentIndex) => {
    if (currentIndex === originIndex || currentIndex === targetIndex) {
      return total;
    }

    return total + (queuedSkill?.cost ?? 0);
  }, skill.cost ?? 0);
}

export function canPlaceSkill(skill, targetIndex, originIndex = null) {
  const slot = getSlotDefinition(targetIndex);
  if (!slot) {
    return false;
  }

  if (!isSkillAllowedInSlot(skill, slot)) {
    return false;
  }

  return getProjectedQueueCost(skill, targetIndex, originIndex) <= battleState.player.build.costLimit;
}

export function placeSkillAt(skill, targetIndex, originIndex = null) {
  if (battleState.fighting) {
    return { ok: false, reason: '전투 중에는 슬롯을 수정할 수 없습니다.' };
  }

  const slot = getSlotDefinition(targetIndex);
  if (!slot) {
    return { ok: false, reason: '유효하지 않은 슬롯입니다.' };
  }

  if (!isSkillAllowedInSlot(skill, slot)) {
    return { ok: false, reason: `${slot.label} 슬롯에는 ${getAllowedRoleLabel(slot.row)} 스킬만 배치할 수 있습니다.` };
  }

  if (!canPlaceSkill(skill, targetIndex, originIndex)) {
    return {
      ok: false,
      reason: `코스트가 부족합니다. (${getProjectedQueueCost(skill, targetIndex, originIndex)}/${battleState.player.build.costLimit})`,
    };
  }

  if (originIndex !== null && originIndex === targetIndex) {
    battleState.queue[targetIndex] = skill;
    battleState.cooldowns[targetIndex] = 0;
    syncBuildCost();
    recalculatePlayerStats();
    return { ok: true };
  }

  if (originIndex !== null && battleState.queue[targetIndex]) {
    battleState.queue[originIndex] = battleState.queue[targetIndex];
    battleState.cooldowns[originIndex] = 0;
  }

  battleState.queue[targetIndex] = skill;
  battleState.cooldowns[targetIndex] = 0;
  syncBuildCost();
  recalculatePlayerStats();
  return { ok: true };
}

export function syncBuildCost() {
  battleState.player.build.usedCost = getQueueCostUsage();
}

function isSkillAllowedInSlot(skill, slot) {
  if (slot.heroSlot) {
    return skill.slotRole === slot.row && skill.heroOnly === true;
  }

  if (skill.heroOnly) {
    return false;
  }

  return skill.slotRole === slot.row;
}

function getAllowedRoleLabel(row) {
  return {
    attack: '공격',
    defense: '방어',
    magic: '마법',
    passive: '패시브',
  }[row] ?? row;
}
