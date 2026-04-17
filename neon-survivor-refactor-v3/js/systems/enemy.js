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
    return { x: S.player.spr.x, y: S.player.spr.y, r: S.player.r, player: S.player };
  }

  function getTierByWaveAndRoll(){
    const wave = GameState.progression.wave;
    const roll = Math.random();
    if (wave >= 10 && roll > 0.985) return "boss";
    if (wave >= 6  && roll > 0.94)  return "midboss";
    if (wave >= 7  && roll > 0.88)  return "tank";
    if (wave >= 5  && roll > 0.82)  return "rusher";
    if (wave >= 4  && roll > 0.74)  return "flanker";
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
    Effects.emitParticle(p.spr.x, p.spr.y, color, options.particleCount || 12, options.particlePower || 0.9);
    if (options.pulseRadius) Effects.emitPulse(p.spr.x, p.spr.y, color, options.pulseRadius, options.pulseLife || 10);
    if (S.stats.hp <= 0){
      S.stats.hp = 0;
      Boot.gameOver();
    }
    return true;
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
    const body = Effects.makeEnemySprite(tierKey, tier, 0, 0);

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
          const impactPush = e.tier === "tank" ? -4.5 : (isDashHit ? -7 : -2);
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
          const playerPush = e.tier === "tank" ? 6.5 : (isDashHit ? 9 : -2);
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
          const grazePush = e.tier === "tank" ? 5.5 : (isDashHit ? 8 : -6);
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
    updateEnemyBullets
  };
})();
