window.Effects = (() => {
  function getCache(){
    return GameState.textureCache || (GameState.textureCache = {});
  }

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

  function getRenderer(){
    return GameState.app && GameState.app.renderer;
  }

  function makeTexture(cacheKey, draw){
    const cache = getCache();
    if (cache[cacheKey]) return cache[cacheKey];
    const renderer = getRenderer();
    if (!renderer) return PIXI.Texture.WHITE;

    const displayObject = draw();
    const texture = renderer.generateTexture(displayObject);
    if (displayObject.destroy) displayObject.destroy({ children:true });
    cache[cacheKey] = texture;
    return texture;
  }

  function makeCenteredSprite(texture, x, y, tint=0xffffff, alpha=1, scale=1){
    const spr = new PIXI.Sprite(texture);
    spr.anchor.set(0.5);
    spr.x = x;
    spr.y = y;
    spr.tint = tint;
    spr.alpha = alpha;
    spr.scale.set(scale);
    return spr;
  }

  function getParticleTexture(){
    return makeTexture("particle.circle", ()=>{
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff, 1);
      g.drawCircle(16, 16, 16);
      g.endFill();
      return g;
    });
  }

  function getTrailTexture(){
    return makeTexture("particle.trail", ()=>{
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff, 1);
      g.drawCircle(8, 8, 8);
      g.endFill();
      return g;
    });
  }

  function getBulletTexture(){
    return makeTexture("bullet.base", ()=>{
      const g = new PIXI.Graphics();
      g.beginFill(0xffffff, 0.95);
      g.drawRoundedRect(13, 0, 6, 20, 3);
      g.endFill();
      return g;
    });
  }

  function getEnemyTexture(tierKey, tier){
    return makeTexture(`enemy.${tierKey}`, ()=>{
      const c = new PIXI.Container();
      const aura = new PIXI.Graphics();
      const ring = new PIXI.Graphics();
      const inner = new PIXI.Graphics();
      const r = tier.radius;

      aura.beginFill(tier.fillColor, tierKey === "normal" ? 0.06 : 0.10);
      aura.drawCircle(0, 0, r + (tierKey === "boss" ? 16 : tierKey === "midboss" ? 10 : 6));
      aura.endFill();

      ring.beginFill(0x0b0b18, 1);
      ring.lineStyle(tierKey === "boss" ? 4 : tierKey === "midboss" ? 3 : 2, tier.lineColor, 0.95);
      ring.drawCircle(0, 0, r);
      ring.endFill();

      inner.beginFill(tier.fillColor, tierKey === "boss" ? 0.30 : tierKey === "midboss" ? 0.24 : tierKey === "elite" ? 0.20 : 0.16);
      inner.drawCircle(0, 0, r - 5);
      inner.endFill();

      c.addChild(aura, ring, inner);
      return c;
    });
  }

  function makeParticleSprite(x, y, color=0x32f6ff, size=1, alpha=0.85){
    return makeCenteredSprite(getParticleTexture(), x, y, color, alpha, size);
  }

  function makeTrailSprite(x, y, color=0x32f6ff, size=1, alpha=0.2){
    return makeCenteredSprite(getTrailTexture(), x, y, color, alpha, size);
  }

  function makeBulletSprite(x, y, ang, color=0x32f6ff){
    const spr = makeCenteredSprite(getBulletTexture(), x, y, color, 0.95, 1);
    spr.rotation = ang + Math.PI / 2;
    return spr;
  }

  function makeEnemySprite(tierKey, tier, x, y){
    return makeCenteredSprite(getEnemyTexture(tierKey, tier), x, y, 0xffffff, 1, 1);
  }

  function emitPulse(x, y, color=0xffffff, radius=120, life=20){
    const S = GameState;
    const ring = new PIXI.Graphics();
    ring.lineStyle(3, color, 0.9);
    ring.drawCircle(0, 0, 1);
    ring.x = x;
    ring.y = y;
    ring.scale.set(1);
    S.fx.addChild(ring);
    S.particles.push({
      spr: ring,
      x, y,
      vx: 0,
      vy: 0,
      life,
      maxLife: life,
      pulseRadius: radius,
      pulse: true
    });
  }

  function emitParticle(x, y, color=0x32f6ff, count=10, power=1){
    const S = GameState;
    for (let i=0;i<count;i++){
      const size = Helpers.rand(0.08, 0.18);
      const p = makeParticleSprite(x, y, color, size, 0.85);
      S.fx.addChild(p);

      const ang = Helpers.rand(0, Math.PI*2);
      const sp = Helpers.rand(1.5, 6.5) * power;
      S.particles.push({
        spr:p,
        x, y,
        vx:Math.cos(ang)*sp,
        vy:Math.sin(ang)*sp,
        life:Helpers.randi(18,36)
      });
    }
  }

  function emitPlayerExplosion(x, y){
    const S = GameState;
    emitPulse(x, y, 0xff9b59, 84, 18);
    emitPulse(x, y, 0x32f6ff, 52, 12);
    emitParticle(x, y, 0xff9b59, 18, 1.5);
    emitParticle(x, y, 0xff3edb, 14, 1.2);
    emitParticle(x, y, 0x32f6ff, 24, 1.8);

    const flash = makeParticleSprite(x, y, 0xffffff, 1.5, 0.9);
    S.fx.addChild(flash);
    S.particles.push({
      spr: flash,
      x, y,
      vx: 0,
      vy: 0,
      drag: 0.9,
      life: 10
    });

    for (let i=0; i<12; i++){
      const ang = (Math.PI * 2 * i) / 12 + Helpers.rand(-0.18, 0.18);
      const shard = makeTrailSprite(x, y, i % 2 === 0 ? 0xffc66d : 0x32f6ff, Helpers.rand(0.3, 0.48), 0.42);
      shard.rotation = ang;
      S.fx.addChild(shard);
      const speed = Helpers.rand(3.8, 7.2);
      S.particles.push({
        spr: shard,
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        drag: 0.9,
        life: Helpers.randi(14, 22)
      });
    }
  }

  return {
    makeGlowFilter,
    asFilters,
    emitParticle,
    emitPulse,
    emitPlayerExplosion,
    makeParticleSprite,
    makeTrailSprite,
    makeBulletSprite,
    makeEnemySprite
  };
})();
