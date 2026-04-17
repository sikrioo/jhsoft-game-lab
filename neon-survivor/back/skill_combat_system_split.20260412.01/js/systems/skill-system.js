import { SKILLS } from '../data/skills.js';
import { battleState } from '../domain/battle-state.js';

export const MAX_SKILL_LEVEL = 5;

export function getSkillLevel(skillId) {
  return battleState.player.skillBook?.[skillId]?.level ?? 1;
}

export function getSkillPreview(skill, levelOverride = null) {
  const level = levelOverride ?? getSkillLevel(skill.id);

  return {
    level,
    damage: scaleRange(skill.dmg, level),
    heal: scaleRange(skill.heal, level),
    manaGain: scaleValue(skill.mpgain, level),
    hotTick: scaleValue(skill.hotick, level),
    effect: scaleEffect(skill.effect, level),
  };
}

export function getSkillUpgradeChoices(count = 3) {
  const eligible = SKILLS.filter((skill) => getSkillLevel(skill.id) < MAX_SKILL_LEVEL);
  return shuffle(eligible).slice(0, count);
}

export function upgradeSkillLevel(skillId) {
  if (!battleState.player.skillBook[skillId]) {
    battleState.player.skillBook[skillId] = { level: 1 };
  }

  const currentLevel = battleState.player.skillBook[skillId].level;
  if (currentLevel >= MAX_SKILL_LEVEL) {
    return null;
  }

  battleState.player.skillBook[skillId].level += 1;
  return battleState.player.skillBook[skillId].level;
}

function scaleRange(range, level) {
  if (!Array.isArray(range)) {
    return null;
  }

  const multiplier = 1 + (level - 1) * 0.22;
  return range.map((value) => Math.max(0, Math.round(value * multiplier)));
}

function scaleValue(value, level) {
  if (typeof value !== 'number') {
    return 0;
  }

  const multiplier = 1 + (level - 1) * 0.18;
  return Math.max(0, Math.round(value * multiplier));
}

function scaleEffect(effect, level) {
  if (!effect) {
    return null;
  }

  const durationBonus = Math.floor((level - 1) / 2);
  const scaled = {};

  Object.entries(effect).forEach(([key, value]) => {
    if (key === 'chance') {
      scaled[key] = value;
      return;
    }

    scaled[key] = typeof value === 'number' ? value + durationBonus : value;
  });

  return scaled;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
