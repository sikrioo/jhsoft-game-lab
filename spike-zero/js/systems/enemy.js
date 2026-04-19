window.EnemySystem = (() => {
  function getTargetForEnemy(enemy){
    const S = GameState;
    let bestDecoy = null;
    let bestDist = Infinity;
    for (const decoy of S.decoys){
      const d2 = Helpers.dist2(enemy.x, enemy.y, decoy.x, decoy.y);
      if (d2 < bestDist){
        bestDist = d2;
        bestDecoy = decoy;
      }
    }
    if (bestDecoy) return { x: bestDecoy.x, y: bestDecoy.y, r: bestDecoy.r, decoy: bestDecoy };
    if (S.activeSkillState.stealthT > 0){
      return {
        x: S.activeSkillState.stealthLastKnownX || S.player.spr.x,
        y: S.activeSkillState.stealthLastKnownY || S.player.spr.y,
        r: S.player.r,
        hidden: true
      };
    }
    return { x: S.player.spr.x, y: S.player.spr.y, r: S.player.r, player: S.player };
  }

  function getTierByWaveAndRoll(){
    const wave = GameState.progression.wave;
    const stage = Math.max(1, GameState.progression.stage || 1);
    const roll = Math.random();

    if (stage >= 3 && wave >= 10 && roll > 0.985) return "boss";
    if (stage >= 3 && wave >= 6  && roll > 0.94)  return "midboss";
    if (stage >= 3 && wave >= 6  && roll > 0.89)  return "turret_laser";
    if (stage >= 3 && wave >= 5  && roll > 0.84)  return "turret_sniper";
    if (stage >= 3 && wave >= 7  && roll > 0.88)  return "tank";

    if (stage >= 2 && wave >= 4  && roll > 0.80)  return "turret_mg";
    if (stage >= 2 && wave >= 5  && roll > 0.82)  return "rusher";
    if (stage >= 2 && wave >= 4  && roll > 0.74)  return "flanker";

    if (wave >= 3  && roll > 0.66)  return "elite";
    if (wave >= 2  && roll > 0.58)  return "bomber";
    if (wave >= 2  && roll > 0.48)  return "gunner";
    return "normal";
  }

  function drawBomberSignal(enemy, alpha=0.24){
    if (!enemy.signalSpr || !enemy.enemyState) return;
    const g = enemy.signalSpr;
    const radius = enemy.enemyState.explosionRadius;
    g.clear();
    g.lineStyle(2, 0xff7b39, Math.min(0.85, alpha + 0.25));
    g.beginFill(0xff6a3d, alpha);
    g.drawCircle(0, 0, radius);
    g.endFill();
  }

  function makeEnemyBullet(x, y, ang, damage){
    const spr = Effects.makeBulletSprite(x, y, ang, 0xffcc59);
    spr.scale.set(0.95, 0.95);
    GameState.fx.addChild(spr);
    return {
      spr,
      x, y,
      vx: Math.cos(ang) * 5.8,
      vy: Math.sin(ang) * 5.8,
      r: 8,
      dmg: damage,
      life: 90,
      color: 0xffcc59
    };
  }

  function tryShootGunner(enemy, target){
    const state = enemy.enemyState;
    if (!state || state.fireCd > 0) return;
    const ang = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const bullet = makeEnemyBullet(
      enemy.x + Math.cos(ang) * (enemy.r + 8),
      enemy.y + Math.sin(ang) * (enemy.r + 8),
      ang,
      enemy.dmg
    );
    GameState.enemyBullets.push(bullet);
    state.fireCd = state.fireInterval;
    Effects.emitParticle(enemy.x + Math.cos(ang) * enemy.r, enemy.y + Math.sin(ang) * enemy.r, 0xffcc59, 5, 0.55);
  }

  function updateGunnerEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const body = enemy.bodySpr;
    const toPlayerX = target.x - enemy.x;
    const toPlayerY = target.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    let moveDx = toPlayerX / dist;
    let moveDy = toPlayerY / dist;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    if (dist < state.retreatDistance){
      moveDx *= -1;
      moveDy *= -1;
      moveSpeed *= 0.92;
      body.tint = 0xffe7a6;
    } else if (dist < state.preferredDistance){
      moveDx = 0;
      moveDy = 0;
      moveSpeed = 0;
      body.tint = 0xffffff;
    } else {
      body.tint = 0xfff1c9;
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(toPlayerY, toPlayerX);
    enemy.hpText.rotation = -enemy.spr.rotation;

    if (dist <= state.attackDistance){
      tryShootGunner(enemy, target);
    }
  }

  function makeTurretVisual(enemy, tierKey, tier) {
    const root = new PIXI.Container();

    const aura = new PIXI.Graphics();
    aura.beginFill(tier.fillColor, tierKey === "turret_laser" ? 0.12 : 0.1);
    aura.drawRoundedRect(-tier.radius - 8, -tier.radius - 8, (tier.radius + 8) * 2, (tier.radius + 8) * 2, 12);
    aura.endFill();
    aura.filters = [new PIXI.filters.BlurFilter(tierKey === "turret_laser" ? 10 : 8)];

    const frame = new PIXI.Graphics();
    frame.beginFill(0x0a0d18, 0.98);
    frame.lineStyle(2.5, tier.lineColor, 0.95);
    frame.drawRoundedRect(-tier.radius, -tier.radius, tier.radius * 2, tier.radius * 2, 9);
    frame.endFill();

    const plating = new PIXI.Graphics();
    plating.beginFill(tier.fillColor, tierKey === "turret_laser" ? 0.12 : 0.16);
    plating.drawRoundedRect(-tier.radius + 4, -tier.radius + 4, tier.radius * 2 - 8, tier.radius * 2 - 8, 7);
    plating.endFill();

    const barrel = new PIXI.Graphics();
    barrel.beginFill(tier.lineColor, 0.95);
    if (tierKey === "turret_laser") {
      barrel.drawRoundedRect(4, -5, tier.radius + 12, 10, 4);
      barrel.beginFill(0xffffff, 0.52);
      barrel.drawRoundedRect(10, -2, tier.radius + 2, 4, 2);
      barrel.endFill();
    } else if (tierKey === "turret_sniper") {
      barrel.drawRoundedRect(2, -4, tier.radius + 18, 8, 4);
      barrel.drawRoundedRect(10, -2, tier.radius + 12, 4, 2);
      barrel.beginFill(0xffffff, 0.44);
      barrel.drawRoundedRect(tier.radius + 10, -1, 10, 2, 1);
      barrel.endFill();
    } else {
      barrel.drawRoundedRect(4, -4, tier.radius + 8, 8, 4);
      barrel.drawRoundedRect(8, -10, tier.radius + 2, 5, 2);
      barrel.drawRoundedRect(8, 5, tier.radius + 2, 5, 2);
    }
    barrel.endFill();

    const coreRing = new PIXI.Graphics();
    coreRing.lineStyle(2, 0xffffff, 0.25);
    coreRing.drawCircle(0, 0, tierKey === "turret_laser" ? tier.radius * 0.48 : tierKey === "turret_sniper" ? tier.radius * 0.36 : tier.radius * 0.42);

    const core = new PIXI.Graphics();
    core.beginFill(tier.fillColor, tierKey === "turret_laser" ? 0.72 : tierKey === "turret_sniper" ? 0.7 : 0.66);
    core.drawCircle(0, 0, tierKey === "turret_laser" ? tier.radius * 0.34 : tierKey === "turret_sniper" ? tier.radius * 0.22 : tier.radius * 0.28);
    core.endFill();

    root.addChild(aura, frame, plating, barrel, coreRing, core);
    enemy.bodySpr.addChild(root);
    return { root, aura, frame, plating, barrel, coreRing, core };
  }

  function updateTurretVisuals(enemy, target, dt) {
    const visuals = enemy.visuals;
    const state = enemy.enemyState;
    if (!visuals || !state) return;

    const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    visuals.root.rotation = aim;

    const fixedMul = state.mode === "fixed" ? 1 : 0;
    const chargeMul = state.mode === "charge" ? 1 : 0;
    const firingMul = state.mode === "firing" ? 1 : 0;
    const pulse = 1 + Math.sin(performance.now() * (enemy.tier === "turret_laser" ? 0.015 : 0.02)) * (enemy.tier === "turret_laser" ? 0.05 : 0.04);

    visuals.root.scale.set((state.mode === "move" ? 1.02 : 1) * pulse);
    visuals.aura.alpha = enemy.tier === "turret_laser"
      ? 0.12 + chargeMul * 0.1 + firingMul * 0.08
      : enemy.tier === "turret_sniper"
        ? 0.1 + chargeMul * 0.08 + firingMul * 0.14
        : 0.1 + fixedMul * 0.08;
    visuals.core.scale.set(1 + chargeMul * 0.26 + firingMul * (enemy.tier === "turret_sniper" ? 0.28 : 0.18));
    visuals.core.alpha = enemy.tier === "turret_laser"
      ? 0.72 + chargeMul * 0.22 + firingMul * 0.14
      : enemy.tier === "turret_sniper"
        ? 0.68 + chargeMul * 0.18 + firingMul * 0.2
        : 0.66 + fixedMul * 0.2;
    visuals.barrel.alpha = state.mode === "move" ? 0.88 : 1;
    visuals.frame.tint = state.mode === "move"
      ? 0xffffff
      : enemy.tier === "turret_laser" ? 0xffd8f2 : enemy.tier === "turret_sniper" ? 0xf2fbff : 0xfff0bf;
    visuals.plating.tint = state.mode === "move"
      ? 0xffffff
      : enemy.tier === "turret_laser" ? 0xffd1fb : enemy.tier === "turret_sniper" ? 0xd8f3ff : 0xfff3b2;
  }

  function fireTurretMachinegun(enemy, target, accuracy = 0.08, count = 1, speed = 6.2, spread = 0.12) {
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * spread;
      const ang = baseAngle + offset + Helpers.rand(-accuracy, accuracy);
      const bullet = makeEnemyBullet(
        enemy.x + Math.cos(ang) * (enemy.r + 10),
        enemy.y + Math.sin(ang) * (enemy.r + 10),
        ang,
        enemy.dmg
      );
      bullet.vx = Math.cos(ang) * speed;
      bullet.vy = Math.sin(ang) * speed;
      bullet.color = 0xffcf74;
      bullet.spr.tint = 0xffcf74;
      GameState.enemyBullets.push(bullet);
    }
    Effects.emitParticle(enemy.x + Math.cos(baseAngle) * enemy.r, enemy.y + Math.sin(baseAngle) * enemy.r, 0xffcf74, 7 + count, 0.7);
  }

  function clearTurretLaserFx(enemy) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    if (state.laserSpr.parent) state.laserSpr.parent.removeChild(state.laserSpr);
    state.laserSpr = null;
  }

  function fireTurretLaser(enemy, target, options = {}) {
    const S = GameState;
    const state = enemy.enemyState;
    const color = options.color || 0xff84da;
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const length = options.length || 420;
    const width = options.width || 9;
    const life = options.life || 12;

    clearTurretLaserFx(enemy);

    const laser = new PIXI.Graphics();
    S.fx.addChild(laser);
    state.laserSpr = laser;
    state.laserLife = life;
    state.laserAngle = angle;
    state.laserLength = length;
    state.laserWidth = width;
    state.laserDamage = options.damage || enemy.dmg;
    state.laserDamageCd = 0;

    const endX = enemy.x + Math.cos(angle) * length;
    const endY = enemy.y + Math.sin(angle) * length;
    Effects.emitPulse(enemy.x, enemy.y, color, width * 5.5, 10);
    Effects.emitParticle(enemy.x, enemy.y, color, enemy.tier === "turret_laser" ? 14 : 8, enemy.tier === "turret_laser" ? 1.2 : 0.8);
    Effects.emitLineTelegraph(enemy.x, enemy.y, endX, endY, color, 6, width + 2);
  }

  function redrawTurretLaser(enemy) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    const g = state.laserSpr;
    const alpha = Math.max(0, Math.min(1, state.laserLife / Math.max(1, state.laserMaxLife || state.laserLife)));
    const cos = Math.cos(state.laserAngle);
    const sin = Math.sin(state.laserAngle);
    const endX = cos * state.laserLength;
    const endY = sin * state.laserLength;
    g.x = enemy.x;
    g.y = enemy.y;
    g.clear();
    g.lineStyle(state.laserWidth + 8, 0xff84da, 0.08 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(state.laserWidth + 3, 0xff84da, 0.22 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(state.laserWidth, 0xff84da, 0.92 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
    g.lineStyle(Math.max(2, state.laserWidth * 0.4), 0xffffff, 0.85 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
  }

  function applyTurretLaserDamage(enemy, dt) {
    const state = enemy.enemyState;
    if (!state || !state.laserSpr) return;
    state.laserDamageCd -= dt;
    if (state.laserDamageCd > 0) return;
    state.laserDamageCd = enemy.tier === "turret_laser" ? 3 : 5;

    const player = GameState.player;
    const cos = Math.cos(state.laserAngle);
    const sin = Math.sin(state.laserAngle);
    const rx = player.spr.x - enemy.x;
    const ry = player.spr.y - enemy.y;
    const along = rx * cos + ry * sin;
    const side = Math.abs(rx * -sin + ry * cos);
    if (along < 0 || along > state.laserLength || side > state.laserWidth + player.r) return;

    hitPlayerWithEnemyDamage(state.laserDamage, 0xff84da, cos, sin, {
      invFrames: enemy.tier === "turret_laser" ? 16 : 14,
      push: enemy.tier === "turret_laser" ? 5.4 : 4.2,
      particleCount: enemy.tier === "turret_laser" ? 14 : 10,
      particlePower: enemy.tier === "turret_laser" ? 1.05 : 0.82,
      pulseRadius: enemy.tier === "turret_laser" ? 34 : 24,
      pulseLife: 8
    });
  }

  function updateTurretMachinegunEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveDx = dx / dist;
    const moveDy = dy / dist;
    const moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    state.anchorCd -= dt;
    state.stateTime += dt;

    if (state.mode === "move") {
      if (dist > state.preferredDistance + 36) {
        enemy.x += moveDx * moveSpeed * dt;
        enemy.y += moveDy * moveSpeed * dt;
      } else if (dist < state.preferredDistance - 28) {
        enemy.x -= moveDx * moveSpeed * 0.68 * dt;
        enemy.y -= moveDy * moveSpeed * 0.68 * dt;
      }

      if (dist <= state.attackDistance && state.fireCd <= 0) {
        fireTurretMachinegun(enemy, target, 0.24, 1, 5.6, 0);
        state.fireCd = 42;
      }

      if (dist <= state.lockDistance && state.anchorCd <= 0 && state.stateTime >= state.minMoveTime) {
        state.mode = "lock";
        state.stateTime = 0;
      }
    } else if (state.mode === "lock") {
      if (state.stateTime === 0 || state.stateTime <= dt) {
        Effects.emitPulse(enemy.x, enemy.y, 0xffd879, 42, 10);
      }
      if (state.stateTime >= state.lockTime) {
        state.mode = "fixed";
        state.stateTime = 0;
        state.fireCd = 8;
      }
    } else if (state.mode === "fixed") {
      if (state.fireCd <= 0) {
        fireTurretMachinegun(enemy, target, 0.04, 3, 7.2, 0.11);
        state.fireCd = 10;
      }
      if (state.stateTime >= state.fixedTime) {
        state.mode = "move";
        state.stateTime = 0;
        state.anchorCd = 72;
      }
    }

    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    updateTurretVisuals(enemy, target, dt);
  }

  function updateTurretLaserEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveDx = dx / dist;
    const moveDy = dy / dist;
    const moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    state.anchorCd -= dt;
    state.stateTime += dt;

    if (state.mode === "move") {
      if (dist > state.preferredDistance + 42) {
        enemy.x += moveDx * moveSpeed * dt;
        enemy.y += moveDy * moveSpeed * dt;
      } else if (dist < state.preferredDistance - 36) {
        enemy.x -= moveDx * moveSpeed * 0.64 * dt;
        enemy.y -= moveDy * moveSpeed * 0.64 * dt;
      }

      if (dist <= state.shortAttackDistance && state.fireCd <= 0) {
        const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        Effects.emitLineTelegraph(enemy.x, enemy.y, enemy.x + Math.cos(aim) * 170, enemy.y + Math.sin(aim) * 170, 0xffa6e8, 12, 5);
        fireTurretLaser(enemy, target, { length: 180, width: 5, life: 8, damage: Math.max(6, enemy.dmg - 4), color: 0xffa6e8 });
        state.laserMaxLife = 8;
        state.fireCd = 96;
      }

      if (dist <= state.lockDistance && state.anchorCd <= 0 && state.stateTime >= state.minMoveTime) {
        state.mode = "charge";
        state.stateTime = 0;
        const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        Effects.emitLineTelegraph(enemy.x, enemy.y, enemy.x + Math.cos(aim) * state.longAttackDistance, enemy.y + Math.sin(aim) * state.longAttackDistance, 0xff84da, state.chargeTime, 7);
      }
    } else if (state.mode === "charge") {
      if (state.stateTime >= state.chargeTime) {
        state.mode = "firing";
        state.stateTime = 0;
        fireTurretLaser(enemy, target, {
          length: state.longAttackDistance,
          width: 11,
          life: state.fireTime,
          damage: enemy.dmg,
          color: 0xff84da
        });
        state.laserMaxLife = state.fireTime;
      }
    } else if (state.mode === "firing") {
      if (state.stateTime >= state.fireTime) {
        clearTurretLaserFx(enemy);
        state.mode = "move";
        state.stateTime = 0;
        state.anchorCd = 110;
        state.fireCd = 78;
      }
    }

    if (state.laserSpr) {
      state.laserLife -= dt;
      redrawTurretLaser(enemy);
      applyTurretLaserDamage(enemy, dt);
      if (state.laserLife <= 0) clearTurretLaserFx(enemy);
    }

    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    updateTurretVisuals(enemy, target, dt);
  }

  function fireTurretSniperShot(enemy, target, options = {}) {
    const color = options.color || 0xbfe9ff;
    const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const bullet = makeEnemyBullet(
      enemy.x + Math.cos(angle) * (enemy.r + 12),
      enemy.y + Math.sin(angle) * (enemy.r + 12),
      angle,
      options.damage || enemy.dmg
    );
    bullet.vx = Math.cos(angle) * (options.speed || 9.8);
    bullet.vy = Math.sin(angle) * (options.speed || 9.8);
    bullet.r = options.radius || 10;
    bullet.life = options.life || 124;
    bullet.color = color;
    bullet.spr.tint = color;
    bullet.spr.scale.set(options.scaleX || 1.3, options.scaleY || 1.85);
    GameState.enemyBullets.push(bullet);

    const endX = enemy.x + Math.cos(angle) * 240;
    const endY = enemy.y + Math.sin(angle) * 240;
    Effects.emitLineTelegraph(enemy.x, enemy.y, endX, endY, color, 6, 4);
    Effects.emitPulse(enemy.x, enemy.y, color, 46, 10);
    Effects.emitParticle(enemy.x, enemy.y, color, 12, 1.05);
    Effects.emitParticle(enemy.x + Math.cos(angle) * (enemy.r + 18), enemy.y + Math.sin(angle) * (enemy.r + 18), 0xffffff, 8, 0.75);
  }

  function updateTurretSniperEnemy(enemy, target, dt) {
    const state = enemy.enemyState;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const moveDx = dx / dist;
    const moveDy = dy / dist;
    const moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.fireCd -= dt;
    state.anchorCd -= dt;
    state.stateTime += dt;

    if (state.mode === "move") {
      if (dist < state.preferredDistance - 36) {
        enemy.x -= moveDx * moveSpeed * 0.9 * dt;
        enemy.y -= moveDy * moveSpeed * 0.9 * dt;
      } else if (dist > state.preferredDistance + 42) {
        enemy.x += moveDx * moveSpeed * 0.46 * dt;
        enemy.y += moveDy * moveSpeed * 0.46 * dt;
      }

      if (dist <= state.skirmishDistance && state.fireCd <= 0) {
        fireTurretSniperShot(enemy, target, {
          damage: Math.max(8, enemy.dmg - 7),
          speed: 7.4,
          radius: 8.5,
          scaleX: 1.1,
          scaleY: 1.55,
          color: 0xd6f2ff
        });
        state.fireCd = 92;
      }

      if (dist <= state.lockDistance && state.anchorCd <= 0 && state.stateTime >= state.minMoveTime) {
        state.mode = "charge";
        state.stateTime = 0;
      }
    } else if (state.mode === "charge") {
      const ratio = Math.min(1, state.stateTime / state.chargeTime);
      const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
      const length = state.shotDistance;
      const telegraphWidth = 11 - ratio * 8;
      Effects.emitLineTelegraph(
        enemy.x,
        enemy.y,
        enemy.x + Math.cos(aim) * length,
        enemy.y + Math.sin(aim) * length,
        0xbfe9ff,
        3,
        Math.max(2, telegraphWidth)
      );
      if (state.stateTime >= state.chargeTime) {
        state.mode = "firing";
        state.stateTime = 0;
        fireTurretSniperShot(enemy, target, {
          damage: enemy.dmg,
          speed: 11.8,
          radius: 11,
          scaleX: 1.45,
          scaleY: 2.2,
          life: 136,
          color: 0xbfe9ff
        });
      }
    } else if (state.mode === "firing") {
      if (state.stateTime <= dt) {
        Effects.emitPulse(enemy.x, enemy.y, 0xf4fbff, 56, 8);
      }
      if (state.stateTime >= state.recoveryTime) {
        state.mode = "move";
        state.stateTime = 0;
        state.anchorCd = 116;
        state.fireCd = 88;
      }
    }

    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.hpText.rotation = 0;
    updateTurretVisuals(enemy, target, dt);
  }

  function detonateBomber(enemy){
    const S = GameState;
    const P = S.progression;
    const state = enemy.enemyState;
    const explosionRadius = state.explosionRadius;
    const explosionRadiusSq = explosionRadius * explosionRadius;

    if (enemy.signalSpr) enemy.signalSpr.visible = false;
    Effects.emitPulse(enemy.x, enemy.y, 0xff8740, explosionRadius, 16);
    Effects.emitParticle(enemy.x, enemy.y, 0xff8740, 18, 1.35);
    Effects.emitParticle(enemy.x, enemy.y, 0xffe0a1, 12, 0.9);

    const target = getTargetForEnemy(enemy);
    if (target.decoy && Helpers.dist2(enemy.x, enemy.y, target.x, target.y) <= explosionRadiusSq){
      target.decoy.hp -= 2;
      Effects.emitParticle(target.x, target.y, 0xffc479, 12, 1.0);
    } else if (Helpers.dist2(enemy.x, enemy.y, S.player.spr.x, S.player.spr.y) <= explosionRadiusSq){
      const ang = Math.atan2(S.player.spr.y - enemy.y, S.player.spr.x - enemy.x);
      hitPlayerWithEnemyDamage(enemy.dmg, 0xff8740, Math.cos(ang), Math.sin(ang), {
        invFrames: 26,
        push: 7.5,
        particleCount: 18,
        particlePower: 1.25,
        pulseRadius: 42,
        pulseLife: 10
      });
      S.shake = Math.min(24, S.shake + 8);
    }

    S.uiLayer.removeChild(enemy.spr);
    const enemyIndex = S.enemies.indexOf(enemy);
    if (enemyIndex >= 0) S.enemies.splice(enemyIndex, 1);
    P.waveAlive--;
  }

  function updateBomberEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const body = enemy.bodySpr;
    const signal = enemy.signalSpr;
    const toPlayerX = target.x - enemy.x;
    const toPlayerY = target.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    let moveDx = toPlayerX / dist;
    let moveDy = toPlayerY / dist;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    if (state.state === "approach"){
      signal.visible = false;
      body.tint = 0xffffff;
      if (dist <= state.triggerDistance){
        state.state = "arming";
        state.timer = state.armTime;
        signal.visible = true;
        drawBomberSignal(enemy, 0.22);
      }
    } else if (state.state === "arming"){
      state.timer -= dt;
      moveSpeed = 0;
      signal.visible = true;
      signal.alpha = 0.12 + (Math.sin((state.timer / state.armTime) * Math.PI * 6) * 0.10 + 0.18);
      drawBomberSignal(enemy, signal.alpha);
      body.tint = state.timer % 6 < 3 ? 0xffb37b : 0xffffff;
      if (state.timer <= 0){
        detonateBomber(enemy);
        return;
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    enemy.hpText.rotation = -enemy.spr.rotation;
  }

  function hitPlayerWithEnemyDamage(damage, color, hitDx, hitDy, options={}){
    const S = GameState;
    const p = S.player;
    if (p.inv > 0 || S.stats.practice) return false;

    let remainingDamage = Math.max(1, Math.ceil(damage - S.stats.defense));
    if (S.activeSkillState.boostMitigationT > 0){
      remainingDamage = Math.max(1, Math.ceil(remainingDamage * S.activeSkillState.boostMitigationMul));
    }
    if (S.stats.shield > 0){
      const absorbed = Math.min(S.stats.shield, remainingDamage);
      S.stats.shield -= absorbed;
      remainingDamage -= absorbed;
      S.stats.shieldRegenDelay = S.stats.shieldRegenDelayMax;
      Effects.emitParticle(p.spr.x, p.spr.y, 0x7fe7ff, 16, 1.15);
    }
    if (remainingDamage > 0) S.stats.hp -= remainingDamage;

    p.inv = options.invFrames || 24;
    p.vx += hitDx * (options.push || 3.5);
    p.vy += hitDy * (options.push || 3.5);
    if (window.SoundSystem) {
      SoundSystem.play("player_hit", { playbackRate: 0.96 + Helpers.rand(-0.05, 0.04) });
      SoundSystem.play("armor_hit", { playbackRate: 0.9 + Helpers.rand(-0.04, 0.04), volume: 0.14, cooldownMs: 0 });
    }
    Effects.emitParticle(p.spr.x, p.spr.y, color, options.particleCount || 12, options.particlePower || 0.9);
    Effects.emitParticle(p.spr.x, p.spr.y, 0xff4d4d, Math.max(10, Math.round((options.particleCount || 12) * 0.8)), (options.particlePower || 0.9) * 1.05);
    Effects.emitPulse(p.spr.x, p.spr.y, 0xff5a5a, options.impactRadius || 34, options.impactLife || 8);
    S.shake = Math.min(24, S.shake + (options.impactShake || 4));
    if (options.pulseRadius) Effects.emitPulse(p.spr.x, p.spr.y, color, options.pulseRadius, options.pulseLife || 10);
    if (S.stats.hp <= 0){
      S.stats.hp = 0;
      Boot.gameOver();
    }
    return true;
  }

  function getHitCircles(enemy){
    if (enemy && typeof enemy.getHitCircles === "function") return enemy.getHitCircles();
    return [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
  }

  function beginFlankerOrbit(enemy, target){
    const state = enemy.enemyState;
    const baseAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const side = state.side || (Math.random() < 0.5 ? -1 : 1);
    state.side = side;
    state.state = "flank";
    state.timer = Helpers.randi(28, 52);
    state.orbitAngle = baseAngle + side * state.flankAngle;
  }

  function updateFlankerEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const body = enemy.bodySpr;
    const toPlayerX = target.x - enemy.x;
    const toPlayerY = target.y - enemy.y;
    const dist = Math.hypot(toPlayerX, toPlayerY) || 1;
    const chaseDx = toPlayerX / dist;
    const chaseDy = toPlayerY / dist;
    let moveDx = chaseDx;
    let moveDy = chaseDy;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    state.timer -= dt;

    if (state.state === "flank"){
      if (state.timer <= 0 || dist < state.commitDistance){
        state.state = "commit";
        state.timer = Helpers.randi(20, 34);
      } else {
        const targetAngle = Math.atan2(target.y - enemy.y, target.x - enemy.x) + state.side * state.flankAngle;
        state.orbitAngle = Helpers.lerp(state.orbitAngle, targetAngle, 0.1);
        const goalX = target.x + Math.cos(state.orbitAngle) * state.orbitRadius;
        const goalY = target.y + Math.sin(state.orbitAngle) * state.orbitRadius;
        const gx = goalX - enemy.x;
        const gy = goalY - enemy.y;
        const gd = Math.hypot(gx, gy) || 1;
        moveDx = gx / gd;
        moveDy = gy / gd;
        moveSpeed *= 1.12;
      }
      body.tint = 0xb9fff0;
    } else if (state.state === "commit"){
      moveSpeed *= 1.22;
      body.tint = 0xffffff;
      if (dist < state.closeDistance || state.timer <= 0){
        state.state = "pressure";
        state.timer = Helpers.randi(20, 34);
      }
    } else if (state.state === "pressure"){
      moveSpeed *= 0.96;
      body.tint = 0x9dffe8;
      if (dist > state.resetDistance || state.timer <= 0){
        state.side *= -1;
        beginFlankerOrbit(enemy, target);
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    enemy.hpText.rotation = -enemy.spr.rotation;
  }

  function drawRusherSignal(enemy, alpha=0.32){
    if (!enemy.signalSpr || !enemy.enemyState) return;
    const g = enemy.signalSpr;
    const state = enemy.enemyState;
    const width = enemy.r * 1.35;
    const length = state.dashDistance;
    g.clear();
    g.beginFill(0xff4d4d, alpha);
    g.drawRoundedRect(0, -width * 0.42, length, width * 0.84, width * 0.24);
    g.endFill();
    g.beginFill(0xff9b9b, alpha * 0.9);
    g.drawPolygon([
      length, -width * 0.58,
      length + width * 0.95, 0,
      length, width * 0.58
    ]);
    g.endFill();
  }

  function beginRusherTelegraph(enemy, target){
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const d = Math.hypot(dx, dy) || 1;
    enemy.enemyState.state = "telegraph";
    enemy.enemyState.timer = enemy.enemyState.telegraphTime;
    enemy.enemyState.dashDx = dx / d;
    enemy.enemyState.dashDy = dy / d;
    enemy.enemyState.cooldown = enemy.enemyState.postDashCooldown;
    enemy.signalSpr.visible = true;
    drawRusherSignal(enemy, 0.28);
  }

  function updateRusherEnemy(enemy, target, dt){
    const state = enemy.enemyState;
    const signal = enemy.signalSpr;
    const body = enemy.bodySpr;
    const targetDx = target.x - enemy.x;
    const targetDy = target.y - enemy.y;
    const dist = Math.hypot(targetDx, targetDy) || 1;
    const chaseDx = targetDx / dist;
    const chaseDy = targetDy / dist;
    let moveDx = chaseDx;
    let moveDy = chaseDy;
    let moveSpeed = enemy.sp * (enemy.slowMul || 1);

    if (state.cooldown > 0) state.cooldown -= dt;

    if (state.state === "chase"){
      if (dist < state.triggerDistance && state.cooldown <= 0){
        beginRusherTelegraph(enemy, target);
      }
      signal.visible = false;
      body.tint = 0xffffff;
    } else if (state.state === "telegraph"){
      state.timer -= dt;
      moveSpeed *= 0.18;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      signal.visible = true;
      signal.alpha = 0.18 + (Math.sin((state.timer / state.telegraphTime) * Math.PI * 5) * 0.12 + 0.18);
      drawRusherSignal(enemy, signal.alpha);
      body.tint = state.timer % 8 < 4 ? 0xff8c8c : 0xffffff;
      if (state.timer <= 0){
        state.state = "dash";
        state.timer = state.dashTime;
        signal.visible = false;
        body.tint = 0xff7c7c;
        Effects.emitParticle(enemy.x, enemy.y, 0xff6b6b, 10, 0.95);
      }
    } else if (state.state === "dash"){
      state.timer -= dt;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      moveSpeed = state.dashSpeed * (enemy.slowMul || 1);
      body.tint = 0xff8f8f;
      if ((performance.now() | 0) % 3 === 0){
        const t = Effects.makeTrailSprite(enemy.x - moveDx * 10, enemy.y - moveDy * 10, 0xff6262, 0.28, 0.22);
        GameState.fx.addChild(t);
        GameState.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:10 });
      }
      if (state.timer <= 0){
        state.state = "recovery";
        state.timer = state.recoveryTime;
      }
    } else if (state.state === "recovery"){
      state.timer -= dt;
      moveDx = state.dashDx;
      moveDy = state.dashDy;
      moveSpeed = enemy.sp * 0.22;
      body.tint = 0xffd0d0;
      if (state.timer <= 0){
        state.state = "chase";
        body.tint = 0xffffff;
      }
    }

    enemy.x += moveDx * moveSpeed * dt;
    enemy.y += moveDy * moveSpeed * dt;
    enemy.spr.x = enemy.x;
    enemy.spr.y = enemy.y;
    enemy.spr.rotation = Math.atan2(moveDy, moveDx);
    enemy.hpText.rotation = -enemy.spr.rotation;
    if (signal){
      signal.rotation = 0;
    }
  }

  function makeEnemy(tierKey="normal"){
    const S = GameState;
    const tier = ENEMY_TIERS[tierKey];
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;

    const side = Helpers.randi(0,3);
    let x = 0;
    let y = 0;
    const pad = 60;
    if (side === 0){ x = -pad; y = Helpers.rand(0, h); }
    if (side === 1){ x = w + pad; y = Helpers.rand(0, h); }
    if (side === 2){ x = Helpers.rand(0, w); y = -pad; }
    if (side === 3){ x = Helpers.rand(0, w); y = h + pad; }

    const r = tier.radius;
    const hits = Helpers.randi(tier.hitsMin, tier.hitsMax);
    const c = new PIXI.Container();
    const signal = (tierKey === "rusher" || tierKey === "bomber") ? new PIXI.Graphics() : null;
    const isTurret = tierKey === "turret_mg" || tierKey === "turret_laser" || tierKey === "turret_sniper";
    const body = isTurret ? new PIXI.Container() : Effects.makeEnemySprite(tierKey, tier, 0, 0);

    const hpText = new PIXI.Text(String(hits), {
      fontFamily: "Arial",
      fontSize: tier.numberFontSize,
      fontWeight: "900",
      fill: 0xffffff,
      align: "center",
      stroke: 0x000000,
      strokeThickness: tierKey === "boss" ? 5 : 4
    });
    hpText.anchor.set(0.5);

    if (signal){
      signal.visible = false;
      signal.alpha = 0;
      c.addChild(signal);
    }
    c.addChild(body, hpText);
    c.x = x;
    c.y = y;
    S.uiLayer.addChild(c);

    const enemy = {
      type: "enemy",
      tier: tierKey,
      spr: c,
      x, y, r,
      hp: hits,
      maxHp: hits,
      sp: Helpers.rand(tier.moveSpeedMin, tier.moveSpeedMax),
      dmg: tier.damage,
      xp: tier.xpBase,
      hitT: 0,
      slowT: 0,
      slowMul: 1,
      hpText,
      bodySpr: body,
      signalSpr: signal,
      scoreBase: tier.scoreBase,
      glowColor: tier.glowColor
    };

    if (isTurret) {
      enemy.visuals = makeTurretVisual(enemy, tierKey, tier);
      enemy.destroyVisuals = () => {
        clearTurretLaserFx(enemy);
        if (enemy.spr && enemy.spr.parent) enemy.spr.parent.removeChild(enemy.spr);
      };
      enemy.takeDamage = (damage) => {
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hitT = 6;
        enemy.hpText.text = String(Math.max(0, Math.floor(enemy.hp)));
        const state = enemy.enemyState;
        if (state && (state.mode === "fixed" || state.mode === "charge" || state.mode === "firing")) {
          state.mode = "move";
          state.stateTime = 0;
          state.anchorCd = tierKey === "turret_laser" ? 96 : 54;
          clearTurretLaserFx(enemy);
        }
        return true;
      };
    }

    if (tierKey === "flanker"){
      enemy.enemyState = {
        state: "flank",
        timer: Helpers.randi(28, 52),
        side: Math.random() < 0.5 ? -1 : 1,
        flankAngle: Helpers.rand(0.7, 1.0),
        orbitAngle: 0,
        orbitRadius: Helpers.rand(110, 180),
        commitDistance: 128,
        closeDistance: 88,
        resetDistance: 188
      };
      beginFlankerOrbit(enemy, { x:S.player.spr.x, y:S.player.spr.y });
    }
    if (tierKey === "gunner"){
      enemy.enemyState = {
        state: "gunner",
        fireCd: Helpers.randi(10, 30),
        fireInterval: 30,
        preferredDistance: 260,
        retreatDistance: 150,
        attackDistance: 420
      };
    }
    if (tierKey === "turret_mg"){
      enemy.enemyState = {
        mode: "move",
        stateTime: 0,
        fireCd: Helpers.randi(10, 26),
        anchorCd: Helpers.randi(34, 72),
        preferredDistance: 220,
        attackDistance: 360,
        lockDistance: 250,
        minMoveTime: 32,
        lockTime: 16,
        fixedTime: 72
      };
    }
    if (tierKey === "turret_laser"){
      enemy.enemyState = {
        mode: "move",
        stateTime: 0,
        fireCd: Helpers.randi(28, 52),
        anchorCd: Helpers.randi(64, 110),
        preferredDistance: 270,
        shortAttackDistance: 300,
        longAttackDistance: 520,
        lockDistance: 320,
        minMoveTime: 40,
        chargeTime: 28,
        fireTime: 14,
        laserSpr: null,
        laserLife: 0,
        laserMaxLife: 0,
        laserAngle: 0,
        laserLength: 0,
        laserWidth: 0,
        laserDamage: 0,
        laserDamageCd: 0
      };
    }
    if (tierKey === "turret_sniper"){
      enemy.enemyState = {
        mode: "move",
        stateTime: 0,
        fireCd: Helpers.randi(34, 66),
        anchorCd: Helpers.randi(72, 120),
        preferredDistance: 320,
        skirmishDistance: 360,
        lockDistance: 420,
        shotDistance: 620,
        minMoveTime: 46,
        chargeTime: 34,
        recoveryTime: 18
      };
    }
    if (tierKey === "bomber"){
      enemy.enemyState = {
        state: "approach",
        timer: 0,
        triggerDistance: 108,
        armTime: 24,
        explosionRadius: 82
      };
      drawBomberSignal(enemy, 0.22);
    }
    if (tierKey === "tank"){
      enemy.sp *= 0.92;
      enemy.enemyState = {
        state: "tank",
        turnBias: Helpers.rand(-0.2, 0.2)
      };
    }
    if (tierKey === "rusher"){
      enemy.enemyState = {
        state: "chase",
        timer: 0,
        cooldown: Helpers.randi(36, 72),
        triggerDistance: 260,
        telegraphTime: 34,
        dashTime: 16,
        recoveryTime: 22,
        dashSpeed: 12.8,
        dashDistance: 240,
        postDashCooldown: 54,
        dashDx: 1,
        dashDy: 0
      };
      drawRusherSignal(enemy, 0.28);
    }

    return enemy;
  }

  function spawnEnemy(){
    const S = GameState;
    const P = S.progression;
    const tier = getTierByWaveAndRoll();
    const enemy = makeEnemy(tier);

    S.enemies.push(enemy);
    P.waveAlive++;
    P.spawnedCount++;

    if (tier === "boss") UI.triggerBossWarning();
  }

  function updateEnemies(dt){
    const S = GameState;
    const p = S.player;
    const now = performance.now() / 1000;

    for (let i=S.enemies.length-1; i>=0; i--){
      const e = S.enemies[i];
      if (typeof e.updateBoss === "function"){
        if (e.slowT > 0){
          e.slowT -= dt;
        } else {
          e.slowMul = 1;
        }
        e.updateBoss(dt);

        if (e.hitT > 0){
          e.hitT -= dt;
          e.spr.alpha = 0.82;
        } else {
          e.spr.alpha = 1;
        }

        for (const hitCircle of getHitCircles(e)){
          const rr = hitCircle.radius + p.r;
          if (Helpers.dist2(hitCircle.x, hitCircle.y, p.spr.x, p.spr.y) < rr * rr){
            const ang = Math.atan2(p.spr.y - hitCircle.y, p.spr.x - hitCircle.x);
            if (typeof e.onPlayerCollide === "function"){
              e.onPlayerCollide({
                player: p,
                hitCircle,
                dx: Math.cos(ang),
                dy: Math.sin(ang)
              });
            }
            break;
          }
        }
        continue;
      }
      const target = getTargetForEnemy(e);
      let dx = target.x - e.x;
      let dy = target.y - e.y;
      const d = Math.hypot(dx,dy) || 1;
      dx /= d;
      dy /= d;

      if (e.slowT > 0){
        e.slowT -= dt;
      } else {
        e.slowMul = 1;
      }

      if (e.tier === "rusher"){
        updateRusherEnemy(e, target, dt);
      } else if (e.tier === "bomber"){
        updateBomberEnemy(e, target, dt);
      } else if (e.tier === "gunner"){
        updateGunnerEnemy(e, target, dt);
      } else if (e.tier === "turret_mg"){
        updateTurretMachinegunEnemy(e, target, dt);
      } else if (e.tier === "turret_laser"){
        updateTurretLaserEnemy(e, target, dt);
      } else if (e.tier === "turret_sniper"){
        updateTurretSniperEnemy(e, target, dt);
      } else if (e.tier === "flanker"){
        updateFlankerEnemy(e, target, dt);
      } else {
        if (e.tier === "normal"){
          const wig = Math.sin(now * 5 + i) * 0.18;
          const ca = Math.cos(wig);
          const sa = Math.sin(wig);
          const ndx = dx * ca - dy * sa;
          const ndy = dx * sa + dy * ca;
          dx = ndx;
          dy = ndy;
        }
        if (e.tier === "elite"){
          const wig = Math.sin(now * 6 + i) * 0.28;
          const ca = Math.cos(wig);
          const sa = Math.sin(wig);
          const ndx = dx * ca - dy * sa;
          const ndy = dx * sa + dy * ca;
          dx = ndx;
          dy = ndy;
        }
        if (e.tier === "tank"){
          const driftAmp = Math.max(0.03, 0.06 + (e.enemyState ? e.enemyState.turnBias : 0));
          const drift = Math.sin(now * 1.8 + i * 0.35) * driftAmp;
          const ca = Math.cos(drift);
          const sa = Math.sin(drift);
          const ndx = dx * ca - dy * sa;
          const ndy = dx * sa + dy * ca;
          dx = ndx;
          dy = ndy;
        }

        const moveSpeed = e.tier === "tank"
          ? e.sp * Math.max(0.72, e.slowMul || 1)
          : e.sp * (e.slowMul || 1);
        e.x += dx * moveSpeed * dt;
        e.y += dy * moveSpeed * dt;
        e.spr.x = e.x;
        e.spr.y = e.y;
        e.spr.rotation = Math.atan2(dy, dx);
        e.hpText.rotation = -e.spr.rotation;
      }

      if (e.hitT > 0){
        e.hitT -= dt;
        e.spr.alpha = 0.7;
      } else {
        e.spr.alpha = 1;
      }

      if (e.tier === "bomber") continue;

      const rr = e.r + target.r;
      if (Helpers.dist2(e.x, e.y, target.x, target.y) < rr * rr){
        const isDashHit = e.tier === "rusher" && e.enemyState && e.enemyState.state === "dash";
        const hitDx = isDashHit && e.enemyState ? e.enemyState.dashDx : dx;
        const hitDy = isDashHit && e.enemyState ? e.enemyState.dashDy : dy;
        if (target.decoy){
          target.decoy.hp -= 1;
          e.hitT = 8;
          Effects.emitParticle(target.x, target.y, isDashHit ? 0xff6b6b : 0xffd27a, isDashHit ? 16 : 10, isDashHit ? 1.15 : 0.8);
          const impactPush = e.tier === "tank" ? 4.5 : (isDashHit ? 7 : 3.5);
          p.vx += hitDx * impactPush;
          p.vy += hitDy * impactPush;
          if (isDashHit){
            e.enemyState.state = "recovery";
            e.enemyState.timer = e.enemyState.recoveryTime;
            e.signalSpr.visible = false;
          }
        } else if (p.inv <= 0 && !S.stats.practice){
          let baseDamage = isDashHit ? e.dmg * 1.8 : e.dmg;
          if (e.tier === "tank") baseDamage *= 1.15;
          const playerPush = e.tier === "tank" ? 6.5 : (isDashHit ? 9 : 4.2);
          const didHit = hitPlayerWithEnemyDamage(baseDamage, e.glowColor, hitDx, hitDy, {
            invFrames: 30,
            push: playerPush,
            particleCount: isDashHit ? 26 : (e.tier === "tank" ? 24 : 18),
            particlePower: isDashHit ? 1.55 : (e.tier === "tank" ? 1.45 : 1.2)
          });
          if (didHit && isDashHit){
            Effects.emitPulse(p.spr.x, p.spr.y, 0xff6b6b, 54, 12);
            S.shake = Math.min(24, S.shake + 10);
            e.enemyState.state = "recovery";
            e.enemyState.timer = e.enemyState.recoveryTime;
            e.signalSpr.visible = false;
          } else if (didHit && e.tier === "tank"){
            Effects.emitPulse(p.spr.x, p.spr.y, 0xc18dff, 42, 10);
            S.shake = Math.min(24, S.shake + 6);
          }
        } else {
          const grazePush = e.tier === "tank" ? 5.5 : (isDashHit ? 8 : 4.6);
          p.vx += hitDx * grazePush;
          p.vy += hitDy * grazePush;
        }
      }
    }
  }

  function updateEnemyBullets(dt){
    const S = GameState;
    const p = S.player;
    for (let i=S.enemyBullets.length-1; i>=0; i--){
      const b = S.enemyBullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.x = b.x;
      b.spr.y = b.y;

      if ((performance.now() | 0) % 3 === 0){
        const t = Effects.makeTrailSprite(b.x - b.vx * 0.18, b.y - b.vy * 0.18, b.color, 0.14, 0.14);
        S.fx.addChild(t);
        S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:8 });
      }

      const out = b.life <= 0
        || b.x < -40 || b.x > S.app.renderer.width + 40
        || b.y < -40 || b.y > S.app.renderer.height + 40;
      if (out){
        S.fx.removeChild(b.spr);
        S.enemyBullets.splice(i, 1);
        continue;
      }

      const rr = b.r + p.r;
      if (Helpers.dist2(b.x, b.y, p.spr.x, p.spr.y) < rr * rr){
        const ang = Math.atan2(p.spr.y - b.y, p.spr.x - b.x);
        hitPlayerWithEnemyDamage(b.dmg, b.color, Math.cos(ang), Math.sin(ang), {
          invFrames: 18,
          push: 3.8,
          particleCount: 10,
          particlePower: 0.8,
          pulseRadius: 28,
          pulseLife: 8
        });
        S.fx.removeChild(b.spr);
        S.enemyBullets.splice(i, 1);
      }
    }
  }

  return {
    spawnEnemy,
    updateEnemies,
    updateEnemyBullets,
    hitPlayerWithEnemyDamage
  };
})();
