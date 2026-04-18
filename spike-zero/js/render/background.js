window.BackgroundRenderer = (() => {
  function addNebula(target, x, y, radius, color, alpha, blur) {
    const g = new PIXI.Graphics();
    g.beginFill(color, alpha);
    g.drawCircle(0, 0, radius);
    g.endFill();
    g.x = x;
    g.y = y;
    g.filters = [new PIXI.filters.BlurFilter(blur)];
    target.addChild(g);
  }

  function addPlanet(target, options) {
    const planet = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.beginFill(options.bodyColor, options.bodyAlpha == null ? 0.95 : options.bodyAlpha);
    body.drawCircle(0, 0, options.radius);
    body.endFill();

    if (options.glowColor) {
      const glow = new PIXI.Graphics();
      glow.beginFill(options.glowColor, options.glowAlpha == null ? 0.18 : options.glowAlpha);
      glow.drawCircle(0, 0, options.glowRadius || (options.radius + 20));
      glow.endFill();
      glow.filters = [new PIXI.filters.BlurFilter(options.glowBlur || 18)];
      planet.addChild(glow);
    }

    planet.addChild(body);

    if (options.shadow) {
      const shadow = new PIXI.Graphics();
      shadow.beginFill(options.shadow.color, options.shadow.alpha);
      shadow.drawEllipse(
        options.shadow.x || 0,
        options.shadow.y || 0,
        options.shadow.rx || options.radius * 0.7,
        options.shadow.ry || options.radius * 0.9
      );
      shadow.endFill();
      planet.addChild(shadow);
    }

    if (options.ring) {
      const ring = new PIXI.Graphics();
      ring.lineStyle(options.ring.width || 4, options.ring.color, options.ring.alpha == null ? 0.55 : options.ring.alpha);
      ring.drawEllipse(0, 0, options.ring.rx, options.ring.ry);
      ring.rotation = options.ring.rotation || 0;
      if (options.ring.blur) ring.filters = [new PIXI.filters.BlurFilter(options.ring.blur)];
      planet.addChildAt(ring, 0);
    }

    planet.x = options.x;
    planet.y = options.y;
    target.addChild(planet);
  }

  function addStarfield(target, w, h, options = {}) {
    const starsSmall = new PIXI.Graphics();
    const starsMedium = new PIXI.Graphics();
    const starsLarge = new PIXI.Graphics();
    const count = options.count || 140;
    const tint = options.color || 0xffffff;
    const alphaMin = options.alphaMin == null ? 0.5 : options.alphaMin;
    const alphaMax = options.alphaMax == null ? 0.92 : options.alphaMax;

    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      const size = roll < 0.1 ? 2.2 : (roll < 0.38 ? 1.5 : 1);
      const alpha = alphaMin + Math.random() * (alphaMax - alphaMin);
      const x = Math.random() * w;
      const y = Math.random() * h;
      const starTarget = size > 2 ? starsLarge : (size > 1.1 ? starsMedium : starsSmall);
      starTarget.beginFill(tint, alpha);
      starTarget.drawCircle(x, y, size);
      starTarget.endFill();
    }

    starsMedium.filters = [new PIXI.filters.BlurFilter(options.mediumBlur || 0.8)];
    starsLarge.filters = [new PIXI.filters.BlurFilter(options.largeBlur || 1.2)];
    target.addChild(starsSmall, starsMedium, starsLarge);
  }

  function addGrid(target, w, h, options = {}) {
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, options.color || 0x5aa2ff, options.alpha == null ? 0.04 : options.alpha);
    const step = options.step || 72;
    for (let x = 0; x <= w; x += step) {
      grid.moveTo(x, 0);
      grid.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      grid.moveTo(0, y);
      grid.lineTo(w, y);
    }
    grid.filters = [new PIXI.filters.BlurFilter(options.blur || 1.2)];
    target.addChild(grid);
  }

  function addVignette(target, w, h, alpha = 0.32) {
    const vign = new PIXI.Graphics();
    vign.beginFill(0x000000, alpha);
    vign.drawRect(0, 0, w, h);
    vign.endFill();
    vign.blendMode = PIXI.BLEND_MODES.MULTIPLY;
    target.addChild(vign);
  }

  function addDustBand(target, options) {
    const band = new PIXI.Graphics();
    const length = options.length;
    const width = options.width;
    band.beginFill(options.color, options.alpha);
    band.drawEllipse(0, 0, length, width);
    band.endFill();
    band.rotation = options.rotation || 0;
    band.x = options.x;
    band.y = options.y;
    band.filters = [new PIXI.filters.BlurFilter(options.blur || 28)];
    target.addChild(band);
  }

  function addDebrisField(target, options) {
    const field = new PIXI.Container();
    const count = options.count || 24;
    for (let i = 0; i < count; i++) {
      const shard = new PIXI.Graphics();
      const w = (options.sizeMin || 6) + Math.random() * ((options.sizeMax || 18) - (options.sizeMin || 6));
      const h = w * (0.35 + Math.random() * 0.8);
      shard.beginFill(options.color || 0xcaa6ff, options.alpha == null ? 0.16 : options.alpha);
      shard.drawRoundedRect(-w * 0.5, -h * 0.5, w, h, Math.min(4, h * 0.4));
      shard.endFill();
      shard.rotation = (options.rotation || 0) + (-0.9 + Math.random() * 1.8);
      shard.x = (Math.random() - 0.5) * (options.spreadX || 300);
      shard.y = (Math.random() - 0.5) * (options.spreadY || 80);
      field.addChild(shard);
    }
    field.x = options.x;
    field.y = options.y;
    field.rotation = options.rotation || 0;
    if (options.blur) field.filters = [new PIXI.filters.BlurFilter(options.blur)];
    target.addChild(field);
  }

  function getStageTheme(stage, w, h) {
    const baseTheme = {
      bgColor: 0x04050b,
      nebulae: [
        { x: w * 0.18, y: h * 0.22, r: Math.min(w, h) * 0.34, c: 0x5b5dff, a: 0.1, blur: 70 },
        { x: w * 0.72, y: h * 0.26, r: Math.min(w, h) * 0.28, c: 0xff4db8, a: 0.08, blur: 70 },
        { x: w * 0.74, y: h * 0.74, r: Math.min(w, h) * 0.4, c: 0x2ddfff, a: 0.08, blur: 70 },
        { x: w * 0.32, y: h * 0.78, r: Math.min(w, h) * 0.3, c: 0x8b5cff, a: 0.08, blur: 70 }
      ],
      planets: [
        {
          x: w * 0.82,
          y: h * 0.2,
          radius: 70,
          bodyColor: 0x202f7a,
          glowColor: 0x4e74ff,
          glowAlpha: 0.18,
          glowRadius: 90,
          shadow: { color: 0x081026, alpha: 0.55, x: 12, y: 6, rx: 52, ry: 64 }
        },
        {
          x: w * 0.18,
          y: h * 0.74,
          radius: 48,
          bodyColor: 0x6a2b73,
          ring: { color: 0xffc86b, alpha: 0.55, width: 4, rx: 76, ry: 22, rotation: -0.35, blur: 1 }
        }
      ],
      stars: { count: 140, color: 0xffffff, alphaMin: 0.55, alphaMax: 0.9 },
      grid: { color: 0x5aa2ff, alpha: 0.04, step: 72, blur: 1.2 },
      vignetteAlpha: 0.32
    };

    if (stage === 2) {
      return {
        bgColor: 0x060309,
        nebulae: [
          { x: w * 0.08, y: h * 0.66, r: Math.min(w, h) * 0.34, c: 0xff6b8f, a: 0.08, blur: 72 },
          { x: w * 0.52, y: h * 0.14, r: Math.min(w, h) * 0.24, c: 0xffb347, a: 0.05, blur: 54 },
          { x: w * 0.82, y: h * 0.32, r: Math.min(w, h) * 0.38, c: 0xa646ff, a: 0.12, blur: 76 },
          { x: w * 0.72, y: h * 0.82, r: Math.min(w, h) * 0.28, c: 0xff4d6d, a: 0.08, blur: 64 }
        ],
        planets: [
          {
            x: w * -0.08,
            y: h * 0.88,
            radius: 170,
            bodyColor: 0x411224,
            glowColor: 0xff5f7d,
            glowAlpha: 0.16,
            glowRadius: 208,
            shadow: { color: 0x14060d, alpha: 0.42, x: 34, y: -10, rx: 126, ry: 156 }
          },
          {
            x: w * 0.78,
            y: h * 0.18,
            radius: 28,
            bodyColor: 0x8c3b57,
            glowColor: 0xffcf7a,
            glowAlpha: 0.12,
            glowRadius: 42
          }
        ],
        stars: { count: 120, color: 0xfff1f6, alphaMin: 0.42, alphaMax: 0.82, mediumBlur: 0.9, largeBlur: 1.4 },
        grid: { color: 0xff648b, alpha: 0.02, step: 88, blur: 1.8 },
        vignetteAlpha: 0.36,
        dustBands: [
          { x: w * 0.42, y: h * 0.52, length: Math.max(w, h) * 0.44, width: 42, color: 0xff9a62, alpha: 0.08, rotation: -0.42, blur: 28 },
          { x: w * 0.56, y: h * 0.46, length: Math.max(w, h) * 0.34, width: 22, color: 0xff5f90, alpha: 0.06, rotation: -0.42, blur: 18 }
        ],
        debrisFields: [
          { x: w * 0.42, y: h * 0.52, spreadX: 420, spreadY: 64, count: 26, color: 0xd6b0ff, alpha: 0.14, rotation: -0.42, blur: 0.4 },
          { x: w * 0.58, y: h * 0.48, spreadX: 260, spreadY: 36, count: 16, color: 0xffcf7a, alpha: 0.12, rotation: -0.42, blur: 0.2 }
        ]
      };
    }

    if (stage === 3) {
      return {
        bgColor: 0x010205,
        nebulae: [
          { x: w * 0.18, y: h * 0.16, r: Math.min(w, h) * 0.18, c: 0x24306f, a: 0.05, blur: 60 },
          { x: w * 0.84, y: h * 0.22, r: Math.min(w, h) * 0.32, c: 0x4a2a78, a: 0.08, blur: 92 },
          { x: w * 0.72, y: h * 0.78, r: Math.min(w, h) * 0.38, c: 0x10244e, a: 0.09, blur: 96 },
          { x: w * 0.28, y: h * 0.86, r: Math.min(w, h) * 0.26, c: 0x5c2a88, a: 0.06, blur: 74 }
        ],
        planets: [
          {
            x: w * 1.06,
            y: h * 0.12,
            radius: 132,
            bodyColor: 0x171532,
            glowColor: 0x5f57c8,
            glowAlpha: 0.1,
            glowRadius: 168,
            shadow: { color: 0x05060f, alpha: 0.58, x: -18, y: 10, rx: 98, ry: 120 }
          },
          {
            x: w * 0.14,
            y: h * 0.82,
            radius: 24,
            bodyColor: 0x2c315d,
            glowColor: 0x8290ff,
            glowAlpha: 0.08,
            glowRadius: 36
          }
        ],
        stars: { count: 90, color: 0xd8ddff, alphaMin: 0.24, alphaMax: 0.72, mediumBlur: 1.1, largeBlur: 1.6 },
        grid: { color: 0x6d78d6, alpha: 0.012, step: 96, blur: 2.2 },
        vignetteAlpha: 0.46,
        dustBands: [
          { x: w * 0.54, y: h * 0.4, length: Math.max(w, h) * 0.28, width: 18, color: 0x6a4dba, alpha: 0.05, rotation: -0.66, blur: 20 },
          { x: w * 0.62, y: h * 0.62, length: Math.max(w, h) * 0.24, width: 12, color: 0x3c5cff, alpha: 0.035, rotation: -0.66, blur: 14 }
        ],
        debrisFields: [
          { x: w * 0.5, y: h * 0.5, spreadX: 240, spreadY: 42, count: 10, color: 0x8992d8, alpha: 0.08, rotation: -0.66, blur: 0.6 }
        ]
      };
    }

    return baseTheme;
  }

  function drawBackground() {
    const S = GameState;
    const w = S.app.renderer.width;
    const h = S.app.renderer.height;
    const stage = Math.max(1, S.progression.stage || 1);
    const theme = getStageTheme(stage, w, h);

    S.bg.cacheAsBitmap = false;
    S.bg.removeChildren();
    S.bgGfx = new PIXI.Graphics();
    S.bgDecor = new PIXI.Container();
    S.bg.addChild(S.bgGfx, S.bgDecor);

    S.bgGfx.beginFill(theme.bgColor, 1);
    S.bgGfx.drawRect(0, 0, w, h);
    S.bgGfx.endFill();

    for (const nebula of theme.nebulae) {
      addNebula(S.bgDecor, nebula.x, nebula.y, nebula.r, nebula.c, nebula.a, nebula.blur);
    }

    for (const planet of theme.planets) {
      addPlanet(S.bgDecor, planet);
    }

    if (theme.dustBands) {
      for (const dustBand of theme.dustBands) addDustBand(S.bgDecor, dustBand);
    }

    if (theme.debrisFields) {
      for (const debrisField of theme.debrisFields) addDebrisField(S.bgDecor, debrisField);
    }

    addStarfield(S.bgDecor, w, h, theme.stars);
    addGrid(S.bgDecor, w, h, theme.grid);
    addVignette(S.bgDecor, w, h, theme.vignetteAlpha);

    // Freeze the background into a bitmap so gameplay updates don't keep
    // recompositing the large blurred space scene every frame.
    S.bg.cacheAsBitmap = true;
  }

  return { drawBackground };
})();
