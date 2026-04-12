window.EnemySystem = (() => {
  function getTierByWaveAndRoll(){
    const wave = GameState.progression.wave;
    const roll = Math.random();
    if (wave >= 10 && roll > 0.985) return "boss";
    if (wave >= 6  && roll > 0.94)  return "midboss";
    if (wave >= 3  && roll > 0.78)  return "elite";
    return "normal";
  }

  function makeEnemy(tierKey="normal"){
    const S = GameState;
    const tier = ENEMY_TIERS[tierKey];
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;

    const side = Helpers.randi(0,3);
    let x=0, y=0;
    const pad = 60;
    if (side===0){ x=-pad; y=Helpers.rand(0,h); }
    if (side===1){ x=w+pad; y=Helpers.rand(0,h); }
    if (side===2){ x=Helpers.rand(0,w); y=-pad; }
    if (side===3){ x=Helpers.rand(0,w); y=h+pad; }

    const r = tier.radius;
    const hits = Helpers.randi(tier.hitsMin, tier.hitsMax);
    const c = new PIXI.Container();
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

    c.addChild(body, hpText);

    c.x = x;
    c.y = y;
    S.uiLayer.addChild(c);

    return {
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
      hpText,
      scoreBase: tier.scoreBase,
      glowColor: tier.glowColor
    };
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
      let dx = p.spr.x - e.x;
      let dy = p.spr.y - e.y;
      const d = Math.hypot(dx,dy) || 1;
      dx /= d;
      dy /= d;

      if (e.tier === "normal"){
        const wig = Math.sin(now * 5 + i) * 0.18;
        const ca = Math.cos(wig), sa = Math.sin(wig);
        const ndx = dx*ca - dy*sa;
        const ndy = dx*sa + dy*ca;
        dx = ndx; dy = ndy;
      }
      if (e.tier === "elite"){
        const wig = Math.sin(now * 6 + i) * 0.28;
        const ca = Math.cos(wig), sa = Math.sin(wig);
        const ndx = dx*ca - dy*sa;
        const ndy = dx*sa + dy*ca;
        dx = ndx; dy = ndy;
      }

      e.x += dx * e.sp * dt;
      e.y += dy * e.sp * dt;
      e.spr.x = e.x;
      e.spr.y = e.y;
      e.spr.rotation = Math.atan2(dy, dx);
      e.hpText.rotation = -e.spr.rotation;

      if (e.hitT > 0){
        e.hitT -= dt;
        e.spr.alpha = 0.7;
      } else {
        e.spr.alpha = 1;
      }

      const rr = e.r + p.r;
      if (Helpers.dist2(e.x,e.y,p.spr.x,p.spr.y) < rr*rr){
        if (p.inv <= 0 && !S.stats.practice){
          const actualDamage = Math.max(1, e.dmg - S.stats.defense);
          S.stats.hp -= actualDamage;
          p.inv = 30;
          Effects.emitParticle(p.spr.x, p.spr.y, e.glowColor, 18, 1.2);
          if (S.stats.hp <= 0){
            S.stats.hp = 0;
            Boot.gameOver();
          }
        } else {
          p.vx += dx * -6;
          p.vy += dy * -6;
        }
      }
    }
  }

  return {
    spawnEnemy,
    updateEnemies
  };
})();
