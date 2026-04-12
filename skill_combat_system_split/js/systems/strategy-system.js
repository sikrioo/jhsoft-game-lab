import { SLOT_DEFINITIONS, STRATEGIES, TACTIC_OPTIONS } from '../data/constants.js';
import { battleState } from '../domain/battle-state.js';

export function setPlayerStrategy(strategyId) {
  if (!STRATEGIES[strategyId]) {
    return { ok: false, reason: '알 수 없는 전략입니다.' };
  }

  battleState.player.strategy = strategyId;
  return { ok: true };
}

export function getPlayerStrategy() {
  return STRATEGIES[battleState.player.strategy] ?? STRATEGIES.balanced;
}

export function togglePlayerTactic(tacticId) {
  if (!TACTIC_OPTIONS[tacticId]) {
    return { ok: false, reason: '알 수 없는 전술 옵션입니다.' };
  }

  const tactics = new Set(battleState.player.tactics ?? []);
  if (tactics.has(tacticId)) {
    tactics.delete(tacticId);
    battleState.player.tactics = [...tactics];
    return { ok: true, active: false };
  }

  if (tactics.size >= 2) {
    return { ok: false, reason: '전술 옵션은 최대 2개까지 선택할 수 있습니다.' };
  }

  tactics.add(tacticId);
  battleState.player.tactics = [...tactics];
  return { ok: true, active: true };
}

export function choosePlayerSkill() {
  const columnOrder = Math.random() < 0.5 ? [1, 2, 3, 4] : [2, 1, 3, 4];
  battleState.turn.columnBias = columnOrder[0];

  const candidates = SLOT_DEFINITIONS
    .filter((slot) => slot.row !== 'passive')
    .map((slot) => ({ slot, skill: battleState.queue[slot.index] }))
    .filter(({ slot, skill }) => skill && canUseSkill(skill, slot.index))
    .map(({ slot, skill }) => ({
      slot,
      skill,
      score: getStrategyScore(skill, slot, columnOrder),
    }))
    .sort((left, right) => right.score - left.score);

  return candidates[0] ?? null;
}

function canUseSkill(skill, slotIndex) {
  return battleState.cooldowns[slotIndex] <= 0
    && battleState.player.resources.mp >= skill.mp
    && battleState.turn.playerMeter >= (skill.atbCost ?? 20);
}

function getStrategyScore(skill, slot, columnOrder) {
  const strategy = battleState.player.strategy;
  const playerHpRatio = battleState.player.resources.hp / Math.max(1, battleState.player.stats.maxHp);
  const enemyHpRatio = battleState.enemy ? battleState.enemy.curHp / Math.max(1, battleState.enemy.hp) : 1;

  let score = 0;
  const tags = new Set(skill.tags ?? []);

  if (strategy === 'aggressive') {
    if (tags.has('attack')) score += 42;
    if (tags.has('magic')) score += 28;
    if (tags.has('control')) score += 14;
    if (tags.has('heal')) score += playerHpRatio < 0.35 ? 34 : 6;
    if (skill.slotRole === 'defense') score += playerHpRatio < 0.28 ? 30 : 4;
  } else if (strategy === 'defensive') {
    if (tags.has('heal')) score += playerHpRatio < 0.7 ? 46 : 20;
    if (skill.slotRole === 'defense') score += playerHpRatio < 0.6 ? 40 : 18;
    if (tags.has('attack')) score += enemyHpRatio < 0.25 ? 22 : 8;
    if (tags.has('control')) score += 16;
  } else {
    if (tags.has('heal')) score += playerHpRatio < 0.45 ? 40 : 12;
    if (skill.slotRole === 'defense') score += playerHpRatio < 0.38 ? 30 : 14;
    if (tags.has('attack')) score += 24;
    if (tags.has('magic')) score += 18;
    if (tags.has('control')) score += 12;
  }

  if (enemyHpRatio < 0.25 && tags.has('attack')) {
    score += 16;
  }

  if (skill.mp === 0) {
    score += 4;
  }

  if (skill.heroOnly) {
    score += 11;
  }

  if (battleState.player.resources.mp < skill.mp * 1.5) {
    score -= Math.max(0, skill.mp - 6);
  }

  const tactics = new Set(battleState.player.tactics ?? []);
  if (tactics.has('atb_saver')) {
    score += Math.max(0, 16 - (skill.atbCost ?? 20)) * 0.6;
  }
  if (tactics.has('mana_saver')) {
    score += Math.max(0, 12 - skill.mp) * 0.5;
  }
  if (tactics.has('expensive_first') && battleState.turn.playerMeter > 60) {
    score += (skill.atbCost ?? 20) * 0.15 + skill.cost * 0.1;
  }

  if (skill.target === 'self' && skill.effect) {
    const alreadyActive = Object.keys(skill.effect).some((key) => key !== 'chance' && (battleState.player.effects[key] ?? 0) > 0);
    if (alreadyActive) {
      score -= 18;
    }
  }

  if (skill.slotRole === slot.row && slot.special) {
    score += 6;
  }
  if (slot.heroSlot && skill.heroOnly) {
    score += 8;
  }

  const columnRank = columnOrder.indexOf(slot.col);
  score += columnRank === 0 ? 10 : columnRank === 1 ? 6 : columnRank === 2 ? 3 : 0;
  score += Math.random() * 0.35;

  return score;
}
