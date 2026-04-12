window.EnemySystem = (() => {
  const { rand, randi } = Helpers;

  function getGlowFilterClass(){
    if (window.PIXI && PIXI.filters && PIXI.filters.GlowFilter) return PIXI.filters.GlowFilter;
    if (window.pixiFilters && window.pixiFilters.GlowFilter) return window.pixiFilters.GlowFilter;
    return null;
  }

  function makeGlowFilter({color=0x32f6ff, distance=18, outerStrength=2.2, innerStrength=0.4, quality=0.25} = {}){
    const Glow = getGlowFilterClass();
    if (Glow) return new Glow({ distance, outerStrength, innerStrength, color, quality });
    return null;
  }

  function asFilters(f){
    return f ? [f] : [];
  }

  function getTierByWaveAndRoll(){
    const wave = GameState.wave;
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
      hitT: 0,
      hpText,
      scoreBase: tier.scoreBase,
      glowColor: tier.glowColor
    };
  }

  function spawnEnemy(){
    const S = GameState;
    const tier = getTierByWaveAndRoll();
    const enemy = makeEnemy(tier);
    S.enemies.push(enemy);
    S.waveAlive++;
    S.spawnedCount++;

    if (tier === "boss") {
      UI.triggerBossWarning();
    }
  }

  return {
    spawnEnemy
  };
})();
