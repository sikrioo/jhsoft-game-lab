/* Render module: layout, background, lanes, key visuals */

  function resize(){
    state.w = innerWidth; state.h = innerHeight;
    state.laneW = Math.max(62, Math.min(104, state.w * 0.078) * (8/state.LANES) );
    state.laneW = Math.min(state.laneW, state.w * 0.78 / state.LANES);
    state.laneW = Math.max(50, Math.min(82, state.laneW * 0.88));
    state.totalW = state.laneW * state.LANES;
    state.startX = (state.w - state.totalW) / 2;
    state.hitY = state.h * HIT_RATIO;
    state.speed = state.hitY / FALL_TIME; // px per second
    if(state.playfield){
      state.playfield.pivot.set(state.w / 2, state.h / 2);
      state.playfield.position.set(state.w / 2, state.h / 2);
    }
    drawBg(); drawLanes(); drawKeys();
  }


  function themeVisuals(){
    return {
      bgBase:0x060c18,
      bgTop:0x17315d,
      bgOrb:0xff69b5,
      depthMain:0x62d8ff,
      depthAlt:0xff78ba,
      sideShade:0x040914,
      floorGlow:0x54cbff,
      ceilingGlow:0xff77bf,
      laneShell:0x1b2f50,
      laneFrame:0x10203a,
      laneCore:0x08111f,
      laneA:0x0a1630,
      laneB:0x0d1c3a,
      laneLine:0x8ee6ff,
      laneGrid:0xff88c8,
      judgeBase:0x10264a,
      judgeSlot:0x040b16,
      judgeGlow:0xffffff,
      judgeCore:0xf7fbff,
      keyPlate:0x1b3867,
      keyFace:0x10213f,
      keyInner:0x091428,
      keyShine:0xf7fbff,
      keyLabel:'Rajdhani',
      bgPalette:[0x67d9ff, 0xff78b8, 0xa58eff, 0x7cf7c9]
    };
  }

  function drawBg(){
    state.bg.removeChildren();
    state.bgBlocks = [];
    const theme = themeVisuals();

    const base = new PIXI.Graphics();
    base.rect(0,0,state.w,state.h).fill({color:theme.bgBase, alpha:1});
    base.rect(0,0,state.w,state.h*0.50).fill({color:theme.bgTop, alpha:0.94});
    base.circle(state.w * 0.62, state.h * 0.16, Math.max(state.w, state.h) * 0.24).fill({color:0xff7dbf, alpha:0.18});
    base.circle(state.w * 0.30, state.h * 0.22, Math.max(state.w, state.h) * 0.18).fill({color:0x6be0ff, alpha:0.12});
    base.circle(state.w * 0.20, state.h * 0.82, state.w * 0.16).fill({color:0x6be0ff, alpha:0.06});
    base.circle(state.w * 0.82, state.h * 0.78, state.w * 0.20).fill({color:0xff8ac6, alpha:0.05});

    const beams = new PIXI.Graphics();
    for(let i=0;i<7;i++){
      const startX = state.w * (-0.08 + i * 0.18);
      const endX = startX + state.w * 0.22;
      const y = state.h * (0.08 + i * 0.02);
      const color = i % 2 ? 0x62d8ff : 0xff76bb;
      beams.moveTo(startX, y + 90).lineTo(endX, y).stroke({color, alpha:0.22 - i * 0.018, width:i < 2 ? 3 : 2});
    }

    const stars = new PIXI.Graphics();
    const starPositions = [
      [0.10,0.18,3.5],[0.82,0.24,2.5],[0.76,0.12,2.8],[0.18,0.70,3.6],[0.88,0.68,3.4],[0.12,0.54,2.2],[0.58,0.14,2.6],[0.68,0.28,2.0]
    ];
    for(const [sx, sy, radius] of starPositions){
      const color = sx > 0.5 ? 0xffd7ec : 0xd7f6ff;
      stars.circle(state.w * sx, state.h * sy, radius).fill({color, alpha:0.88});
      stars.circle(state.w * sx, state.h * sy, radius * 3.2).fill({color, alpha:0.10});
    }

    const mist = new PIXI.Graphics();
    mist.ellipse(state.w * 0.26, state.h * 0.82, state.w * 0.22, state.h * 0.11).fill({color:0x56ccff, alpha:0.08});
    mist.ellipse(state.w * 0.78, state.h * 0.84, state.w * 0.26, state.h * 0.14).fill({color:0xff7abf, alpha:0.07});
    mist.rect(0, state.h * 0.86, state.w, state.h * 0.18).fill({color:0x070d17, alpha:0.42});

    const sideShade = new PIXI.Graphics();
    sideShade.rect(0,0,state.w * 0.26,state.h).fill({color:theme.sideShade, alpha:0.40});
    sideShade.rect(state.w * 0.74,0,state.w * 0.26,state.h).fill({color:theme.sideShade, alpha:0.40});
    state.bg.addChild(base, beams, stars, mist, sideShade);

    const blockCount = Math.min(MAX_BG_BLOCKS, state.w < 900 ? 12 : 18);
    for(let i=0;i<blockCount;i++){
      const block = createBgTetromino(i);
      block.x = Math.random() * state.w;
      block.y = -80 + Math.random() * (state.h + 120);
      block.rotation = (Math.random() - 0.5) * 0.8;
      state.bg.addChild(block);
      state.bgBlocks.push({
        node:block,
        speed:0.22 + Math.random() * 0.46,
        drift:0.05 + Math.random() * 0.16,
        rot:(Math.random() - 0.5) * 0.008,
        phase:Math.random() * Math.PI * 2,
        baseAlpha:0.20 + Math.random() * 0.20
      });
    }

    const feverBackdrop = new PIXI.Graphics();
    feverBackdrop.alpha = 0;
    state.feverBackdrop = feverBackdrop;
    state.bg.addChild(feverBackdrop);
    syncFeverBackdrop(true);
  }

  function createBgTetromino(i){
    const theme = themeVisuals();
    const c = new PIXI.Container();
    const shape = TETRIS_SHAPES[i % TETRIS_SHAPES.length];
    const cell = 12 + Math.random()*14;
    const col = theme.bgPalette[i % theme.bgPalette.length];
    const alpha = 0.030 + Math.random() * 0.045;
    const g = new PIXI.Graphics();
    for(const [sx,sy] of shape){
      const x = (sx-1.5)*cell;
      const y = (sy-0.8)*cell;
      g.roundRect(x-2, y+2, cell*.92+4, cell*.92+4, Math.max(2, cell*.18)).fill({color:0x000000, alpha:alpha*.55});
      g.roundRect(x, y, cell*.92, cell*.92, Math.max(2, cell*.16)).fill({color:col, alpha});
      g.roundRect(x+2, y+2, cell*.92-4, cell*.24, Math.max(1, cell*.10)).fill({color:0xffffff, alpha:alpha*.64});
      g.roundRect(x+1, y+1, cell*.92-2, cell*.92-2, Math.max(2, cell*.12)).stroke({color:0xffffff, alpha:alpha*.38, width:1});
    }
    c.addChild(g);
    c.alpha = 0.42 + Math.random() * 0.20;
    c.scale.set(0.76 + Math.random()*0.96);
    return c;
  }

  function tickBackground(){
    if(!state.bgBlocks?.length) return;
    const dt = Math.min(2.0, (state.app?.ticker?.deltaMS || 16.67) / 16.67);
    const feverBoost = 1 + (state.feverLevel || 0) * (state.autoplay ? 0.03 : 0.08);
    for(const b of state.bgBlocks){
      const n = b.node;
      b.phase += 0.0048 * dt * feverBoost;
      n.y += b.speed * dt * feverBoost;
      n.x += Math.sin(b.phase) * b.drift * dt * 28;
      n.rotation += b.rot * dt * feverBoost;
      n.alpha = b.baseAlpha * (0.82 + Math.sin(b.phase) * (0.08 + (state.feverLevel || 0) * 0.018));
      if(n.y > state.h + 90){
        n.y = -90;
        n.x = Math.random()*state.w;
      }
    }
  }

  function syncFeverBackdrop(immediate=false){
    const backdrop = state.feverBackdrop;
    if(!backdrop) return;
    const level = state.feverLevel || 0;
    const liteFx = !!state.autoplay;
    backdrop.clear();
    if(level <= 0){
      if(immediate) backdrop.alpha = 0;
      else gsap.to(backdrop, { alpha:0, duration:0.26, ease:'power2.out' });
      return;
    }

    const color = level >= 3 ? 0xff6f8d : level === 2 ? 0xffa25f : 0xffd56f;
    const accent = level >= 3 ? 0xfff1cf : level === 2 ? 0xfff0d0 : 0xffffff;
    backdrop.circle(state.w * 0.5, state.hitY - state.h * 0.03, state.totalW * (0.62 + level * 0.10)).fill({color, alpha:0.10 + level * 0.03});
    backdrop.circle(state.w * 0.5, state.hitY - state.h * 0.12, state.totalW * (0.44 + level * 0.07)).fill({color:accent, alpha:0.045 + level * 0.012});
    backdrop.roundRect(state.startX - 34, state.hitY - 34, state.totalW + 68, 26 + level * 6, 18).fill({color, alpha:0.09 + level * 0.018});
    backdrop.moveTo(state.startX - 56, state.hitY - 2).lineTo(state.startX + state.totalW + 56, state.hitY - 2).stroke({color:accent, alpha:0.30 + level * 0.08, width:2 + level});

    if(immediate){
      backdrop.alpha = (liteFx ? 0.10 : 0.16) + level * (liteFx ? 0.05 : 0.09);
      backdrop.scale.set(1);
    } else {
      gsap.killTweensOf(backdrop);
      gsap.killTweensOf(backdrop.scale);
      backdrop.scale.set(liteFx ? 1 : 0.96, liteFx ? 1 : 0.96);
      gsap.to(backdrop, {
        alpha:(liteFx ? 0.10 : 0.16) + level * (liteFx ? 0.05 : 0.09),
        duration:liteFx ? 0.18 : 0.28,
        ease:'power2.out'
      });
      if(!liteFx){
        gsap.to(backdrop.scale, { x:1, y:1, duration:0.34, ease:'back.out(1.2)' });
      }
    }
  }

  function resetPlayfieldTransform(){
    if(!state.playfield) return;
    gsap.killTweensOf(state.playfield);
    gsap.killTweensOf(state.playfield.scale);
    state.playfield.position.set(state.w / 2, state.h / 2);
    state.playfield.scale.set(1, 1);
    state.playfield.rotation = 0;
  }

  function pulsePlayfieldCamera({strength=1, zoom=0.02, duration=0.24, rotate=0.003} = {}){
    if(!state.playfield) return;
    const rig = state.playfield;
    const baseX = state.w / 2;
    const baseY = state.h / 2;
    const punchX = (Math.random() - 0.5) * 18 * strength;
    const punchY = (Math.random() - 0.5) * 12 * strength;

    gsap.killTweensOf(rig);
    gsap.killTweensOf(rig.scale);
    gsap.timeline()
      .to(rig, {
        x:baseX + punchX,
        y:baseY + punchY,
        rotation:(Math.random() - 0.5) * rotate * strength,
        duration:duration * 0.32,
        ease:'power2.out'
      })
      .to(rig, {
        x:baseX,
        y:baseY,
        rotation:0,
        duration:duration * 0.68,
        ease:'power3.out'
      }, '>-0.02');
    gsap.fromTo(rig.scale, {
      x:1 + zoom * strength,
      y:1 + zoom * strength
    }, {
      x:1,
      y:1,
      duration:duration,
      ease:'power3.out'
    });
  }

  function flashLaneHit(lane, intensity=1, accentColor=null){
    const flash = state.laneHitFlashes?.[lane];
      if(flash){
        flash.tint = accentColor ?? laneColor(lane);
        gsap.killTweensOf(flash);
        gsap.killTweensOf(flash.scale);
        flash.alpha = 0.38 * intensity;
        flash.scale.set(1, 0.92);
        gsap.to(flash, { alpha:0, duration:0.26, ease:'power2.out' });
        gsap.to(flash.scale, { x:1, y:1.035, duration:0.20, ease:'power2.out' });
      }

      const linePulse = state.hitLinePulse;
      if(linePulse){
        linePulse.tint = accentColor ?? 0xffffff;
        gsap.killTweensOf(linePulse);
        gsap.killTweensOf(linePulse.scale);
        linePulse.alpha = 0.30 * intensity;
        linePulse.scale.set(0.975, 1);
        gsap.to(linePulse, { alpha:0, duration:0.22, ease:'power2.out' });
        gsap.to(linePulse.scale, { x:1.018, y:1, duration:0.20, ease:'power2.out' });
      }
    }

  function laneCenter(lane){ return state.startX + lane*state.laneW + state.laneW/2; }

  function drawLanes(){
    state.lanes.removeChildren();
    state.laneHitFlashes = [];
    state.hitLinePulse = null;
    const theme = themeVisuals();
    const shellW = state.totalW + state.laneW * 1.85;
    const shellX = state.startX - state.laneW * 0.925;
    const g = new PIXI.Graphics();
    g.roundRect(shellX - 16, -18, shellW + 32, state.h + 112, 18).fill({color:theme.laneShell, alpha:0.92});
    g.roundRect(shellX - 8, -10, shellW + 16, state.h + 88, 14).fill({color:theme.laneFrame, alpha:0.98});
    g.roundRect(shellX + 8, 0, shellW - 16, state.h + 62, 10).fill({color:theme.laneCore, alpha:1});
    g.roundRect(shellX - 8, -10, shellW + 16, 18, 14).fill({color:0x18305b, alpha:0.96});

    const inactiveW = state.laneW * 0.82;
    const activeBottom = state.hitY + 18;
    g.rect(shellX + 12, 0, inactiveW, activeBottom).fill({color:0x0d1730, alpha:0.96});
    g.rect(state.startX + state.totalW + state.laneW * 0.08, 0, inactiveW, activeBottom).fill({color:0x0d1730, alpha:0.96});
    g.moveTo(shellX + inactiveW + 16, 0).lineTo(shellX + inactiveW + 16, activeBottom).stroke({color:0x8fe6ff, alpha:0.20, width:1});
    g.moveTo(state.startX + state.totalW + state.laneW * 0.04, 0).lineTo(state.startX + state.totalW + state.laneW * 0.04, activeBottom).stroke({color:0xff82c3, alpha:0.20, width:1});

    const cellH = 64;
    for(let i=0;i<state.LANES;i++){
      const x = state.startX + i * state.laneW;
      const laneTint = laneColor(i);
      g.rect(x, 0, state.laneW, activeBottom).fill({color:i % 2 ? theme.laneB : theme.laneA, alpha:1});
      g.rect(x + state.laneW * 0.22, 0, state.laneW * 0.56, activeBottom).fill({color:laneTint, alpha:0.06});
      g.moveTo(x, 0).lineTo(x, activeBottom).stroke({color:0xffffff, alpha:0.12, width:1});
      for(let y=((i * 17) % cellH); y<activeBottom; y+=cellH){
        g.moveTo(x + 2, y).lineTo(x + state.laneW - 2, y).stroke({color:theme.laneGrid, alpha:0.045, width:1});
      }
    }
    g.moveTo(state.startX + state.totalW, 0).lineTo(state.startX + state.totalW, activeBottom).stroke({color:0xffffff, alpha:0.12, width:1});

    g.rect(shellX + 18, state.hitY - 12, shellW - 36, 22).fill({color:0xffffff, alpha:0.08});
    g.rect(shellX + 18, state.hitY - 3, shellW - 36, 6).fill({color:0xffffff, alpha:0.98});
    g.rect(shellX + 18, state.hitY + 4, shellW - 36, 9).fill({color:0x121621, alpha:0.90});
    for(let x=shellX + 20; x<shellX + shellW - 18; x+=16){
      g.moveTo(x, state.hitY + 4).lineTo(x + 8, state.hitY + 11).stroke({color:0x70d8ff, alpha:0.36, width:1});
    }

    state.lanes.addChild(g);

    const leftInactive = new PIXI.Text({
      text:'S\nI\nD\nE',
      style:{ fill:0xc8e6ff, fontSize:16, fontFamily:'Rajdhani, Arial', fontWeight:'700', align:'center', lineHeight:18, letterSpacing:2 }
    });
    leftInactive.anchor.set(0.5);
    leftInactive.x = shellX + inactiveW * 0.5 + 12;
    leftInactive.y = state.hitY * 0.56;
    leftInactive.alpha = 0.72;

    const rightInactive = new PIXI.Text({
      text:'S\nI\nD\nE',
      style:{ fill:0xffcbe4, fontSize:16, fontFamily:'Rajdhani, Arial', fontWeight:'700', align:'center', lineHeight:18, letterSpacing:2 }
    });
    rightInactive.anchor.set(0.5);
    rightInactive.x = state.startX + state.totalW + state.laneW * 0.49;
    rightInactive.y = state.hitY * 0.56;
    rightInactive.alpha = 0.72;
    state.lanes.addChild(leftInactive, rightInactive);

    const laneFx = new PIXI.Container();
    for(let i=0;i<state.LANES;i++){
      const x = state.startX + i * state.laneW;
      const col = laneColor(i);
      const flash = new PIXI.Graphics();
      flash.rect(x + 1, 4, state.laneW - 2, Math.max(120, state.hitY - 2)).fill({color:col, alpha:0.30});
      flash.alpha = 0;
      state.laneHitFlashes[i] = flash;
      laneFx.addChild(flash);
    }

    const linePulse = new PIXI.Graphics();
    linePulse.rect(shellX + 18, state.hitY - 10, shellW - 36, 20).fill({color:0xffffff, alpha:0.18});
    linePulse.alpha = 0;
    state.hitLinePulse = linePulse;
    laneFx.addChild(linePulse);
    state.lanes.addChild(laneFx);
  }

  function drawKeys(){
    state.keyLayer.removeChildren();
    state.keyButtons = [];
    state.pressedKeys?.clear?.();
    drawBemuseKeys(themeVisuals());
  }

  function drawBemuseKeys(theme){
    for(let i=0;i<state.LANES;i++){
      const col = laneColor(i);
      const w = state.laneW * 0.88;
      const x = laneCenter(i) - w / 2;
      const keyHeight = 48;

      const wrap = new PIXI.Container();
      wrap.x = x + w / 2;
      wrap.y = state.hitY + 32 + keyHeight / 2;

      const shadow = new PIXI.Graphics();
      shadow.roundRect(-w/2-8,-keyHeight/2+8,w+16,keyHeight+16,8).fill({color:0x000000, alpha:0.28});

      const basePlate = new PIXI.Graphics();
      basePlate.roundRect(-w/2-6,-keyHeight/2-6,w+12,keyHeight+12,8).fill({color:theme.keyPlate, alpha:0.98});
      basePlate.roundRect(-w/2-6,-keyHeight/2-6,w+12,keyHeight+12,8).stroke({color:0xffffff, alpha:0.14, width:1});

      const bed = new PIXI.Graphics();
      bed.roundRect(-w/2,-keyHeight/2,w,keyHeight,6).fill({color:theme.keyFace, alpha:1});
      bed.roundRect(-w/2,-keyHeight/2,w,keyHeight,6).stroke({color:col, alpha:0.18, width:1});

      const holdHalo3 = new PIXI.Graphics();
      holdHalo3.roundRect(-w/2-18, -keyHeight/2-16, w+36, keyHeight+32, 12).fill({color:col, alpha:1});
      holdHalo3.alpha = 0;

      const holdHalo2 = new PIXI.Graphics();
      holdHalo2.roundRect(-w/2-12, -keyHeight/2-10, w+24, keyHeight+20, 10).fill({color:col, alpha:1});
      holdHalo2.alpha = 0;

      const holdHalo1 = new PIXI.Graphics();
      holdHalo1.roundRect(-w/2-8, -keyHeight/2-6, w+16, keyHeight+12, 8).fill({color:col, alpha:1});
      holdHalo1.alpha = 0;

      const face = new PIXI.Graphics();
      face.roundRect(-w/2+2,-keyHeight/2+2,w-4,keyHeight-4,5).fill({color:theme.keyInner, alpha:1});
      face.roundRect(-w/2+2,-keyHeight/2+2,w-4,keyHeight-4,5).stroke({color:0xffffff, alpha:0.12, width:1});
      face.roundRect(-w/2+4,-keyHeight/2+4,w-8,8,4).fill({color:0xffffff, alpha:0.12});

      const innerFace = new PIXI.Graphics();
      innerFace.roundRect(-w/2+5,-keyHeight/2+12,w-10,keyHeight-22,4).fill({color:col, alpha:0.14});

      const activeFill = new PIXI.Graphics();
      activeFill.roundRect(-w/2+2,-keyHeight/2+2,w-4,keyHeight-4,5).fill({color:col, alpha:1});
      activeFill.alpha = 0;

      const activeCore = new PIXI.Graphics();
      activeCore.roundRect(-w/2+8,-keyHeight/2+8,w-16,keyHeight-16,4).fill({color:0xffffff, alpha:1});
      activeCore.alpha = 0;

      const activeStroke = new PIXI.Graphics();
      activeStroke.roundRect(-w/2-1,-keyHeight/2-1,w+2,keyHeight+2,7).stroke({color:0xffffff, alpha:0.85, width:1.5});
      activeStroke.roundRect(-w/2-5,-keyHeight/2-5,w+10,keyHeight+10,9).stroke({color:col, alpha:0.74, width:2});
      activeStroke.alpha = 0;

      const accent = new PIXI.Graphics();
      accent.roundRect(-w/2+8,keyHeight/2-10,w-16,4,2).fill({color:0xffffff, alpha:1});
      accent.alpha = 0.30;

      const labelDefaultTint = 0xdfe5ef;
      const label = new PIXI.Text({
        text:state.KEYS[i].toUpperCase(),
        style:{
          fill:labelDefaultTint,
          fontSize:20,
          fontFamily:`${theme.keyLabel}, Arial`,
          fontWeight:'900',
          stroke:0x000000,
          strokeThickness:3
        }
      });
      label.anchor.set(0.5);
      label.y = -2;

      wrap.addChild(shadow, basePlate, bed, holdHalo3, holdHalo2, holdHalo1, face, innerFace, activeFill, activeCore, activeStroke, accent, label);
      state.keyLayer.addChild(wrap);
      state.keyButtons[i] = {
        wrap, holdHalo1, holdHalo2, holdHalo3,
        activeFill, activeCore, activeStroke, accent, label,
        baseY:wrap.y, color:col, down:false, glow:0, targetGlow:0, pulse:Math.random()*Math.PI*2,
        impact:0,
        labelDefaultTint
      };
    }
  }

  function setKeyGlow(lane, isDown){
    const key = state.keyButtons?.[lane];
    if(!key) return;

    if(isDown){
      state.pressedKeys.add(lane);
      key.down = true;
      key.targetGlow = 1;
      key.wrap.y = key.baseY + 1;
      key.wrap.scale.set(0.978);
      key.label.tint = 0xffffff;
    } else {
      state.pressedKeys.delete(lane);
      key.down = false;
      key.targetGlow = 0;
      key.wrap.y = key.baseY;
      key.wrap.scale.set(1);
      key.label.tint = key.labelDefaultTint ?? 0xfff7dd;
    }

    applyKeyGlowVisual(key);
  }

  function applyKeyGlowVisual(key){
    const g = key.glow || 0;
    const impact = Math.max(0, key.impact || 0);
    const pulse = key.down ? (0.92 + Math.sin(state.keyGlowTime*8 + key.pulse)*0.08) : 1;
    const energy = Math.max(g, Math.min(1, impact));
    const labelScale = 1 + g * 0.015 + impact * 0.015;

    key.holdHalo3.alpha = Math.max(0.02 * impact, 0.03 * g * pulse);
    key.holdHalo2.alpha = Math.max(0.07 * impact, 0.10 * g * pulse);
    key.holdHalo1.alpha = Math.max(0.12 * impact, 0.18 * g * pulse);
    key.activeFill.alpha = Math.max(0.12 * impact, 0.28 * g);
    key.activeCore.alpha = Math.max(0.14 * impact, 0.22 * g * pulse);
    key.activeStroke.alpha = Math.max(0.10 * impact, 0.24 * g);
    key.accent.alpha = 0.30 + 0.18 * energy;
    key.label.alpha = Math.min(1, 0.90 + 0.08 * g + 0.08 * impact);
    key.label.scale.set(labelScale);
    key.label.tint = (key.down || impact > 0.32) ? 0xffffff : (key.labelDefaultTint ?? 0xdfe5ef);
  }

  function triggerKeyImpact(lane, strength=1){
    const key = state.keyButtons?.[lane];
    if(!key) return;
    key.impact = Math.max(key.impact || 0, Math.min(1.4, strength));
    applyKeyGlowVisual(key);
  }

  function updateKeyGlowFrame(){
    if(!state.keyButtons?.length) return;

    const dt = Math.min(0.05, (state.app?.ticker?.deltaMS || 16.67) / 1000);
    state.keyGlowTime += dt;

    for(const key of state.keyButtons){
      if(!key) continue;

      // keydown 상태는 set으로도 보존한다. tween이 끊겨도 targetGlow가 유지된다.
      const diff = key.targetGlow - key.glow;
      const speed = key.targetGlow > key.glow ? 20 : 10;
      key.glow += diff * Math.min(1, dt * speed);
      key.impact = Math.max(0, (key.impact || 0) - dt * (key.down ? 1.8 : 3.8));

      if(Math.abs(diff) < 0.002) key.glow = key.targetGlow;
      applyKeyGlowVisual(key);
    }
  }

  function releaseAllKeyGlows(){
    if(!state.keyButtons?.length) return;
    state.pressedKeys?.clear?.();
    for(let i=0;i<state.keyButtons.length;i++){
      const key = state.keyButtons[i];
      if(!key) continue;
      key.down = false;
      key.targetGlow = 0;
      key.glow = 0;
      key.impact = 0;
      key.wrap.y = key.baseY;
      key.wrap.scale.set(1);
      key.label.tint = key.labelDefaultTint ?? 0xfff7dd;
      key.label.scale.set(1);
      applyKeyGlowVisual(key);
    }
  }

  // ─────────────────────────────────────────
  // MIDI LOAD
  // ─────────────────────────────────────────
