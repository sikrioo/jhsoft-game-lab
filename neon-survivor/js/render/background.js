window.BackgroundRenderer = (() => {
  function addNebula(target, x, y, radius, color, alpha, blur){
    const g = new PIXI.Graphics();
    g.beginFill(color, alpha);
    g.drawCircle(0, 0, radius);
    g.endFill();
    g.x = x;
    g.y = y;
    g.filters = [new PIXI.filters.BlurFilter(blur)];
    target.addChild(g);
  }

  function drawBackground(){
    const S = GameState;
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;

    S.bg.cacheAsBitmap = false;
    S.bg.removeChildren();
    S.bgGfx = new PIXI.Graphics();
    S.bgDecor = new PIXI.Container();
    S.bg.addChild(S.bgGfx, S.bgDecor);

    S.bgGfx.beginFill(0x04050b, 1);
    S.bgGfx.drawRect(0,0,w,h);
    S.bgGfx.endFill();

    // nebula blobs
    const nebulae = [
      {x:w*0.18, y:h*0.22, r:Math.min(w,h)*0.34, c:0x5b5dff, a:0.10},
      {x:w*0.72, y:h*0.26, r:Math.min(w,h)*0.28, c:0xff4db8, a:0.08},
      {x:w*0.74, y:h*0.74, r:Math.min(w,h)*0.40, c:0x2ddfff, a:0.08},
      {x:w*0.32, y:h*0.78, r:Math.min(w,h)*0.30, c:0x8b5cff, a:0.08},
    ];

    for (const n of nebulae) addNebula(S.bgDecor, n.x, n.y, n.r, n.c, n.a, 70);

    // planets
    const planet1 = new PIXI.Container();
    const p1 = new PIXI.Graphics();
    p1.beginFill(0x202f7a, 0.95);
    p1.drawCircle(0,0, 70);
    p1.endFill();
    const p1Glow = new PIXI.Graphics();
    p1Glow.beginFill(0x4e74ff, 0.18);
    p1Glow.drawCircle(0,0, 90);
    p1Glow.endFill();
    p1Glow.filters = [new PIXI.filters.BlurFilter(18)];
    const p1Shadow = new PIXI.Graphics();
    p1Shadow.beginFill(0x081026, 0.55);
    p1Shadow.drawEllipse(12, 6, 52, 64);
    p1Shadow.endFill();
    planet1.addChild(p1Glow, p1, p1Shadow);
    planet1.x = w * 0.82;
    planet1.y = h * 0.20;
    S.bgDecor.addChild(planet1);

    const planet2 = new PIXI.Container();
    const p2 = new PIXI.Graphics();
    p2.beginFill(0x6a2b73, 0.95);
    p2.drawCircle(0,0, 48);
    p2.endFill();
    const ring = new PIXI.Graphics();
    ring.lineStyle(4, 0xffc86b, 0.55);
    ring.drawEllipse(0,0, 76, 22);
    ring.rotation = -0.35;
    ring.filters = [new PIXI.filters.BlurFilter(1)];
    planet2.addChild(ring, p2);
    planet2.x = w * 0.18;
    planet2.y = h * 0.74;
    S.bgDecor.addChild(planet2);

    // starfield: batch into a few graphics objects instead of 140 separate filtered nodes
    const starsSmall = new PIXI.Graphics();
    const starsMedium = new PIXI.Graphics();
    const starsLarge = new PIXI.Graphics();
    for (let i=0; i<140; i++){
      const roll = Math.random();
      const size = roll < 0.10 ? 2.2 : (roll < 0.38 ? 1.5 : 1);
      const alpha = Math.random() < 0.15 ? 0.9 : 0.55;
      const x = Math.random() * w;
      const y = Math.random() * h;
      const target = size > 2 ? starsLarge : (size > 1.1 ? starsMedium : starsSmall);
      target.beginFill(0xffffff, alpha);
      target.drawCircle(x, y, size);
      target.endFill();
    }
    starsMedium.filters = [new PIXI.filters.BlurFilter(0.8)];
    starsLarge.filters = [new PIXI.filters.BlurFilter(1.2)];
    S.bgDecor.addChild(starsSmall, starsMedium, starsLarge);

    // faint grid
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, 0x5aa2ff, 0.04);
    const step = 72;
    for (let x=0; x<=w; x+=step) { grid.moveTo(x,0); grid.lineTo(x,h); }
    for (let y=0; y<=h; y+=step) { grid.moveTo(0,y); grid.lineTo(w,y); }
    grid.filters = [new PIXI.filters.BlurFilter(1.2)];
    S.bgDecor.addChild(grid);

    // vignette
    const vign = new PIXI.Graphics();
    vign.beginFill(0x000000, 0.32);
    vign.drawRect(0,0,w,h);
    vign.endFill();
    vign.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    S.bgDecor.addChild(vign);

    // Freeze the background into a bitmap so gameplay updates don't keep
    // recompositing the large blurred space scene every frame.
    S.bg.cacheAsBitmap = true;
  }

  return { drawBackground };
})();
