export const ASSET_PATHS = {
  idle: './assets/sprites/Warrior_Idle.png',
  run: './assets/sprites/Warrior_Run.png',
  attack: './assets/sprites/Warrior_Attack1.png',
  guard: './assets/sprites/Warrior_Guard.png',
};

export const GAME = {
  frame: 192,
  mapW: 2400,
  mapH: 2400,
  tile: 64,
  speed: 140,
  sprintMultiplier: 1.75,
  maxHp: 100,
  maxGuard: 100,
  atkDmg: 22,
  atkRange: 90,
  atkAngle: 70,
  guardDamageRate: 0.15,
  guardDrain: 18,
  guardRegen: 22,
  knockback: 220,
  botCount: 3,
  respawnMs: 4000,
};

export const BOT_TINTS = [0xff6666, 0x66aaff, 0xaaff88];
export const BOT_NAMES = ['IRON', 'AZURE', 'VERDANT'];
