window.GameState = {
  app: null,
  stage: null,
  world: null,
  bg: null,
  fx: null,
  uiLayer: null,

  bgGfx: null,

  player: null,
  bullets: [],
  enemies: [],
  particles: [],

  mouse: { x:0, y:0, down:false },
  keys: new Set(),

  stats: {
    maxHp: 100,
    hp: 100,
    speed: 4.6,
    dashSpeed: 14,
    dashCd: 0,
    dashCdMax: 70,
    fireRate: CONFIG.PLAYER.FIRE_RATE_BASE,
    bulletSpeed: 12,
    bulletDamage: 1,
    bulletPierce: 0,
    regen: 0,
    practice: false
  },

  score: 0,
  combo: 1,
  comboT: 0,
  wave: 1,
  waveAlive: 0,
  waveTarget: 8,
  waveState: "idle",
  spawnT: 0,
  spawnedCount: 0,
  shake: 0
};

window.Helpers = {
  clamp: (v,a,b)=>Math.max(a,Math.min(b,v)),
  lerp:  (a,b,t)=>a+(b-a)*t,
  rand:  (a,b)=>a+Math.random()*(b-a),
  randi: (a,b)=>Math.floor((a+Math.random()*(b-a+1))),
  dist2: (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }
};
