window.Helpers = {
  clamp: (v,a,b)=>Math.max(a,Math.min(b,v)),
  lerp:  (a,b,t)=>a+(b-a)*t,
  rand:  (a,b)=>a+Math.random()*(b-a),
  randi: (a,b)=>Math.floor(a + Math.random()*(b-a+1)),
  dist2: (ax,ay,bx,by)=>{ const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; }
};

window.PixiFx = (() => {
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

  function emitParticle(x, y, color=0x32f6ff, count=10, power=1){
    const S = GameState;
    for (let i=0;i<count;i++){
      const p = new PIXI.Graphics();
      p.beginFill(color, 0.85);
      p.drawCircle(0,0, Helpers.randi(1,3));
      p.endFill();
      p.filters = asFilters(makeGlowFilter({
        color,
        distance: 10,
        outerStrength: 1.8,
        innerStrength: 0,
        quality: 0.2
      }));
      p.x = x;
      p.y = y;
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

  return { makeGlowFilter, asFilters, emitParticle };
})();
