import { PASSIVE_SLOT_INDEX } from '../data/constants.js';
import { SKILLS, TREE_DEFINITIONS, TREE_HERO_IDS, TREE_NODE_IDS } from '../data/skills.js';
import { battleState } from '../domain/battle-state.js';

export const MAX_SKILL_LEVEL = 3;

export function findSkillById(skillId) {
  return SKILLS.find((skill) => skill.id === skillId) ?? null;
}

export function getSkillLevel(skillId) {
  return battleState.player.skillBook?.[skillId]?.level ?? 0;
}

export function isSkillUnlocked(skillId) {
  return Boolean(battleState.player.skillBook?.[skillId]?.unlocked);
}

export function getUnlockedSkills() {
  return SKILLS.filter((skill) => isSkillUnlocked(skill.id));
}

export function getSkillPreview(skill, levelOverride = null) {
  const level = Math.max(1, levelOverride ?? getSkillLevel(skill.id));

  return {
    level,
    damage: scaleRange(skill.dmg, level, 0.16),
    heal: scaleRange(skill.heal, level, 0.16),
    manaGain: scaleValue(skill.mpgain, level, 0.14),
    hotTick: scaleValue(skill.hotick, level, 0.14),
    effect: scaleEffect(skill.effect, level),
    passiveBonuses: scaleStats(skill.passiveBonuses, level),
  };
}

export function getSkillUpgradeChoices(count = 3) {
  const unlockedUpgrades = getUnlockedSkills()
    .filter((skill) => skill.stage !== 'hero' && getSkillLevel(skill.id) < getMaxSkillLevel(skill));
  const newTreeUnlocks = SKILLS.filter((skill) => skill.unlock?.type === 'tree_unlock' && !isSkillUnlocked(skill.id));
  const eligible = [...unlockedUpgrades, ...newTreeUnlocks];
  return shuffle(eligible).slice(0, count);
}

export function upgradeSkillLevel(skillId) {
  const skill = findSkillById(skillId);
  if (!skill) {
    return null;
  }

  if (!isSkillUnlocked(skillId)) {
    if (skill.unlock?.type === 'tree_unlock') {
      unlockSkill(skillId);
      return {
        skill,
        level: getSkillLevel(skillId),
        unlocks: { unlockedSkillIds: [], heroTreeId: null },
      };
    }
    return null;
  }

  const currentLevel = getSkillLevel(skillId);
  const maxLevel = getMaxSkillLevel(skill);
  if (currentLevel >= maxLevel) {
    return null;
  }

  battleState.player.skillBook[skillId].level += 1;
  const newLevel = battleState.player.skillBook[skillId].level;
  const unlocks = resolveUnlocks(skill, newLevel);

  return {
    skill,
    level: newLevel,
    unlocks,
  };
}

export function chooseHeroSkill(heroSkillId) {
  const skill = findSkillById(heroSkillId);
  if (!skill || skill.stage !== 'hero') {
    return { ok: false, reason: '영웅 스킬을 찾을 수 없습니다.' };
  }

  const treeId = skill.treeId;
  if (battleState.player.heroSelections?.[treeId]) {
    return { ok: false, reason: '이미 해당 트리의 영웅 스킬을 선택했습니다.' };
  }

  const finalNodeId = TREE_NODE_IDS[treeId]?.at(-1);
  if (!finalNodeId || getSkillLevel(finalNodeId) < 3) {
    return { ok: false, reason: '아직 영웅 스킬을 선택할 수 없습니다.' };
  }

  battleState.player.heroSelections[treeId] = heroSkillId;
  battleState.player.skillBook[heroSkillId] = { level: 1, unlocked: true };
  return { ok: true, skill };
}

export function getHeroChoices(treeId) {
  return (TREE_HERO_IDS[treeId] ?? []).map(findSkillById).filter(Boolean);
}

export function getEquippedPassiveSkill() {
  return battleState.queue[PASSIVE_SLOT_INDEX] ?? null;
}

export function getPassiveBonuses() {
  const passiveSkill = getEquippedPassiveSkill();
  if (!passiveSkill) {
    return {};
  }

  return getSkillPreview(passiveSkill).passiveBonuses ?? {};
}

export function getSkillTreeById(treeId) {
  return TREE_DEFINITIONS.find((tree) => tree.id === treeId) ?? null;
}

function resolveUnlocks(skill, level) {
  const unlockedSkillIds = [];
  const heroTreeId = null;

  if (level < 3 || skill.stage === 'hero') {
    return { unlockedSkillIds, heroTreeId };
  }

  const treeNodes = TREE_NODE_IDS[skill.treeId] ?? [];
  const nodeIndex = treeNodes.indexOf(skill.id);
  const nextNodeId = treeNodes[nodeIndex + 1];

  if (nextNodeId) {
    unlockSkill(nextNodeId);
    unlockedSkillIds.push(nextNodeId);
    return { unlockedSkillIds, heroTreeId };
  }

  if (TREE_HERO_IDS[skill.treeId]?.length > 0 && !battleState.player.heroSelections?.[skill.treeId]) {
    return { unlockedSkillIds, heroTreeId: skill.treeId };
  }

  return { unlockedSkillIds, heroTreeId };
}

function unlockSkill(skillId) {
  if (!battleState.player.skillBook[skillId]) {
    battleState.player.skillBook[skillId] = { level: 1, unlocked: true };
    return;
  }

  battleState.player.skillBook[skillId].unlocked = true;
  if (battleState.player.skillBook[skillId].level <= 0) {
    battleState.player.skillBook[skillId].level = 1;
  }
}

function getMaxSkillLevel(skill) {
  return skill.maxLevel ?? (skill.stage === 'hero' ? 1 : MAX_SKILL_LEVEL);
}

function scaleRange(range, level, step) {
  if (!Array.isArray(range)) {
    return null;
  }

  const multiplier = 1 + (level - 1) * step;
  return range.map((value) => Math.max(0, Math.round(value * multiplier)));
}

function scaleValue(value, level, step) {
  if (typeof value !== 'number') {
    return 0;
  }

  return Math.max(0, Math.round(value * (1 + (level - 1) * step)));
}

function scaleEffect(effect, level) {
  if (!effect) {
    return null;
  }

  const durationBonus = Math.floor((level - 1) / 2);
  const scaled = {};

  Object.entries(effect).forEach(([key, value]) => {
    if (key === 'chance') {
      scaled[key] = Math.min(1, value + (level - 1) * 0.04);
      return;
    }

    scaled[key] = typeof value === 'number' ? value + durationBonus : value;
  });

  return scaled;
}

function scaleStats(stats, level) {
  if (!stats) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(stats).map(([key, value]) => {
      const multiplier = typeof value === 'number' && value < 1 ? 0.12 : 0.16;
      return [key, Math.round((value * (1 + (level - 1) * multiplier)) * 1000) / 1000];
    }),
  );
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
