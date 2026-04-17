window.CombatSystem = (() => {
  const { dist2 } = Helpers;

  function makeBullet(x,y,ang,damage,speed,pierce){
    const S = GameState;
    const g = new PIXI.Graphics();
    g.beginFill(0x32f6ff, 0.95);
    g.drawRoundedRect(-3,-10,6,20,3);
    g.endFill();
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

      if (b.life <= 0 || b.x < -80 || b.x > w+80 || b.y < -80 || b.y > h+80){
        S.fx.removeChild(b.spr);
        S.bullets.splice(i,1);
        continue;
      }

      for (let j=S.enemies.length-1; j>=0; j--){
        const e = S.enemies[j];
        const rr = b.r + e.r;
        if (dist2(b.x,b.y,e.x,e.y) < rr*rr){
          e.hp -= b.dmg;
          e.hitT = 6;
          e.hpText.text = String(Math.max(0, Math.floor(e.hp)));

          if (e.hp <= 0){
            S.uiLayer.removeChild(e.spr);
            S.enemies.splice(j,1);
            S.waveAlive--;
            S.combo = Math.min(6, S.combo + (e.tier === "boss" ? 0.55 : e.tier === "midboss" ? 0.28 : 0.12));
            S.comboT = 120;
            S.score += e.scoreBase * S.combo;
          } else {
            S.score += 4 * S.combo;
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
    }
  }

  return {
    tryShoot,
    updateBullets
  };
})();
