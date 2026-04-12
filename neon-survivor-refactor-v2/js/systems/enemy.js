window.EnemySystem = (() => {
  const { rand, randi } = Helpers;
  const { makeGlowFilter, asFilters } = PixiFx;

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
    const tier = CONFIG.ENEMY_TIERS[tierKey];
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;

    const side = randi(0,3);
    let x=0, y=0;
    const pad = 60;
    if (side===0){ x=-pad; y=rand(0,h); }
    if (side===1){ x=w+pad; y=rand(0,h); }
    if (side===2){ x=rand(0,w); y=-pad; }
    if (side===3){ x=rand(0,w); y=h+pad; }

    const c = new PIXI.Container();
    const aura = new PIXI.Graphics();
    const ring = new PIXI.Graphics();
    const inner = new PIXI.Graphics();

    const r = tier.radius;
    const hits = randi(tier.hitsMin, tier.hitsMax);

    aura.beginFill(tier.fillColor, tierKey === "normal" ? 0.06 : 0.10);
    aura.drawCircle(0,0,r + (tierKey === "boss" ? 16 : tierKey === "midboss" ? 10 : 6));
    aura.endFill();
    aura.filters = [new PIXI.filters.BlurFilter(tierKey === "boss" ? 10 : 6)];

    ring.beginFill(0x0b0b18, 1);
    ring.lineStyle(tierKey === "boss" ? 4 : tierKey === "midboss" ? 3 : 2, tier.lineColor, 0.95);
    ring.drawCircle(0,0,r);
    ring.endFill();

    inner.beginFill(tier.fillColor, tierKey === "boss" ? 0.30 : tierKey === "midboss" ? 0.24 : tierKey === "elite" ? 0.20 : 0.16);
    inner.drawCircle(0,0,r-5);
    inner.endFill();
    inner.filters = [new PIXI.filters.BlurFilter(2)];

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

    c.addChild(aura, ring, inner, hpText);
    c.filters = asFilters(makeGlowFilter({
      color: tier.glowColor,
      distance: tier.glowDistance,
      outerStrength: tier.glowOuter,
      innerStrength: tier.glowInner,
      quality: 0.25
    }));

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
      sp: rand(tier.moveSpeedMin, tier.moveSpeedMax),
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

    if (tier === "boss") {
      UI.triggerBossWarning();
    }
  }

  function updateEnemies(dt){
    const S = GameState;
    const p = S.player;
    for (let i=S.enemies.length-1; i>=0; i--){
      const e = S.enemies[i];
      let dx = p.spr.x - e.x;
      let dy = p.spr.y - e.y;
      const d = Math.hypot(dx,dy) || 1;
      dx /= d;
      dy /= d;

      if (e.tier === "normal"){
        const wig = Math.sin((performance.now()/1000)*5 + i) * 0.18;
        const ca = Math.cos(wig), sa = Math.sin(wig);
        const ndx = dx*ca - dy*sa;
        const ndy = dx*sa + dy*ca;
        dx = ndx; dy = ndy;
      }
      if (e.tier === "elite"){
        const wig = Math.sin((performance.now()/1000)*6 + i) * 0.28;
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
          S.stats.hp -= e.dmg;
          p.inv = 30;
          PixiFx.emitParticle(p.spr.x, p.spr.y, e.glowColor, 18, 1.2);
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
