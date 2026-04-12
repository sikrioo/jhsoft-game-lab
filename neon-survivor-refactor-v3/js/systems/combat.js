window.CombatSystem = (() => {
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

  function makeBullet(x, y, ang, damage, speed, pierce){
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, ang, 0x32f6ff);
    S.fx.addChild(spr);

    return {
      type:"bullet",
      spr,
      x, y,
      vx:Math.cos(ang) * speed,
      vy:Math.sin(ang) * speed,
      r:7,
      dmg:damage,
      pierce,
      life:120
    };
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

  function tryShoot(){
    const S = GameState;
    const player = S.player;
    if (player.fireCd > 0) return;
    if (!(S.mouse.down || S.keys.has("Space"))) return;

    const afterburnerSkill = window.ActiveSkillSystem && ActiveSkillSystem.getDefinition("afterburner");
    const fireRateMul = S.activeSkillState.afterburnerT > 0 && afterburnerSkill
      ? afterburnerSkill.effectData.fireRateMultiplier
      : 1;
    const bulletSpeedMul = S.activeSkillState.afterburnerT > 0 && afterburnerSkill
      ? afterburnerSkill.effectData.bulletSpeedMultiplier
      : 1;

    const px = player.spr.x;
    const py = player.spr.y;
    const ang = Math.atan2(S.mouse.y - py, S.mouse.x - px);
    const count = Math.max(1, Math.floor(S.stats.bulletCount));
    const spread = count === 1 ? 0 : Math.min(0.52, 0.12 * (count - 1));

    for (let i=0; i<count; i++){
      const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
      const shotAng = ang + t * spread;
      const bullet = makeBullet(
        px + Math.cos(shotAng) * 18,
        py + Math.sin(shotAng) * 18,
        shotAng,
        S.stats.bulletDamage,
        S.stats.bulletSpeed * bulletSpeedMul,
        S.stats.bulletPierce
      );
      S.bullets.push(bullet);
    }

    player.fireCd = S.stats.fireRate * fireRateMul;
    Effects.emitParticle(px + Math.cos(ang) * 18, py + Math.sin(ang) * 18, 0x32f6ff, 7 + count, 0.9 + (count - 1) * 0.1);
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
          damageEnemy(e, b.dmg, e.glowColor, e.tier === "boss" ? 18 : 10, e.tier === "boss" ? 1.3 : 1.0);

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
          b.x - b.vx * 0.25,
          b.y - b.vy * 0.25,
          0x32f6ff,
          Helpers.rand(0.12, 0.22),
          0.18
        );
        S.fx.addChild(t);
        S.particles.push({ spr:t, x:t.x, y:t.y, vx:0, vy:0, life:12 });
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
    updateBullets,
    updateMissiles
  };
})();
