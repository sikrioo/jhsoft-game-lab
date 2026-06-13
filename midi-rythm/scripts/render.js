/* Render module: layout, background, lanes, key visuals */

function resize(){
    state.w = innerWidth; state.h = innerHeight;
    state.laneW = Math.max(62, Math.min(104, state.w * 0.078) * (8/state.LANES) );
    state.laneW = Math.min(state.laneW, state.w * 0.78 / state.LANES);
    state.totalW = state.laneW * state.LANES;
    state.startX = (state.w - state.totalW) / 2;
    state.hitY = state.h * HIT_RATIO;
    state.speed = state.hitY / FALL_TIME; // px per second
    drawBg(); drawLanes(); drawKeys();
  }

  function drawBg(){
    state.bg.removeChildren();
    state.bgBlocks = [];

    const base = new PIXI.Graphics();
    base.rect(0,0,state.w,state.h).fill({color:0x232b37, alpha:1});
    base.rect(0,0,state.w,state.h*0.34).fill({color:0x3a4554, alpha:0.34});
    base.circle(state.w*.5, state.h*.16, Math.max(state.w,state.h)*.32).fill({color:0xffffff, alpha:0.05});

    const cx = state.w * 0.5;
    const depth = 7;
    for(let i=0;i<depth;i++){
      const t = i / depth;
      const width = state.w * (0.76 - t * 0.48);
      const height = state.h * (0.68 - t * 0.11);
      const y = state.h * (0.08 + t * 0.075);
      const tilt = 58 + t * 26;
      const left = cx - width / 2;
      const right = cx + width / 2;
      base.moveTo(left, y + tilt).lineTo(cx, y).lineTo(right, y + tilt).lineTo(cx, y + height).lineTo(left, y + tilt)
        .stroke({color:i===0?0xffffff:0x9aa6b7, alpha:0.34 - t*0.22, width:i===0?3:2});
    }

    const shade = new PIXI.Graphics();
    shade.rect(0,0,state.w*0.18,state.h).fill({color:0x1a2029, alpha:0.42});
    shade.rect(state.w*0.82,0,state.w*0.18,state.h).fill({color:0x1a2029, alpha:0.42});
    const glow = new PIXI.Graphics();
    glow.circle(cx, state.h*.84, state.totalW*0.92).fill({color:0xef8cab, alpha:0.09});
    glow.circle(cx, state.h*.20, state.totalW*0.48).fill({color:0xffffff, alpha:0.04});
    state.bg.addChild(base, shade, glow);
  }

  function createBgTetromino(i){
    const c = new PIXI.Container();
    const shape = TETRIS_SHAPES[i % TETRIS_SHAPES.length];
    const cell = 12 + Math.random()*14;
    const bgPalette = [0x35e7ff, 0xffc24b, 0xff4f6f, 0x8ea7ff];
    const col = bgPalette[i % bgPalette.length];
    const alpha = 0.030 + Math.random()*0.045;
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
    c.alpha = 0.42 + Math.random()*0.20;
    c.scale.set(0.76 + Math.random()*0.96);
    return c;
  }

  function tickBackground(){
    if(!state.bgBlocks?.length) return;
    const dt = Math.min(2.0, (state.app?.ticker?.deltaMS || 16.67) / 16.67);
    for(const b of state.bgBlocks){
      const n = b.node;
      b.phase += 0.004 * dt;
      n.y += b.speed * dt;
      n.x += Math.sin(b.phase) * b.drift * dt;
      n.rotation += b.rot * dt;
      n.alpha = b.baseAlpha * (0.84 + Math.sin(b.phase)*0.08);
      if(n.y > state.h + 90){
        n.y = -90;
        n.x = Math.random()*state.w;
      }
    }
  }

  function laneCenter(lane){ return state.startX + lane*state.laneW + state.laneW/2; }

  function drawLanes(){
    state.lanes.removeChildren();
    const g = new PIXI.Graphics();
    const panelX = state.startX - 18;
    const panelW = state.totalW + 36;
    g.roundRect(panelX-10, -18, panelW+20, state.h + 98, 16).fill({color:0x5b6674, alpha:0.50});
    g.roundRect(panelX, -10, panelW, state.h + 78, 12).fill({color:0x343d49, alpha:0.98});
    g.roundRect(panelX, -10, panelW, state.h + 78, 12).stroke({color:0xffffff, alpha:0.16, width:1});
    g.roundRect(panelX+10, 0, panelW-20, state.h + 48, 8).fill({color:0x141920, alpha:1});

    const cellH = 88;
    for(let i=0;i<state.LANES;i++){
      const x = state.startX + i*state.laneW;
      const col = laneColor(i);
      g.rect(x+1,0,state.laneW-2,state.h).fill({color:i%2?0x11161c:0x0d1217, alpha:1});
      g.moveTo(x,0).lineTo(x,state.h).stroke({color:0xffffff, alpha:0.09, width:1});
      for(let y=((i*19)%cellH); y<state.h; y+=cellH){
        g.moveTo(x+6,y).lineTo(x+state.laneW-6,y).stroke({color:0xffffff, alpha:0.018, width:1});
      }
      g.rect(x+state.laneW*.22,0,state.laneW*.56,state.h).fill({color:col, alpha:0.018});
    }
    const endX = state.startX + state.totalW;
    g.moveTo(endX,0).lineTo(endX,state.h).stroke({color:0xffffff, alpha:0.09, width:1});

    // 판정선: 필터 없이 여러 선을 겹쳐 네온 글로우 표현
    g.roundRect(panelX+8, state.hitY+12, panelW-16, 40, 10).fill({color:0x5b6572, alpha:0.96});
    g.roundRect(panelX+16, state.hitY+18, panelW-32, 10, 3).fill({color:0x2a313a, alpha:1});
    g.moveTo(state.startX-32,state.hitY).lineTo(state.startX+state.totalW+32,state.hitY).stroke({color:0xffe08d, alpha:0.42, width:8});
    g.moveTo(state.startX-44,state.hitY).lineTo(state.startX+state.totalW+44,state.hitY).stroke({color:0xffffff, alpha:0.96, width:2});
    for(let i=0;i<state.LANES;i++){
      const x = state.startX + i*state.laneW + state.laneW*.2;
      g.roundRect(x, state.hitY+22, state.laneW*.6, 22, 4).stroke({color:laneColor(i), alpha:0.42, width:2});
    }
    state.lanes.addChild(g);
  }

  function drawKeys(){
    state.keyLayer.removeChildren();
    state.keyButtons = [];
    state.pressedKeys?.clear?.();

    const keyY = state.hitY + 18;
    const kh = 42;

    for(let i=0;i<state.LANES;i++){
      const col = laneColor(i);
      const w = state.laneW * 0.68;
      const x = laneCenter(i) - w/2;

      const wrap = new PIXI.Container();
      wrap.x = x + w/2;
      wrap.y = keyY + kh/2;

      const shadow = new PIXI.Graphics();
      shadow.roundRect(-w/2-6,-kh/2+8,w+12,kh+12,8).fill({color:0x000000, alpha:0.22});

      const basePlate = new PIXI.Graphics();
      basePlate.roundRect(-w/2-6,-kh/2-6,w+12,kh+12,8).fill({color:0x6d7785, alpha:0.88});
      basePlate.roundRect(-w/2-6,-kh/2-6,w+12,kh+12,8).stroke({color:0xffffff, alpha:0.14, width:1});

      const bed = new PIXI.Graphics();
      bed.roundRect(-w/2-2,-kh/2-2,w+4,kh+4,6).fill({color:col, alpha:0.12});

      // 누르는 동안 "계속 보이는" 발광 레이어들.
      // 애니메이션 tween에만 의존하지 않고 updateKeyGlowFrame에서 매 프레임 alpha를 유지한다.
      const holdHalo3 = new PIXI.Graphics();
      holdHalo3.roundRect(-w/2-22, -kh/2-18, w+44, kh+36, 18).fill({color:col, alpha:1});
      holdHalo3.alpha = 0;

      const holdHalo2 = new PIXI.Graphics();
      holdHalo2.roundRect(-w/2-14, -kh/2-12, w+28, kh+24, 14).fill({color:col, alpha:1});
      holdHalo2.alpha = 0;

      const holdHalo1 = new PIXI.Graphics();
      holdHalo1.roundRect(-w/2-8, -kh/2-6, w+16, kh+12, 10).fill({color:col, alpha:1});
      holdHalo1.alpha = 0;

      const face = new PIXI.Graphics();
      face.roundRect(-w/2,-kh/2,w,kh,6).fill({color:0x444e5b, alpha:1});
      face.roundRect(-w/2,-kh/2,w,kh,6).stroke({color:0xffffff, alpha:0.14, width:1});
      face.roundRect(-w/2+2,-kh/2+2,w-4,kh-4,5).fill({color:0x2b313a, alpha:1});
      face.roundRect(-w/2+4,-kh/2+4,w-8,6,3).fill({color:0xffffff, alpha:0.14});

      const innerFace = new PIXI.Graphics();
      innerFace.roundRect(-w/2+5,-kh/2+10,w-10,kh-18,4).fill({color:col, alpha:0.20});

      const activeFill = new PIXI.Graphics();
      activeFill.roundRect(-w/2+2,-kh/2+2,w-4,kh-4,5).fill({color:col, alpha:1});
      activeFill.alpha = 0;

      const activeCore = new PIXI.Graphics();
      activeCore.roundRect(-w/2+5,-kh/2+7,w-10,kh-18,4).fill({color:0xffffff, alpha:1});
      activeCore.alpha = 0;

      const activeStroke = new PIXI.Graphics();
      activeStroke.roundRect(-w/2-1,-kh/2-1,w+2,kh+2,7).stroke({color:0xffffff, alpha:1, width:2});
      activeStroke.roundRect(-w/2-4,-kh/2-4,w+8,kh+8,9).stroke({color:col, alpha:0.82, width:2});
      activeStroke.alpha = 0;

      const accent = new PIXI.Graphics();
      accent.roundRect(-w/2+4,kh/2-8,w-8,4,2).fill({color:0xffffff, alpha:1});
      accent.alpha = 0.28;

      const label = new PIXI.Text({
        text:state.KEYS[i].toUpperCase(),
        style:{
          fill:0xfff7dd,
          fontSize:16,
          fontFamily:'Space Grotesk, Arial',
          fontWeight:'900',
          stroke:0x000000,
          strokeThickness:3
        }
      });
      label.anchor.set(0.5);
      label.y = -1;

      wrap.addChild(shadow, basePlate, bed, holdHalo3, holdHalo2, holdHalo1, face, innerFace, activeFill, activeCore, activeStroke, accent, label);
      state.keyLayer.addChild(wrap);

      state.keyButtons[i] = {
        wrap, holdHalo1, holdHalo2, holdHalo3,
        activeFill, activeCore, activeStroke, accent, label,
        baseY:wrap.y, color:col, down:false, glow:0, targetGlow:0, pulse:Math.random()*Math.PI*2
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
      key.label.tint = 0xfff7dd;
    }

    applyKeyGlowVisual(key);
  }

  function applyKeyGlowVisual(key){
    const g = key.glow || 0;
    const pulse = key.down ? (0.92 + Math.sin(state.keyGlowTime*8 + key.pulse)*0.08) : 1;

    key.holdHalo3.alpha = 0.16 * g * pulse;
    key.holdHalo2.alpha = 0.28 * g * pulse;
    key.holdHalo1.alpha = 0.48 * g * pulse;

    key.activeFill.alpha = 0.84 * g;
    key.activeCore.alpha = 0.24 * g * pulse;
    key.activeStroke.alpha = 0.92 * g;
    key.accent.alpha = 0.42 + 0.46 * g;

    // Pixi Text의 dropShadow 스타일은 브라우저/버전에 따라 비용과 반영이 다르므로
    // 버튼 자체 발광으로 확실하게 보이도록 처리한다.
    key.label.alpha = 0.86 + 0.14 * g;
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
      key.wrap.y = key.baseY;
      key.wrap.scale.set(1);
      key.label.tint = 0xf4fbff;
      applyKeyGlowVisual(key);
    }
  }

  // ─────────────────────────────────────────
  // MIDI LOAD
  // ─────────────────────────────────────────
