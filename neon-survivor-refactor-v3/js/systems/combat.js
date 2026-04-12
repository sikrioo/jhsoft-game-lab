window.CombatSystem = (() => {
  function makeBullet(x,y,ang,damage,speed,pierce){
    const S = GameState;
    const spr = Effects.makeBulletSprite(x, y, ang, 0x32f6ff);
    S.fx.addChild(spr);

    return {
      type:"bullet",
      spr,
      x,y,
      vx:Math.cos(ang)*speed,
      vy:Math.sin(ang)*speed,
      r:7,
      dmg:damage,
      pierce,
      life:120
    };
  }

  function tryShoot(){
    const S = GameState;
    const player = S.player;
    if (player.fireCd > 0) return;
    if (!(S.mouse.down || S.keys.has("Space"))) return;

    const px = player.spr.x;
    const py = player.spr.y;
    const ang = Math.atan2(S.mouse.y - py, S.mouse.x - px);

    const bullet = makeBullet(
      px + Math.cos(ang) * 18,
      py + Math.sin(ang) * 18,
      ang,
      S.stats.bulletDamage,
      S.stats.bulletSpeed,
      S.stats.bulletPierce
    );

    S.bullets.push(bullet);
    player.fireCd = S.stats.fireRate;
    Effects.emitParticle(bullet.x, bullet.y, 0x32f6ff, 7, 0.9);
  }

  function updateBullets(dt){
    const S = GameState;
    const P = S.progression;
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;

    for (let i=S.bullets.length-1; i>=0; i--){
      const b = S.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      b.spr.x = b.x;
      b.spr.y = b.y;

      if (b.life <= 0 || b.x < -80 || b.x > w+80 || b.y < -80 || b.y > h+80){
        S.fx.removeChild(b.spr);
        S.bullets.splice(i,1);
        continue;
      }

      for (let j=S.enemies.length-1; j>=0; j--){
        const e = S.enemies[j];
        const rr = b.r + e.r;
        if (Helpers.dist2(b.x,b.y,e.x,e.y) < rr*rr){
          e.hp -= b.dmg;
          e.hitT = 6;
          e.hpText.text = String(Math.max(0, Math.floor(e.hp)));
          Effects.emitParticle(b.x, b.y, e.glowColor, e.tier === "boss" ? 18 : 10, e.tier === "boss" ? 1.3 : 1.0);

          if (e.hp <= 0){
            S.uiLayer.removeChild(e.spr);
            S.enemies.splice(j,1);
            P.waveAlive--;
            P.combo = Math.min(6, P.combo + (e.tier === "boss" ? 0.55 : e.tier === "midboss" ? 0.28 : 0.12));
            P.comboT = 120;
            P.score += e.scoreBase * P.combo;
            SkillSystem.gainXp(e.xp);
            Effects.emitParticle(e.x, e.y, e.glowColor, e.tier === "boss" ? 36 : 22, 1.5);
          } else {
            P.score += 4 * P.combo;
            UI.hudUpdate();
          }

          if (b.pierce > 0){
            b.pierce -= 1;
          } else {
            S.fx.removeChild(b.spr);
            S.bullets.splice(i,1);
          }
          break;
        }
      }

      if ((performance.now()|0) % 2 === 0){
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

  return {
    tryShoot,
    updateBullets
  };
})();
