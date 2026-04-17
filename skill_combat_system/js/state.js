import { DEFAULT_PLAYER, QUEUE_SIZE } from './data.js';

function createPlayerState() {
  return {
    hp: DEFAULT_PLAYER.hp,
    maxHp: DEFAULT_PLAYER.maxHp,
    mp: DEFAULT_PLAYER.mp,
    maxMp: DEFAULT_PLAYER.maxMp,
    effects: {},
  };
}

export const state = {
  queue: Array(QUEUE_SIZE).fill(null),
  cdState: Array(QUEUE_SIZE).fill(0),
  battleSpeed: 1,
  score: 0,
  waveIdx: 0,
  player: createPlayerState(),
  enemy: null,
  fighting: false,
  battleTimeoutId: null,
  turnBarIntervalId: null,
  drag: null,
};

export function clearTimers() {
  if (state.battleTimeoutId) {
    clearTimeout(state.battleTimeoutId);
    state.battleTimeoutId = null;
  }

  if (state.turnBarIntervalId) {
    clearInterval(state.turnBarIntervalId);
    state.turnBarIntervalId = null;
  }
}

export function resetBattleState() {
  state.queue = Array(QUEUE_SIZE).fill(null);
  state.cdState = Array(QUEUE_SIZE).fill(0);
  state.battleSpeed = 1;
  state.score = 0;
  state.waveIdx = 0;
  state.player = createPlayerState();
  state.enemy = null;
  state.fighting = false;
  state.drag = null;
  clearTimers();
}
