import { QUEUE_SIZE } from '../data/constants.js';
import { createPlayerState } from './player.js';

export const battleState = {
  queue: Array(QUEUE_SIZE).fill(null),
  cooldowns: Array(QUEUE_SIZE).fill(0),
  speed: 1,
  score: 0,
  stageIndex: 0,
  waveIndex: 0,
  player: createPlayerState(),
  enemy: null,
  fighting: false,
  turn: {
    playerMeter: 0,
    enemyMeter: 0,
    playerSlotCursor: 0,
    acting: false,
  },
  drag: null,
  timers: {
    atbIntervalId: null,
  },
  battleProgress: {
    expEarned: 0,
  },
  overlays: {
    levelUp: {
      open: false,
      pending: 0,
      choices: [],
    },
  },
};

export function resetBattleState() {
  battleState.queue = Array(QUEUE_SIZE).fill(null);
  battleState.cooldowns = Array(QUEUE_SIZE).fill(0);
  battleState.speed = 1;
  battleState.score = 0;
  battleState.stageIndex = 0;
  battleState.waveIndex = 0;
  battleState.player = createPlayerState();
  battleState.enemy = null;
  battleState.fighting = false;
  battleState.turn = {
    playerMeter: 0,
    enemyMeter: 0,
    playerSlotCursor: 0,
    acting: false,
  };
  battleState.drag = null;
  battleState.battleProgress = {
    expEarned: 0,
  };
  battleState.overlays = {
    levelUp: {
      open: false,
      pending: 0,
      choices: [],
    },
  };
  clearBattleTimers();
}

export function clearBattleTimers() {
  if (battleState.timers.atbIntervalId) {
    clearInterval(battleState.timers.atbIntervalId);
    battleState.timers.atbIntervalId = null;
  }
}
