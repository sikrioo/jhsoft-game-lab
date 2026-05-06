export const ASSET_PATHS = {
  warrior: {
    idle: './assets/sprites/Warrior_Idle.png',
    run: './assets/sprites/Warrior_Run.png',
    attack: './assets/sprites/Warrior_Attack1.png',
    guard: './assets/sprites/Warrior_Guard.png',
  },
  archer: {
    idle: './assets/sprites/Archer_Idle.png',
    run: './assets/sprites/Archer_Run.png',
    shoot: './assets/sprites/Archer_Shoot.png',
    arrow: './assets/sprites/Arrow.png',
  },
};

export const CHARACTER_TYPES = {
  warrior: {
    type: 'warrior',
    label: 'WARRIOR',
    idleKey: 'warrior_idle',
    runKey: 'warrior_run',
    attackKey: 'warrior_attack',
    guardKey: 'warrior_guard',
    idleAnim: 'anim_warrior_idle',
    runAnim: 'anim_warrior_run',
    attackAnim: 'anim_warrior_attack',
    guardAnim: 'anim_warrior_guard',
    attackMode: 'melee',
    scale: 0.7,
    attackCooldown: 0.8,
  },
  archer: {
    type: 'archer',
    label: 'ARCHER',
    idleKey: 'archer_idle',
    runKey: 'archer_run',
    attackKey: 'archer_shoot',
    guardKey: 'archer_idle',
    idleAnim: 'anim_archer_idle',
    runAnim: 'anim_archer_run',
    attackAnim: 'anim_archer_shoot',
    guardAnim: 'anim_archer_idle',
    attackMode: 'ranged',
    scale: 0.7,
    attackCooldown: 0.65,
  },
};

export const GAME = {
  frame: 192,
  mapW: 2400,
  mapH: 2400,
  tile: 64,
  speed: 140,
  sprintMultiplier: 1.75,
  touchJoystickRadius: 58,
  touchSprintThreshold: 0.82,
  maxHp: 100,
  maxGuard: 100,
  atkDmg: 22,
  atkRange: 90,
  atkAngle: 70,
  archerDamage: 16,
  arrowSpeed: 470,
  arrowLifeMs: 1600,
  guardDamageRate: 0.15,
  guardDrain: 18,
  guardRegen: 22,
  knockback: 220,
  botCount: 3,
  respawnMs: 4000,
};

export const BOT_TINTS = [0xff6666, 0x66aaff, 0xaaff88];
export const BOT_NAMES = ['IRON', 'AZURE', 'VERDANT'];
