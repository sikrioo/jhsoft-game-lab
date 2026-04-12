window.GameState = {
  app: null,
  stage: null,
  world: null,
  bg: null,
  fx: null,
  uiLayer: null,
  bgGfx: null,

  mouse: { x:0, y:0, down:false },
  keys: new Set(),

  player: null,
  bullets: [],
  enemies: [],
  particles: [],

  stats: {
    maxHp: 100,
    hp: 100,
    speed: CONFIG.PLAYER.MOVE_SPEED,
    dashSpeed: CONFIG.PLAYER.DASH_SPEED,
    dashCd: 0,
    dashCdMax: CONFIG.PLAYER.DASH_CD_MAX,
    fireRate: CONFIG.PLAYER.FIRE_RATE_BASE,
    bulletSpeed: CONFIG.PLAYER.BULLET_SPEED,
    bulletDamage: CONFIG.PLAYER.BULLET_DAMAGE,
    bulletPierce: 0,
    regen: 0,
    practice: false
  },

  progression: {
    score: 0,
    combo: 1,
    comboT: 0,
    wave: 1,
    waveAlive: 0,
    waveTarget: 8,
    waveState: "idle",
    spawnT: 0,
    spawnedCount: 0,

    level: 1,
    xp: 0,
    xpToNext: CONFIG.XP.BASE_TO_NEXT,
    pendingLevelUps: 0
  },

  shake: 0
};
