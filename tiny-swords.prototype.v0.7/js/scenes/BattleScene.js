import { ASSET_PATHS, CHARACTER_TYPES, GAME } from '../config/constants.js';
import { createTransparentSpriteSheet } from '../systems/TextureSystem.js';
import { buildMap } from '../systems/MapBuilder.js';
import { Hud } from '../ui/Hud.js';
import { PlayerController } from '../entities/PlayerController.js';
import { createBot } from '../entities/BotFactory.js';
import { DamageSystem } from '../systems/DamageSystem.js';
import { BotSystem } from '../systems/BotSystem.js';
import { SlashSystem } from '../systems/SlashSystem.js';
import { InputSystem } from '../systems/InputSystem.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene');
    this.bots = [];
  }

  preload() {
    this.load.image('warrior_idle_raw', ASSET_PATHS.warrior.idle);
    this.load.image('warrior_run_raw', ASSET_PATHS.warrior.run);
    this.load.image('warrior_attack_raw', ASSET_PATHS.warrior.attack);
    this.load.image('warrior_guard_raw', ASSET_PATHS.warrior.guard);

    this.load.image('archer_idle_raw', ASSET_PATHS.archer.idle);
    this.load.image('archer_run_raw', ASSET_PATHS.archer.run);
    this.load.image('archer_shoot_raw', ASSET_PATHS.archer.shoot);
    this.load.image('arrow', ASSET_PATHS.archer.arrow);

    this.load.on('loaderror', (file) => {
      console.error('Asset load failed:', file.key, file.src);
    });
  }

  create() {
    this.selectedCharacterType = window.WARRIOR_IO_SELECTED_CHARACTER || 'warrior';
    if (!CHARACTER_TYPES[this.selectedCharacterType]) this.selectedCharacterType = 'warrior';

    this.physics.world.setBounds(0, 0, GAME.mapW, GAME.mapH);
    this.createTextures();
    buildMap(this);
    this.createAnimations();

    this.hud = new Hud(this);
    this.inputSystem = new InputSystem(this);
    this.player = new PlayerController(this, this.hud, this.inputSystem, this.selectedCharacterType);
    this.slashSystem = new SlashSystem(this);
    this.damageSystem = new DamageSystem(this, this.hud);
    this.botSystem = new BotSystem(this, this.hud, this.damageSystem);

    this.createBots();
    this.cameras.main.startFollow(this.player.sprite, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, GAME.mapW, GAME.mapH);
  }

  update(_time, delta) {
    const dt = delta / 1000;
    this.slashSystem.clear();
    this.player.update(dt, this.bots, this.damageSystem, this.slashSystem);
    this.bots.forEach((bot) => this.botSystem.update(bot, this.player, dt));
    this.hud.update(this.player, this.bots);
  }

  createTextures() {
    createTransparentSpriteSheet(this, 'warrior_idle_raw', 'warrior_idle', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'warrior_run_raw', 'warrior_run', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'warrior_attack_raw', 'warrior_attack', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'warrior_guard_raw', 'warrior_guard', GAME.frame, GAME.frame);

    createTransparentSpriteSheet(this, 'archer_idle_raw', 'archer_idle', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'archer_run_raw', 'archer_run', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'archer_shoot_raw', 'archer_shoot', GAME.frame, GAME.frame);
  }

  createAnimations() {
    const anims = this.anims;
    if (!anims.exists('anim_warrior_idle')) anims.create({ key: 'anim_warrior_idle', frames: anims.generateFrameNumbers('warrior_idle', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    if (!anims.exists('anim_warrior_run')) anims.create({ key: 'anim_warrior_run', frames: anims.generateFrameNumbers('warrior_run', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    if (!anims.exists('anim_warrior_attack')) anims.create({ key: 'anim_warrior_attack', frames: anims.generateFrameNumbers('warrior_attack', { start: 0, end: 3 }), frameRate: 12, repeat: 0 });
    if (!anims.exists('anim_warrior_guard')) anims.create({ key: 'anim_warrior_guard', frames: anims.generateFrameNumbers('warrior_guard', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });

    if (!anims.exists('anim_archer_idle')) anims.create({ key: 'anim_archer_idle', frames: anims.generateFrameNumbers('archer_idle', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
    if (!anims.exists('anim_archer_run')) anims.create({ key: 'anim_archer_run', frames: anims.generateFrameNumbers('archer_run', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
    if (!anims.exists('anim_archer_shoot')) anims.create({ key: 'anim_archer_shoot', frames: anims.generateFrameNumbers('archer_shoot', { start: 0, end: 7 }), frameRate: 14, repeat: 0 });
  }

  createBots() {
    this.bots = [];
    const spawns = [
      { x: GAME.mapW * 0.25, y: GAME.mapH * 0.25 },
      { x: GAME.mapW * 0.75, y: GAME.mapH * 0.25 },
      { x: GAME.mapW * 0.5, y: GAME.mapH * 0.75 },
    ];
    for (let i = 0; i < GAME.botCount; i += 1) {
      this.bots.push(createBot(this, spawns[i].x, spawns[i].y, i));
    }
  }
}
