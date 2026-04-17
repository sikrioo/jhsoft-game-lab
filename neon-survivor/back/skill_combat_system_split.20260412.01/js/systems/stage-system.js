import { ENEMIES } from '../data/enemies.js';
import { STAGES } from '../data/stages.js';

export function getCurrentStage() {
  return STAGES[0];
}

export function getEnemyDefinitionForWave(waveIndex) {
  const stage = getCurrentStage();
  const enemyId = stage.waves[waveIndex];
  return ENEMIES.find((enemy) => enemy.id === enemyId);
}
