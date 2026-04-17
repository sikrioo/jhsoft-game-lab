window.CombatSystem = (() => {
  function getWeaponDef(){
    return WEAPON_DEFINITIONS[GameState.weaponState.current];
  }

  function setWeaponType(type){
    if (!WEAPON_DEFINITIONS[type]) return false;
    GameState.weaponState.current = type;
    UI.hudUpdate();
    return true;
  }

  function applyStartingWeaponLoadout(testMode=false){
    GameState.weaponState.current = testMode
      ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_WEAPON) || "machinegun")
      : "machinegun";
  }

  function findNearestEnemy(x, y, takenSet=null){
    const S = GameState;
    let best = null;
    let bestDist = Infinity;
    for (let i=0; i<S.enemies.length; i++){
      const enemy = S.enemies[i];
      if (takenSet && takenSet.has(enemy)) continue;
      const d2 = Helpers.dist2(x, y, enemy.x, enemy.y);
      if (d2 < bestDist){
        best = enemy;
        bestDist = d2;
      }
    }
    return best;
  }

  function makeBullet(x, y, ang, damage, speed, pierce, options={}){
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, ang, options.color || 0x32f6ff);
    if (options.scaleX || options.scaleY) spr.scale.set(options.scaleX || 1, options.scaleY || 1);
    S.fx.addChild(spr);

    return {
      type:"bullet",
      kind: options.kind || "machinegun",
      spr,
      x, y,
      vx:Math.cos(ang) * speed,
      vy:Math.sin(ang) * speed,
      r:options.radius || 7,
      dmg:damage,
      pierce,
      color: options.color || 0x32f6ff,
      life:options.life || 120,
      trailAlpha: options.trailAlpha || 0.18
    };
  }

  function makeBeam(x, y, ang, length, width, color){
    const g = new PIXI.Graphics();
    g.x = x;
    g.y = y;
    GameState.fx.addChild(g);
    const beam = { spr:g, x, y, ang, length, width, color, life:7, maxLife:7 };
    redrawBeam(beam, 1);
    return beam;
  }

  function redrawBeam(beam, alpha=1){
    const g = beam.spr;
    g.x = beam.x;
    g.y = beam.y;
    g.clear();
    const cos = Math.cos(beam.ang);
    const sin = Math.sin(beam.ang);
    const nx = -sin;
    const ny = cos;
    const flicker = Math.sin(performance.now() * 0.05) * 1.6;
    const arcJitter = beam.width * 0.45 + flicker;
    const endX = cos * beam.length;
    const endY = sin * beam.length;

    g.lineStyle(beam.width + 10, beam.color, 0.10 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);

    g.lineStyle(beam.width + 5, beam.color, 0.22 * alpha);
    g.moveTo(nx * arcJitter, ny * arcJitter);
    g.quadraticCurveTo(endX * 0.38 + nx * arcJitter * 1.8, endY * 0.38 + ny * arcJitter * 1.8, endX - nx * arcJitter * 0.7, endY - ny * arcJitter * 0.7);
    g.moveTo(-nx * arcJitter, -ny * arcJitter);
    g.quadraticCurveTo(endX * 0.42 - nx * arcJitter * 1.9, endY * 0.42 - ny * arcJitter * 1.9, endX + nx * arcJitter * 0.7, endY + ny * arcJitter * 0.7);

    g.lineStyle(beam.width + 2, beam.color, 0.34 * alpha);
    g.moveTo(nx * (arcJitter * 0.45), ny * (arcJitter * 0.45));
    g.lineTo(endX + nx * (arcJitter * 0.3), endY + ny * (arcJitter * 0.3));
    g.moveTo(-nx * (arcJitter * 0.45), -ny * (arcJitter * 0.45));
    g.lineTo(endX - nx * (arcJitter * 0.3), endY - ny * (arcJitter * 0.3));

    g.lineStyle(beam.width, beam.color, 0.95 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);

    g.lineStyle(Math.max(2, beam.width * 0.42), 0xffffff, 0.9 * alpha);
    g.moveTo(0, 0);
    g.lineTo(endX, endY);
  }

  function makeMissile(x, y, target){
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, -Math.PI / 2, 0xffb347);
    spr.scale.set(1.25, 1.4);
    S.fx.addChild(spr);

    return {
      type:"missile",
      spr,
      x, y,
      vx:0,
      vy:-2.4,
      r:12,
      dmg:S.stats.homingMissileDamage,
      color: 0xffb347,
      target,
      life:180
    };
  }

  function makeStrikeMissile(target, damageMultiplier=2){
    const S = GameState;
    const startX = target ? target.x + Helpers.rand(-120, 120) : S.player.spr.x + Helpers.rand(-180, 180);
    const startY = -40 - Helpers.rand(0, 90);
    const spr = Effects.makeBulletSprite(startX, startY, Math.PI / 2, 0xffd27a);
    spr.scale.set(1.55, 2.2);
    S.fx.addChild(spr);

    return {
      type:"missile",
      spr,
      x:startX,
      y:startY,
      vx:0,
      vy:6.8,
      r:16,
      dmg:Math.max(2, S.stats.bulletDamage * damageMultiplier),
      color:0xffd27a,
      target,
      heavy:true,
      life:150
    };
  }

  function destroyProjectile(list, index){
    const S = GameState;
    const projectile = list[index];
    S.fx.removeChild(projectile.spr);
    list.splice(index, 1);
  }

  function getEnemyHitCircles(enemy){
    if (enemy && typeof enemy.getHitCircles === "function") return enemy.getHitCircles();
    return [{ x: enemy.x, y: enemy.y, radius: enemy.r }];
  }

  function removeEnemy(enemy){
    const S = GameState;
    if (typeof enemy.onDefeat === "function") enemy.onDefeat();
    if (typeof enemy.destroyVisuals === "function") enemy.destroyVisuals();
    else S.uiLayer.removeChild(enemy.spr);
    const enemyIndex = S.enemies.indexOf(enemy);
    if (enemyIndex >= 0) S.enemies.splice(enemyIndex, 1);
  }

  function rewardEnemyKill(enemy){
    const P = GameState.progression;
    P.waveAlive--;
    P.combo = Math.min(6, P.combo + (enemy.tier === "boss" ? 0.55 : enemy.tier === "midboss" ? 0.28 : 0.12));
    P.comboT = 120;
    P.score += enemy.scoreBase * P.combo;
    SkillSystem.gainXp(enemy.xp);
    if (enemy.tier === "boss") {
      P.score += Math.round(enemy.scoreBase * 0.35);
      SkillSystem.gainXp(Math.round(enemy.xp * 0.35));
      Effects.emitPulse(enemy.x, enemy.y, 0xffffff, 140, 24);
    }
    Effects.emitParticle(enemy.x, enemy.y, enemy.glowColor, enemy.tier === "boss" ? 36 : 22, 1.5);
  }

  function damageEnemy(enemy, damage, hitColor, particleCount=10, particlePower=1, hitCircle=null){
    const S = GameState;
    const P = S.progression;

    const effectX = hitCircle ? hitCircle.x : enemy.x;
    const effectY = hitCircle ? hitCircle.y : enemy.y;

    if (typeof enemy.takeDamage === "function"){
      const didDamage = enemy.takeDamage(damage, { hitCircle, hitColor, particleCount, particlePower });
      if (!didDamage) return false;
      enemy.hitT = 6;
    } else {
      enemy.hp -= damage;
      enemy.hitT = 6;
      enemy.hpText.text = String(Math.max(0, Math.floor(enemy.hp)));
    }
    Effects.emitParticle(effectX, effectY, hitColor || enemy.glowColor, particleCount, particlePower);

    if (enemy.hp <= 0){
      removeEnemy(enemy);
      rewardEnemyKill(enemy);
      UI.hudUpdate();
      return true;
    }

    P.score += 4 * P.combo;
    UI.hudUpdate();
    return false;
  }

  function getAfterburnerMultipliers(){
    const S = GameState;
    const afterburnerSkill = window.ActiveSkillSystem && ActiveSkillSystem.getDefinition("afterburner");
    return {
      fireRateMul: S.activeSkillState.afterburnerT > 0 && afterburnerSkill ? afterburnerSkill.effectData.fireRateMultiplier : 1,
      bulletSpeedMul: S.activeSkillState.afterburnerT > 0 && afterburnerSkill ? afterburnerSkill.effectData.bulletSpeedMultiplier : 1
    };
  }

  function tryShoot(){
    const S = GameState;
    const player = S.player;
    if (player.fireCd > 0) return;
    if (!(S.mouse.down || S.keys.has("Space"))) return;

    const { fireRateMul, bulletSpeedMul } = getAfterburnerMultipliers();
    const ang = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);

    if (S.weaponState.current === "machinegun") fireMachinegun(ang, bulletSpeedMul);
    if (S.weaponState.current === "laser") fireLaser(ang);
    if (S.weaponState.current === "shotgun") fireShotgun(ang, bulletSpeedMul);

    if (S.weaponState.current !== "laser"){
      player.fireCd = S.stats.fireRate * fireRateMul;
    }
  }

  function fireMachinegun(ang, bulletSpeedMul){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const count = Math.min(5, Math.max(1, S.stats.bulletCount));
    const spread = count === 1 ? 0 : Math.min(0.42, 0.10 * (count - 1));

    for (let i=0; i<count; i++){
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      const shotAng = ang + t * spread;
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        S.stats.bulletDamage,
        S.stats.bulletSpeed * WEAPON_DEFINITIONS.machinegun.projectileSpeedMul * bulletSpeedMul,
        S.stats.bulletPierce,
        {
          color:0x32f6ff,
          radius:7,
          kind:"machinegun",
          scaleX:1,
          scaleY:1.05,
          life:WEAPON_DEFINITIONS.machinegun.projectileLife
        }
      );
      S.bullets.push(bullet);
    }

    Effects.emitParticle(px + Math.cos(ang) * 18, py + Math.sin(ang) * 18, 0x32f6ff, 6 + count, 0.9);
  }

  function fireLaser(ang){
    const S = GameState;
    if (S.weaponState.laserChannel) return;
    if (S.player.fireCd > 0) return;
    const def = WEAPON_DEFINITIONS.laser;
    const color = def.color;
    const width = 5 + Math.max(0, S.stats.bulletCount - 1) * 1.35;
    const originX = S.player.spr.x + Math.cos(ang) * 18;
    const originY = S.player.spr.y + Math.sin(ang) * 18;
    const beam = makeBeam(originX, originY, ang, def.range, width, color);
    Effects.emitParticle(originX, originY, color, 12, 1.1);
    S.weaponState.laserChannel = {
      beam,
      remaining: 28 + Math.max(0, S.stats.bulletCount - 1) * 6,
      maxRemaining: 28 + Math.max(0, S.stats.bulletCount - 1) * 6,
      damageTick: 0,
      damageInterval: 4,
      color,
      width,
      length: def.range
    };
  }

  function damageLaserChannel(channel){
    const S = GameState;
    const damage = S.stats.bulletDamage * (1.55 + Math.max(0, S.stats.bulletCount - 1) * 0.12);
    const cos = Math.cos(channel.beam.ang);
    const sin = Math.sin(channel.beam.ang);
    const originX = channel.beam.x;
    const originY = channel.beam.y;
    for (const enemy of [...S.enemies]){
      const hitCircles = getEnemyHitCircles(enemy);
      for (const hitCircle of hitCircles){
        const rx = hitCircle.x - originX;
        const ry = hitCircle.y - originY;
        const along = rx * cos + ry * sin;
        const side = Math.abs(rx * -sin + ry * cos);
        if (along >= 0 && along <= channel.length && side <= channel.width + hitCircle.radius){
          damageEnemy(enemy, damage, channel.color, enemy.tier === "boss" ? 12 : 8, 0.75, hitCircle);
          break;
        }
      }
    }
  }

  function finishLaserChannel(interrupted=false){
    const S = GameState;
    const channel = S.weaponState.laserChannel;
    if (!channel) return;
    channel.beam.life = interrupted ? 5 : 8;
    channel.beam.maxLife = channel.beam.life;
    S.beams.push(channel.beam);
    S.weaponState.laserChannel = null;
    S.player.fireCd = S.stats.fireRate;
  }

  function fireShotgun(ang, bulletSpeedMul){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const pelletCount = 6 + Math.min(8, S.stats.bulletCount * 2);
    const spread = 0.26 + Math.max(0, S.stats.bulletCount - 1) * 0.025;
    const pelletDamage = Math.max(0.72, S.stats.bulletDamage * (0.72 + Math.max(0, S.stats.bulletCount - 1) * 0.05));

    for (let i=0; i<pelletCount; i++){
      const shotAng = ang + Helpers.rand(-spread, spread);
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        pelletDamage,
        S.stats.bulletSpeed * WEAPON_DEFINITIONS.shotgun.projectileSpeedMul * bulletSpeedMul,
        0,
        {
          color:0xffbf7a,
          radius:8.5,
          life:WEAPON_DEFINITIONS.shotgun.projectileLife,
          kind:"shotgun",
          scaleX:1.25,
          scaleY:1.3,
          trailAlpha:0.26
        }
      );
      S.bullets.push(bullet);
    }

    Effects.emitParticle(px + Math.cos(ang) * 18, py + Math.sin(ang) * 18, 0xffbf7a, 15, 1.2);
  }

  function tryShootMissiles(){
    const S = GameState;
    if (S.stats.homingMissileLevel <= 0) return;
    if (S.stats.homingMissileCd > 0) return;
    if (S.enemies.length <= 0) return;

    const taken = new Set();
    const spawnCount = Math.min(1 + Math.floor(Math.max(0, S.stats.homingMissileLevel - 1) / 2), S.enemies.length);
    for (let i=0; i<spawnCount; i++){
      const target = findNearestEnemy(S.player.spr.x, S.player.spr.y, taken);
      if (!target) break;
      taken.add(target);
      const missile = makeMissile(S.player.spr.x, S.player.spr.y - 12, target);
      S.missiles.push(missile);
      Effects.emitParticle(missile.x, missile.y, 0xffb347, 6, 0.8);
    }

    S.stats.homingMissileCd = S.stats.homingMissileCdMax;
  }

  function launchMissileVolley(count=4, damageMultiplier=2.2){
    const S = GameState;
    if (S.enemies.length <= 0) return false;
    const taken = new Set();
    for (let i=0; i<count; i++){
      const target = findNearestEnemy(S.player.spr.x + Helpers.rand(-40, 40), S.player.spr.y, taken) || findNearestEnemy(S.player.spr.x, S.player.spr.y);
      if (!target) break;
      taken.add(target);
      const missile = makeStrikeMissile(target, damageMultiplier);
      S.missiles.push(missile);
    }
    return true;
  }

  function updateBullets(dt){
    const S = GameState;
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;

    for (let i=S.bullets.length-1; i>=0; i--){
      const b = S.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.x = b.x;
      b.spr.y = b.y;

      if (b.life <= 0 || b.x < -80 || b.x > w + 80 || b.y < -80 || b.y > h + 80){
        destroyProjectile(S.bullets, i);
        continue;
      }

      for (let j=S.enemies.length-1; j>=0; j--){
        const e = S.enemies[j];
        const hitCircle = getEnemyHitCircles(e).find((circle) => {
          const rr = b.r + circle.radius;
          return Helpers.dist2(b.x, b.y, circle.x, circle.y) < rr * rr;
        });
        if (hitCircle){
          const particleCount = b.kind === "shotgun" ? 14 : (e.tier === "boss" ? 18 : 10);
          const particlePower = b.kind === "shotgun" ? 1.35 : (e.tier === "boss" ? 1.3 : 1.0);
          damageEnemy(e, b.dmg, b.color || e.glowColor, particleCount, particlePower, hitCircle);
          if (b.pierce > 0){
            b.pierce -= 1;
          } else {
            destroyProjectile(S.bullets, i);
          }
          break;
        }
      }

      if ((performance.now() | 0) % 2 === 0){
        const t = Effects.makeTrailSprite(
          b.x - b.vx * 0.2,
          b.y - b.vy * 0.2,
          b.color || 0x32f6ff,
          b.kind === "shotgun" ? Helpers.rand(0.16, 0.28) : Helpers.rand(0.12, 0.22),
          b.trailAlpha || 0.18
        );
        S.fx.addChild(t);
        S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:b.kind === "shotgun" ? 10 : 12 });
      }
    }
  }

  function updateBeams(dt){
    const S = GameState;
    const channel = S.weaponState.laserChannel;
    if (channel){
      if (!(S.mouse.down || S.keys.has("Space")) || channel.remaining <= 0){
        finishLaserChannel(channel.remaining > 0 ? true : false);
      } else {
        const ang = Math.atan2(S.mouse.y - S.player.spr.y, S.mouse.x - S.player.spr.x);
        channel.beam.x = S.player.spr.x + Math.cos(ang) * 18;
        channel.beam.y = S.player.spr.y + Math.sin(ang) * 18;
        channel.beam.ang = ang;
        channel.beam.width = channel.width;
        channel.beam.length = channel.length;
        redrawBeam(channel.beam, 1);
        channel.remaining -= dt;
        channel.damageTick -= dt;
        if ((performance.now() | 0) % 2 === 0){
          const sparkDist = Helpers.rand(26, channel.length * 0.55);
          const sparkSpread = Helpers.rand(-channel.width * 1.2, channel.width * 1.2);
          const sparkX = channel.beam.x + Math.cos(ang) * sparkDist - Math.sin(ang) * sparkSpread;
          const sparkY = channel.beam.y + Math.sin(ang) * sparkDist + Math.cos(ang) * sparkSpread;
          Effects.emitParticle(sparkX, sparkY, channel.color, 2, 0.38);
        }
        if (channel.damageTick <= 0){
          channel.damageTick = channel.damageInterval;
          damageLaserChannel(channel);
          if ((performance.now() | 0) % 3 === 0){
            const endX = channel.beam.x + Math.cos(ang) * (channel.length * 0.25);
            const endY = channel.beam.y + Math.sin(ang) * (channel.length * 0.25);
            Effects.emitParticle(endX, endY, channel.color, 6, 0.5);
          }
        }
      }
    }

    for (let i=S.beams.length-1; i>=0; i--){
      const beam = S.beams[i];
      beam.life -= dt;
      redrawBeam(beam, Math.max(0, beam.life / beam.maxLife));
      if (beam.life <= 0){
        S.fx.removeChild(beam.spr);
        S.beams.splice(i, 1);
      }
    }
  }

  function updateMissiles(dt){
    const S = GameState;
    if (S.stats.homingMissileCd > 0) S.stats.homingMissileCd -= dt;

    for (let i=S.missiles.length-1; i>=0; i--){
      const m = S.missiles[i];
      if (!m.target || S.enemies.indexOf(m.target) < 0){
        m.target = findNearestEnemy(m.x, m.y);
      }

      if (m.target){
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const d = Math.hypot(dx, dy) || 1;
        const baseSpeed = m.heavy ? 10.0 : 7.6;
        const steer = m.heavy ? 0.11 : 0.12;
        const desiredX = (dx / d) * baseSpeed;
        const desiredY = (dy / d) * baseSpeed;
        m.vx = Helpers.lerp(m.vx, desiredX, steer);
        m.vy = Helpers.lerp(m.vy, desiredY, steer);
        m.spr.rotation = Math.atan2(m.vy, m.vx) + Math.PI / 2;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;
      m.spr.x = m.x;
      m.spr.y = m.y;

      const target = m.target;
      if (target){
        const hitCircle = getEnemyHitCircles(target).find((circle) => {
          const rr = m.r + circle.radius;
          return Helpers.dist2(m.x, m.y, circle.x, circle.y) < rr * rr;
        });
        if (hitCircle){
          damageEnemy(target, m.dmg, m.color || 0xffb347, target.tier === "boss" ? 24 : 14, m.heavy ? 1.7 : 1.25, hitCircle);
          Effects.emitParticle(m.x, m.y, 0xffd27a, m.heavy ? 22 : 14, m.heavy ? 1.8 : 1.4);
          if (m.heavy){
            for (const enemy of S.enemies){
              const splashCircle = getEnemyHitCircles(enemy)[0];
              if (enemy !== target && splashCircle && Helpers.dist2(m.x, m.y, splashCircle.x, splashCircle.y) < 110 * 110){
                damageEnemy(enemy, Math.max(1, m.dmg * 0.45), 0xffb347, 8, 0.9, splashCircle);
              }
            }
            Effects.emitPulse(m.x, m.y, 0xffb347, 110, 18);
          }
          destroyProjectile(S.missiles, i);
          continue;
        }
      }

      if (m.life <= 0){
        Effects.emitParticle(m.x, m.y, 0xffb347, 8, 0.8);
        destroyProjectile(S.missiles, i);
      }
    }
  }

  return {
    tryShoot,
    tryShootMissiles,
    launchMissileVolley,
    setWeaponType,
    applyStartingWeaponLoadout,
    updateBullets,
    updateBeams,
    updateMissiles
  };
})();
