import { ASSET_PATHS, GAME } from '../config/constants.js';
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
    this.load.image('idle_raw', ASSET_PATHS.idle);
    this.load.image('run_raw', ASSET_PATHS.run);
    this.load.image('attack_raw', ASSET_PATHS.attack);
    this.load.image('guard_raw', ASSET_PATHS.guard);

    this.load.on('loaderror', (file) => {
      console.error('Asset load failed:', file.key, file.src);
    });
  }

  create() {
    this.physics.world.setBounds(0, 0, GAME.mapW, GAME.mapH);
    this.createTextures();
    buildMap(this);
    this.createAnimations();

    this.hud = new Hud(this);
    this.inputSystem = new InputSystem(this);
    this.player = new PlayerController(this, this.hud, this.inputSystem);
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
    createTransparentSpriteSheet(this, 'idle_raw', 'idle', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'run_raw', 'run', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'attack_raw', 'attack', GAME.frame, GAME.frame);
    createTransparentSpriteSheet(this, 'guard_raw', 'guard', GAME.frame, GAME.frame);
  }

  createAnimations() {
    const anims = this.anims;
    if (!anims.exists('anim_idle')) anims.create({ key: 'anim_idle', frames: anims.generateFrameNumbers('idle', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    if (!anims.exists('anim_run')) anims.create({ key: 'anim_run', frames: anims.generateFrameNumbers('run', { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
    if (!anims.exists('anim_attack')) anims.create({ key: 'anim_attack', frames: anims.generateFrameNumbers('attack', { start: 0, end: 3 }), frameRate: 12, repeat: 0 });
    if (!anims.exists('anim_guard')) anims.create({ key: 'anim_guard', frames: anims.generateFrameNumbers('guard', { start: 0, end: 5 }), frameRate: 8, repeat: -1 });
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
