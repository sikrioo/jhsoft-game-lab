import { GAME, BOT_NAMES } from '../config/constants.js';
import { addDeath, addKill } from '../core/game.js';

export class DamageSystem {
  constructor(scene, hud) {
    this.scene = scene;
    this.hud = hud;
    this.hitParticles = scene.add.particles(0, 0, 'warrior_attack', {
      frame: [1, 2],
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: 0xffaa44,
      speed: { min: 40, max: 100 },
      lifespan: 250,
      quantity: 4,
      emitting: false,
    });
    this.hitParticles.setDepth(30);
  }

  playerAttack(playerController, bots) {
    const player = playerController.sprite;
    bots.forEach((bot) => {
      if (!bot.alive) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, bot.spr.x, bot.spr.y);
      if (dist > GAME.atkRange) return;
      const angle = Phaser.Math.Angle.Between(player.x, player.y, bot.spr.x, bot.spr.y);
      const facingAngle = playerController.facing > 0 ? 0 : Math.PI;
      const angleDiff = Math.abs(Phaser.Math.Angle.ShortestBetween(
        Phaser.Math.RadToDeg(facingAngle),
        Phaser.Math.RadToDeg(angle),
      ));
      if (angleDiff <= GAME.atkAngle) {
        let dmg = GAME.atkDmg;
        const guarded = bot.state === 'guard';
        if (guarded) dmg = Math.floor(dmg * GAME.guardDamageRate);
        this.botTakeDamage(bot, dmg, angle, guarded);
      }
    });
  }

  playerShootArrow(playerController, bots, targetX, targetY) {
    if (!playerController.alive) return;

    const from = playerController.sprite;
    const angle = Phaser.Math.Angle.Between(from.x, from.y, targetX, targetY);
    const arrow = this.scene.physics.add.sprite(from.x + Math.cos(angle) * 26, from.y + Math.sin(angle) * 26, 'arrow');
    arrow.setDepth(12);
    arrow.setScale(0.8);
    arrow.setRotation(angle);
    arrow.body.setSize(18, 10, true);
    arrow.setVelocity(Math.cos(angle) * GAME.arrowSpeed, Math.sin(angle) * GAME.arrowSpeed);

    const hitOnce = new Set();
    bots.forEach((bot) => {
      this.scene.physics.add.overlap(arrow, bot.spr, () => {
        if (!arrow.active || !bot.alive || hitOnce.has(bot)) return;
        hitOnce.add(bot);
        const guarded = bot.state === 'guard';
        const dmg = guarded ? Math.floor(GAME.archerDamage * GAME.guardDamageRate) : GAME.archerDamage;
        this.botTakeDamage(bot, dmg, angle, guarded);
        arrow.destroy();
      });
    });

    this.scene.time.delayedCall(GAME.arrowLifeMs, () => {
      if (arrow.active) arrow.destroy();
    });
  }

  botAttack(bot, playerController) {
    if (!bot.alive || !playerController.alive || playerController.respawning) return;
    const botSprite = bot.spr;
    const player = playerController.sprite;
    const dist = Phaser.Math.Distance.Between(botSprite.x, botSprite.y, player.x, player.y);
    if (dist > GAME.atkRange) return;

    const hitAngle = Phaser.Math.Angle.Between(botSprite.x, botSprite.y, player.x, player.y);
    let dmg = GAME.atkDmg;
    const guarded = playerController.state === 'guard' && !playerController.isGuardBroken;
    if (guarded) {
      dmg = Math.floor(dmg * GAME.guardDamageRate);
      playerController.guard = Math.max(0, playerController.guard - 30);
      if (playerController.guard <= 0) playerController.isGuardBroken = true;
    }
    this.playerTakeDamage(playerController, dmg, hitAngle, guarded);
  }

  botTakeDamage(bot, dmg, hitAngle, guarded) {
    if (!bot.alive) return;
    bot.hp = Math.max(0, bot.hp - dmg);
    this.hitParticles.setPosition(bot.spr.x, bot.spr.y);
    this.hitParticles.explode(guarded ? 2 : 6);
    if (!guarded) {
      bot.spr.setVelocity(Math.cos(hitAngle) * GAME.knockback, Math.sin(hitAngle) * GAME.knockback);
    }
    const col = guarded ? '#3a8ab0' : dmg > 15 ? '#ff4444' : '#ffaa44';
    this.hud.showDmgFloat(guarded ? `${dmg} 🛡` : `-${dmg}`, bot.spr.x, bot.spr.y - 40, col, guarded ? '12px' : '18px');
    this.scene.tweens.add({ targets: bot.spr, alpha: 0.3, duration: 80, yoyo: true, repeat: 1 });
    if (bot.hp <= 0) this.killBot(bot);
  }

  playerTakeDamage(playerController, dmg, hitAngle, guarded) {
    if (!playerController.alive || playerController.respawning) return;
    playerController.hp = Math.max(0, playerController.hp - dmg);
    const player = playerController.sprite;
    this.hitParticles.setPosition(player.x, player.y);
    this.hitParticles.explode(guarded ? 2 : 5);
    if (!guarded) {
      player.setVelocity(Math.cos(hitAngle) * GAME.knockback * 0.7, Math.sin(hitAngle) * GAME.knockback * 0.7);
    }
    const col = guarded ? '#3a8ab0' : '#ff4444';
    this.hud.showDmgFloat(guarded ? `${dmg} 🛡` : `-${dmg}`, player.x, player.y - 50, col, guarded ? '12px' : '18px');
    if (!guarded) {
      this.scene.cameras.main.flash(120, 180, 0, 0, false);
      this.scene.cameras.main.shake(100, 0.006);
    }
    this.scene.tweens.add({ targets: player, alpha: 0.3, duration: 80, yoyo: true, repeat: 1 });
    if (playerController.hp <= 0) this.playerDie(playerController);
  }

  killBot(bot) {
    bot.alive = false;
    bot.hp = 0;
    bot.state = 'dead';
    bot.attackLocked = false;
    bot.spr.setVelocity(0, 0);
    bot.spr.setActive(false).setVisible(false);
    bot.barBg.setVisible(false);
    bot.barFg.setVisible(false);
    bot.nameTag.setVisible(false);
    addKill();
    this.hud.addKillFeed(`⚔ ${BOT_NAMES[bot.idx]} defeated`);
    bot.respawnTimer = GAME.respawnMs;
  }

  playerDie(playerController) {
    if (!playerController.alive) return;
    addDeath();
    playerController.hp = 0;
    playerController.alive = false;
    playerController.respawning = true;
    playerController.state = 'dead';
    playerController.sprite.setVelocity(0, 0);
    playerController.sprite.body.enable = false;
    this.hud.setGuardVisible(false);
    this.hud.setState('DEAD');
    this.hud.addKillFeed('✝ YOU were defeated', '#8b1a1a');
    this.scene.cameras.main.flash(300, 180, 0, 0, false);
    this.scene.tweens.killTweensOf(playerController.sprite);
    this.scene.tweens.add({
      targets: playerController.sprite,
      alpha: 0,
      angle: 90,
      duration: 600,
      onComplete: () => this.schedulePlayerRespawn(playerController),
    });
  }

  schedulePlayerRespawn(playerController) {
    this.scene.time.delayedCall(GAME.respawnMs, () => {
      const bots = this.scene.bots || [];
      let rx;
      let ry;
      do {
        rx = Phaser.Math.Between(80, GAME.mapW - 80);
        ry = Phaser.Math.Between(80, GAME.mapH - 80);
      } while (bots.some((b) => b.alive && Phaser.Math.Distance.Between(rx, ry, b.spr.x, b.spr.y) < 400));
      playerController.reset(rx, ry);
      this.scene.cameras.main.flash(200, 201, 168, 76, false);
      this.hud.addKillFeed('↑ YOU returned', '#c9a84c');
    });
  }
}
