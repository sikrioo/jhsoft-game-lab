import { ENEMIES } from '../data/enemies.js';
import { STAGES } from '../data/stages.js';
import { battleState } from '../domain/battle-state.js';

export function getCurrentStage() {
  return STAGES[battleState.stageIndex] ?? STAGES[0];
}

export function getStageByIndex(stageIndex) {
  return STAGES[stageIndex] ?? null;
}

export function getTotalStages() {
  return STAGES.length;
}

export function getEnemyDefinitionForWave(waveIndex, stageIndex = battleState.stageIndex) {
  const stage = getStageByIndex(stageIndex);
  if (!stage) {
    return null;
  }
  const enemyId = stage.waves[waveIndex];
  return ENEMIES.find((enemy) => enemy.id === enemyId) ?? null;
}

export function getStageWaveCount(stageIndex = battleState.stageIndex) {
  return getStageByIndex(stageIndex)?.waves.length ?? 0;
}

export function hasNextEncounter() {
  return Boolean(getNextEncounterContext());
}

export function getNextEncounterContext() {
  const currentStage = getCurrentStage();
  if (!currentStage) {
    return null;
  }

  if (battleState.waveIndex + 1 < currentStage.waves.length) {
    return {
      stageIndex: battleState.stageIndex,
      waveIndex: battleState.waveIndex + 1,
      stage: currentStage,
    };
  }

  const nextStage = getStageByIndex(battleState.stageIndex + 1);
  if (!nextStage) {
    return null;
  }

  return {
    stageIndex: battleState.stageIndex + 1,
    waveIndex: 0,
    stage: nextStage,
  };
}
