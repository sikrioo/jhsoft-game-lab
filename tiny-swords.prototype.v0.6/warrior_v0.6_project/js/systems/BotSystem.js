import { BOT_NAMES, GAME } from '../config/constants.js';

export class BotSystem {
  constructor(scene, hud, damageSystem) {
    this.scene = scene;
    this.hud = hud;
    this.damageSystem = damageSystem;
  }

  update(bot, playerController, dt) {
    if (!bot.alive) {
      bot.respawnTimer -= dt * 1000;
      if (bot.respawnTimer <= 0) this.respawn(bot, playerController);
      return;
    }

    bot.attackCooldown = Math.max(0, bot.attackCooldown - dt);
    bot.stateTimer = Math.max(0, bot.stateTimer - dt);
    this.syncStatusObjects(bot);

    if (!playerController.alive) {
      bot.state = 'patrol';
      this.patrol(bot);
      this.updateAnimation(bot);
      return;
    }

    const player = playerController.sprite;
    const dist = Phaser.Math.Distance.Between(bot.spr.x, bot.spr.y, player.x, player.y);
    const angleToPlayer = Phaser.Math.Angle.Between(bot.spr.x, bot.spr.y, player.x, player.y);

    if (bot.state !== 'guard') {
      bot.guard = Math.min(GAME.maxGuard, bot.guard + GAME.guardRegen * (bot.isGuardBroken ? 0.2 : 1) * dt);
    }

    switch (bot.state) {
      case 'patrol':
        this.patrol(bot);
        if (dist < 380) bot.state = 'chase';
        break;
      case 'chase':
        if (dist > 500) bot.state = 'patrol';
        else if (dist < GAME.atkRange * 0.9) bot.state = 'attack';
        else if (bot.hp < 30 && Math.random() < 0.005) {
          bot.state = 'retreat';
          bot.stateTimer = 1.5;
        } else this.moveToward(bot, player.x, player.y, GAME.speed * 0.8);
        break;
      case 'attack':
        this.attack(bot, playerController, dist);
        break;
      case 'guard':
        this.guard(bot, dist);
        break;
      case 'retreat': {
        const awayX = bot.spr.x - Math.cos(angleToPlayer) * GAME.speed * 0.9;
        const awayY = bot.spr.y - Math.sin(angleToPlayer) * GAME.speed * 0.9;
        this.moveToward(bot, awayX, awayY, GAME.speed * 0.9);
        if (bot.stateTimer <= 0) bot.state = 'chase';
        break;
      }
      default:
        bot.state = 'patrol';
    }

    this.updateFacing(bot);
    this.updateAnimation(bot);
  }

  patrol(bot) {
    const ptDist = Phaser.Math.Distance.Between(bot.spr.x, bot.spr.y, bot.patrolTarget.x, bot.patrolTarget.y);
    if (ptDist < 30 || bot.stateTimer <= 0) {
      bot.patrolTarget = {
        x: Phaser.Math.Clamp(bot.spr.x + Phaser.Math.Between(-400, 400), 60, GAME.mapW - 60),
        y: Phaser.Math.Clamp(bot.spr.y + Phaser.Math.Between(-400, 400), 60, GAME.mapH - 60),
      };
      bot.stateTimer = Phaser.Math.FloatBetween(2, 4);
    }
    this.moveToward(bot, bot.patrolTarget.x, bot.patrolTarget.y, GAME.speed * 0.55);
  }

  attack(bot, playerController, dist) {
    bot.spr.setVelocity(0, 0);
    if (dist > GAME.atkRange * 1.3) {
      bot.state = 'chase';
      bot.attackLocked = false;
      return;
    }

    if (playerController.state === 'attack' && bot.guard > 20 && !bot.isGuardBroken && Math.random() < 0.04) {
      bot.state = 'guard';
      bot.stateTimer = 0.6;
      bot.attackLocked = false;
      bot.spr.play('anim_guard', true);
      return;
    }

    if (bot.attackCooldown <= 0 && !bot.attackLocked) {
      bot.attackLocked = true;
      bot.spr.play('anim_attack', true);
      bot.attackCooldown = Phaser.Math.FloatBetween(1.0, 1.8);

      this.scene.time.delayedCall(180, () => {
        if (!bot.alive || bot.state !== 'attack' || !playerController.alive) return;
        this.damageSystem.botAttack(bot, playerController);
      });
    }
  }

  guard(bot, dist) {
    bot.spr.setVelocity(0, 0);
    bot.guard = Math.max(0, bot.guard - GAME.guardDrain * 0.6 * this.scene.game.loop.delta / 1000);
    if (bot.stateTimer <= 0 || bot.guard <= 0) {
      if (bot.guard <= 0) bot.isGuardBroken = true;
      bot.state = dist < GAME.atkRange * 1.3 ? 'attack' : 'chase';
      bot.spr.play('anim_idle', true);
    }
  }

  moveToward(bot, tx, ty, speed) {
    const angle = Phaser.Math.Angle.Between(bot.spr.x, bot.spr.y, tx, ty);
    bot.spr.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  updateFacing(bot) {
    const vx = bot.spr.body.velocity.x;
    if (vx < -5) {
      bot.spr.setFlipX(true);
      bot.facing = -1;
    }
    if (vx > 5) {
      bot.spr.setFlipX(false);
      bot.facing = 1;
    }
  }

  updateAnimation(bot) {
    if (bot.attackLocked || bot.state === 'guard' || bot.state === 'attack') return;
    const speed = Math.abs(bot.spr.body.velocity.x) + Math.abs(bot.spr.body.velocity.y);
    if (speed > 10) bot.spr.play('anim_run', true);
    else bot.spr.play('anim_idle', true);
  }

  syncStatusObjects(bot) {
    bot.barBg.setPosition(bot.spr.x, bot.spr.y - 32);
    bot.barFg.setPosition(bot.spr.x - 30, bot.spr.y - 32);
    bot.barFg.width = 60 * (bot.hp / GAME.maxHp);
    bot.nameTag.setPosition(bot.spr.x, bot.spr.y - 42);
  }

  respawn(bot, playerController) {
    bot.alive = true;
    bot.hp = GAME.maxHp;
    bot.guard = GAME.maxGuard;
    bot.state = 'patrol';
    bot.isGuardBroken = false;
    bot.attackCooldown = 1.0;
    bot.attackLocked = false;

    let rx;
    let ry;
    do {
      rx = Phaser.Math.Between(80, GAME.mapW - 80);
      ry = Phaser.Math.Between(80, GAME.mapH - 80);
    } while (playerController.alive && Phaser.Math.Distance.Between(rx, ry, playerController.sprite.x, playerController.sprite.y) < 500);

    bot.spr.setPosition(rx, ry).setActive(true).setVisible(true).setAlpha(1);
    bot.barBg.setVisible(true);
    bot.barFg.setVisible(true);
    bot.nameTag.setVisible(true);
    bot.spr.play('anim_idle', true);
    this.hud.addKillFeed(`↑ ${BOT_NAMES[bot.idx]} returned`, '#7a9a5a');
  }
}
