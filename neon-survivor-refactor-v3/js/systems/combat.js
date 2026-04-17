window.CombatSystem = (() => {
  function getWeaponDef(){
    return WEAPON_DEFINITIONS[GameState.weaponState.current];
  }

  function getWeaponLevel(type=GameState.weaponState.current){
    return GameState.weaponState.levels[type] || 1;
  }

  function setWeaponType(type){
    if (!WEAPON_DEFINITIONS[type]) return false;
    GameState.weaponState.current = type;
    UI.hudUpdate();
    return true;
  }

  function applyStartingWeaponLoadout(testMode=false){
    const startingLevels = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_WEAPON_LEVELS) || {}) : {};
    for (const type of Object.keys(WEAPON_DEFINITIONS)){
      const def = WEAPON_DEFINITIONS[type];
      GameState.weaponState.levels[type] = Math.max(1, Math.min(def.maxLevel, startingLevels[type] || 1));
    }
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
    g.lineStyle(beam.width + 8, beam.color, 0.10 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(beam.ang) * beam.length, Math.sin(beam.ang) * beam.length);
    g.lineStyle(beam.width + 3, beam.color, 0.24 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(beam.ang) * beam.length, Math.sin(beam.ang) * beam.length);
    g.lineStyle(beam.width, beam.color, 0.96 * alpha);
    g.moveTo(0, 0);
    g.lineTo(Math.cos(beam.ang) * beam.length, Math.sin(beam.ang) * beam.length);
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
      vy:-3,
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

  function damageEnemy(enemy, damage, hitColor, particleCount=10, particlePower=1){
    const S = GameState;
    const P = S.progression;

    enemy.hp -= damage;
    enemy.hitT = 6;
    enemy.hpText.text = String(Math.max(0, Math.floor(enemy.hp)));
    Effects.emitParticle(enemy.x, enemy.y, hitColor || enemy.glowColor, particleCount, particlePower);

    if (enemy.hp <= 0){
      S.uiLayer.removeChild(enemy.spr);
      const enemyIndex = S.enemies.indexOf(enemy);
      if (enemyIndex >= 0) S.enemies.splice(enemyIndex, 1);
      P.waveAlive--;
      P.combo = Math.min(6, P.combo + (enemy.tier === "boss" ? 0.55 : enemy.tier === "midboss" ? 0.28 : 0.12));
      P.comboT = 120;
      P.score += enemy.scoreBase * P.combo;
      SkillSystem.gainXp(enemy.xp);
      Effects.emitParticle(enemy.x, enemy.y, enemy.glowColor, enemy.tier === "boss" ? 36 : 22, 1.5);
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

    const weaponDef = getWeaponDef();
    const weaponLevel = getWeaponLevel();
    const { fireRateMul, bulletSpeedMul } = getAfterburnerMultipliers();
    const ang = Math.atan2(S.mouse.y - player.spr.y, S.mouse.x - player.spr.x);

    if (S.weaponState.current === "machinegun") fireMachinegun(ang, weaponLevel, bulletSpeedMul);
    if (S.weaponState.current === "laser") fireLaser(ang, weaponLevel);
    if (S.weaponState.current === "shotgun") fireShotgun(ang, weaponLevel, bulletSpeedMul);

    if (S.weaponState.current !== "laser"){
      player.fireCd = weaponDef.fireInterval * fireRateMul;
    }
  }

  function fireMachinegun(ang, level, bulletSpeedMul){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const count = Math.min(5, Math.max(level, S.stats.bulletCount));
    const spread = count === 1 ? 0 : Math.min(0.42, 0.10 * (count - 1));

    for (let i=0; i<count; i++){
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      const shotAng = ang + t * spread;
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        S.stats.bulletDamage,
        WEAPON_DEFINITIONS.machinegun.projectileSpeed * bulletSpeedMul,
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

  function fireLaser(ang, level){
    const S = GameState;
    if (S.weaponState.laserChannel) return;
    if (S.player.fireCd > 0) return;
    const def = WEAPON_DEFINITIONS.laser;
    const color = def.colors[Math.min(def.colors.length - 1, level - 1)];
    const width = 4 + level * 2.4;
    const originX = S.player.spr.x + Math.cos(ang) * 18;
    const originY = S.player.spr.y + Math.sin(ang) * 18;
    const beam = makeBeam(originX, originY, ang, def.range, width, color);
    Effects.emitParticle(originX, originY, color, 12, 1.1);
    S.weaponState.laserChannel = {
      beam,
      remaining: 22 + level * 8,
      maxRemaining: 22 + level * 8,
      damageTick: 0,
      damageInterval: 4,
      level,
      color,
      width,
      length: def.range
    };
  }

  function damageLaserChannel(channel){
    const S = GameState;
    const damage = S.stats.bulletDamage * (1.35 + channel.level * 0.3);
    const cos = Math.cos(channel.beam.ang);
    const sin = Math.sin(channel.beam.ang);
    const originX = channel.beam.x;
    const originY = channel.beam.y;
    for (const enemy of [...S.enemies]){
      const rx = enemy.x - originX;
      const ry = enemy.y - originY;
      const along = rx * cos + ry * sin;
      const side = Math.abs(rx * -sin + ry * cos);
      if (along >= 0 && along <= channel.length && side <= channel.width + enemy.r){
        damageEnemy(enemy, damage, channel.color, enemy.tier === "boss" ? 12 : 8, 0.75);
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
    S.player.fireCd = WEAPON_DEFINITIONS.laser.fireInterval;
  }

  function fireShotgun(ang, level, bulletSpeedMul){
    const S = GameState;
    const px = S.player.spr.x;
    const py = S.player.spr.y;
    const pelletCount = 6 + Math.min(4, level);
    const spread = 0.42 + level * 0.045;
    const pelletDamage = Math.max(0.8, S.stats.bulletDamage * (0.65 + level * 0.16));

    for (let i=0; i<pelletCount; i++){
      const shotAng = ang + Helpers.rand(-spread, spread);
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        pelletDamage,
        WEAPON_DEFINITIONS.shotgun.projectileSpeed * bulletSpeedMul,
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
    const spawnCount = Math.min(S.stats.homingMissileLevel, S.enemies.length);
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
        const rr = b.r + e.r;
        if (Helpers.dist2(b.x, b.y, e.x, e.y) < rr * rr){
          const particleCount = b.kind === "shotgun" ? 14 : (e.tier === "boss" ? 18 : 10);
          const particlePower = b.kind === "shotgun" ? 1.35 : (e.tier === "boss" ? 1.3 : 1.0);
          damageEnemy(e, b.dmg, b.color || e.glowColor, particleCount, particlePower);
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
        const baseSpeed = m.heavy ? 10.5 : 8.8;
        const steer = m.heavy ? 0.12 : 0.16;
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
        const rr = m.r + target.r;
        if (Helpers.dist2(m.x, m.y, target.x, target.y) < rr * rr){
          damageEnemy(target, m.dmg, m.color || 0xffb347, target.tier === "boss" ? 24 : 14, m.heavy ? 1.7 : 1.25);
          Effects.emitParticle(m.x, m.y, 0xffd27a, m.heavy ? 22 : 14, m.heavy ? 1.8 : 1.4);
          if (m.heavy){
            for (const enemy of S.enemies){
              if (enemy !== target && Helpers.dist2(m.x, m.y, enemy.x, enemy.y) < 110 * 110){
                damageEnemy(enemy, Math.max(1, m.dmg * 0.45), 0xffb347, 8, 0.9);
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
