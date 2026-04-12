window.GameState = {
  app: null,
  stage: null,
  bgLayer: null,
  world: null,
  bg: null,
  fx: null,
  uiLayer: null,
  bgGfx: null,
  bgDecor: null,

  mouse: { x:0, y:0, down:false },
  keys: new Set(),

  player: null,
  bullets: [],
  enemies: [],
  particles: [],
  textureCache: {},

  stats: {
    maxHp: 100,
    hp: 100,
    speed: GAME_BALANCE.PLAYER.MOVE_SPEED,
    dashSpeed: GAME_BALANCE.PLAYER.DASH_SPEED,
    dashCd: 0,
    dashCdMax: GAME_BALANCE.PLAYER.DASH_CD_MAX,
    fireRate: GAME_BALANCE.PLAYER.FIRE_RATE_BASE,
    bulletSpeed: GAME_BALANCE.PLAYER.BULLET_SPEED,
    bulletDamage: GAME_BALANCE.PLAYER.BULLET_DAMAGE,
    bulletPierce: 0,
    defense: GAME_BALANCE.PLAYER.DEFENSE,
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
    xpToNext: GAME_BALANCE.XP.BASE_TO_NEXT,
    pendingLevelUps: 0
  },

  shake: 0
};
