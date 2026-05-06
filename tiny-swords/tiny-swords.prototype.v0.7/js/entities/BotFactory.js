import { BOT_NAMES, BOT_TINTS, GAME } from '../config/constants.js';

export function createBot(scene, x, y, idx) {
  const spr = scene.physics.add.sprite(x, y, 'warrior_idle');
  spr.setScale(0.65);
  spr.setCollideWorldBounds(true);
  spr.play('anim_warrior_idle');
  spr.setDepth(9);
  spr.setTint(BOT_TINTS[idx]);

  const barBg = scene.add.rectangle(x, y - 32, 60, 7, 0x1a0808).setDepth(15);
  const barFg = scene.add.rectangle(x - 30, y - 32, 60, 7, 0xcc3333).setDepth(16).setOrigin(0, 0.5);
  const nameTag = scene.add.text(x, y - 42, BOT_NAMES[idx], {
    fontFamily: 'Cinzel, serif',
    fontSize: '9px',
    color: '#c9a84c',
    letterSpacing: 2,
  }).setOrigin(0.5).setDepth(16);

  const bot = {
    spr,
    barBg,
    barFg,
    nameTag,
    idx,
    hp: GAME.maxHp,
    guard: GAME.maxGuard,
    state: 'patrol',
    facing: 1,
    attackCooldown: 0,
    guardCooldown: 0,
    isGuardBroken: false,
    stateTimer: 0,
    patrolTarget: { x: x + Phaser.Math.Between(-300, 300), y: y + Phaser.Math.Between(-300, 300) },
    alive: true,
    respawnTimer: 0,
    attackLocked: false,
  };

  spr.on('animationcomplete-anim_warrior_attack', () => {
    bot.attackLocked = false;
    if (bot.alive && bot.state === 'attack') spr.play('anim_warrior_idle', true);
  });

  return bot;
}
