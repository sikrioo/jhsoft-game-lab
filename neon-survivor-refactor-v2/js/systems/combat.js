window.CombatSystem = (() => {
  function makeBullet(x,y,ang,damage,speed,pierce){
    const S = GameState;
    const g = new PIXI.Graphics();
    g.beginFill(0x32f6ff, 0.95);
    g.drawRoundedRect(-3,-10,6,20,3);
    g.endFill();
    g.filters = PixiFx.asFilters(PixiFx.makeGlowFilter({
      color: 0x32f6ff,
      distance: 12,
      outerStrength: 2,
      innerStrength: 0,
      quality: 0.2
    }));
    g.x = x;
    g.y = y;
    g.rotation = ang + Math.PI / 2;
    S.fx.addChild(g);

    return {
      type:"bullet",
      spr:g,
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
    PixiFx.emitParticle(bullet.x, bullet.y, 0x32f6ff, 7, 0.9);
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
          PixiFx.emitParticle(b.x, b.y, e.glowColor, e.tier === "boss" ? 18 : 10, e.tier === "boss" ? 1.3 : 1.0);

          if (e.hp <= 0){
            S.uiLayer.removeChild(e.spr);
            S.enemies.splice(j,1);
            P.waveAlive--;
            P.combo = Math.min(6, P.combo + (e.tier === "boss" ? 0.55 : e.tier === "midboss" ? 0.28 : 0.12));
            P.comboT = 120;
            P.score += e.scoreBase * P.combo;
            SkillSystem.gainXp(e.xp);
            PixiFx.emitParticle(e.x, e.y, e.glowColor, e.tier === "boss" ? 36 : 22, 1.5);
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
        const t = new PIXI.Graphics();
        t.beginFill(0x32f6ff, 0.18);
        t.drawCircle(0,0, Helpers.randi(1,2));
        t.endFill();
        t.x = b.x - b.vx*0.25;
        t.y = b.y - b.vy*0.25;
        t.filters = [new PIXI.filters.BlurFilter(2)];
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
