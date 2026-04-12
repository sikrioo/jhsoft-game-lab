import { QUEUE_SIZE, DEFAULT_STARTER } from '../data/constants.js';
import { SKILLS } from '../data/skills.js';
import { battleState } from '../domain/battle-state.js';

export function loadStarterQueue() {
  DEFAULT_STARTER.forEach((id, index) => {
    const skill = SKILLS.find((entry) => entry.id === id);
    if (skill) {
      battleState.queue[index] = skill;
    }
  });

  syncBuildMana();
}

export function clearQueue() {
  battleState.queue = Array(QUEUE_SIZE).fill(null);
  battleState.cooldowns = Array(QUEUE_SIZE).fill(0);
  syncBuildMana();
}

export function removeSkillFromQueue(index) {
  if (battleState.fighting) {
    return false;
  }

  battleState.queue[index] = null;
  battleState.cooldowns[index] = 0;
  syncBuildMana();
  return true;
}

export function getQueueManaUsage() {
  return battleState.queue.reduce((total, skill) => total + (skill?.mp ?? 0), 0);
}

export function getProjectedQueueMana(skill, targetIndex, originIndex = null) {
  return battleState.queue.reduce((total, queuedSkill, currentIndex) => {
    if (currentIndex === originIndex || currentIndex === targetIndex) {
      return total;
    }

    return total + (queuedSkill?.mp ?? 0);
  }, skill.mp);
}

export function canPlaceSkill(skill, targetIndex, originIndex = null) {
  return getProjectedQueueMana(skill, targetIndex, originIndex) <= battleState.player.build.manaLimit;
}

export function placeSkillAt(skill, targetIndex, originIndex = null) {
  if (battleState.fighting) {
    return { ok: false, reason: '전투 중에는 배열을 수정할 수 없습니다.' };
  }

  if (!canPlaceSkill(skill, targetIndex, originIndex)) {
    return { ok: false, reason: `배열 마나가 부족합니다. (${getProjectedQueueMana(skill, targetIndex, originIndex)}/${battleState.player.build.manaLimit})` };
  }

  if (originIndex !== null && originIndex === targetIndex) {
    battleState.queue[targetIndex] = skill;
    battleState.cooldowns[targetIndex] = 0;
    syncBuildMana();
    return { ok: true };
  }

  if (originIndex !== null && battleState.queue[targetIndex]) {
    battleState.queue[originIndex] = battleState.queue[targetIndex];
    battleState.cooldowns[originIndex] = 0;
  }

  battleState.queue[targetIndex] = skill;
  battleState.cooldowns[targetIndex] = 0;
  syncBuildMana();
  return { ok: true };
}

export function syncBuildMana() {
  battleState.player.build.usedMana = getQueueManaUsage();
}
