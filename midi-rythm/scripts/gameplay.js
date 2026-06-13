/* Gameplay module: session lifecycle, note render, input, judge, fever, FX */

async function startGame(chart, bpm, name, playbackNotes=[]){
    if(!Array.isArray(chart)){
      const imported = convertImportedChartData(chart, preferredImportedDifficulty());
      if(!imported) throw new Error('Unsupported chart format.');
      const targetMode = modeForLaneCount(imported.laneCount);
      if(targetMode && !state.started && state.mode !== targetMode){
        setMode(targetMode);
      }
      state.chartDebug = {
        imported:true,
        format:'external-difficulty-chart',
        difficulty:imported.difficultyName,
        sourceTracks:imported.sourceTracks
      };
      chart = imported.chart;
      bpm = bpm || imported.bpm || 120;
      name = name || `Imported Chart [${imported.difficultyName}]`;
    }

    state.started = false;
    setLoadingUI(true);
    try{
      await Tone.start();
      await ensureSampler();
    }catch(err){
      console.error(err);
      alert('오디오 샘플 로딩에 실패했습니다. 인터넷 연결을 확인해주세요.');
      setLoadingUI(false);
      return;
    }

    // 재시도용 저장 (원본 보존)
    state.lastChart = chart.map(n=>({...n}));
    state.lastBpm = bpm;
    state.lastName = name;
    state.lastPlayback = playbackNotes;

    _startGameInternal(chart, bpm, name, playbackNotes);
    setLoadingUI(false);
  }

  function _startGameInternal(chart, bpm, name, playbackNotes){
    state.notes = reindexChartNotes(chart.map(n=>({...n, hit:false, missed:false, holding:false})), { preserveState:false });
    state.playbackNotes = playbackNotes;
    state.sprites.forEach(s=>{ gsap.killTweensOf(s); gsap.killTweensOf(s.scale); s.destroy(); });
    state.sprites.clear();
    state.notesLayer.removeChildren();
    clearFxLayer();
    state.heldLanes.clear();
    state.editor.selectedUid = null;
    state.editor.drag = null;
    state.editor.windowStart = 0;
    releaseAllKeyGlows();
    state.score=0; state.combo=0; state.maxCombo=0; state.judged=0; state.hits=0; state.bpm=bpm;
    state.feverActive = false;
    state.feverLevel = 0;
    state.feverMultiplier = 1;
    clearFeverClasses();
    state.duration = Math.max(
      ...chart.map(n=> n.hold ? n.holdEnd : n.time),
      ...playbackNotes.map(n=>n.time+n.duration),
      0
    ) + 2;
    state.gameOver = false;

    scheduleSamplerPlayback(playbackNotes);
    state.startAt = performance.now()/1000 + 0.35;
    state.paused = false; state.pausedSum = 0; state.started = true;

    $('loader').style.display = 'none';
    $('resultScreen').classList.remove('active');
    $('meta').textContent = name;
    $('bpmText').textContent = `BPM ${bpm} / ${chart.length} notes`;
    $('totalTime').textContent = fmt(state.duration);
    buildChartExport();
    centerEditorWindow(0);
    refreshChartPanel();
    updateHud();

    Tone.Transport.seconds = 0;
    Tone.Transport.start('+0.35');
  }

  function retryGame(){
    if(!state.lastChart) return;
    $('resultScreen').classList.remove('active');
    _startGameInternal(state.lastChart, state.lastBpm, state.lastName, state.lastPlayback);
  }

  function backToMenu(){
    $('resultScreen').classList.remove('active');
    state.started = false; state.gameOver = false;
    Tone.Transport.stop(); Tone.Transport.cancel(0);
    state.heldLanes.clear();
    state.editor.selectedUid = null;
    state.editor.drag = null;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.judged = 0;
    state.hits = 0;
    state.feverActive = false;
    state.feverLevel = 0;
    state.feverMultiplier = 1;
    clearFeverClasses();
    clearFxLayer();
    releaseAllKeyGlows();
    $('score').textContent='0'; $('combo').textContent='0';
    $('acc').textContent='100%'; $('rank').textContent='-';
    $('progress').style.width='0%'; $('curTime').textContent='00:00';
    $('chartPanel')?.classList.remove('active');
    $('loader').style.display = 'grid';
    setLoadingUI(false);
  }

  // ─────────────────────────────────────────
  // GAME LOOP
  // ─────────────────────────────────────────
  function songTime(){
    if(!state.started) return 0;
    if(state.paused) return state.pauseAt - state.startAt - state.pausedSum;
    return performance.now()/1000 - state.startAt - state.pausedSum;
  }

  function tick(){
    tickBackground();
    updateKeyGlowFrame();
    updateHud();

    if(!state.started || state.paused || state.gameOver) return;
    const now = songTime();
    renderNotes(now);
    processAutoplay(now);
    checkAutoCompleteHolds(now);
    checkMiss(now);

    if(now >= state.duration){
      const allDone = state.notes.every(n => n.hit || n.missed);
      if(allDone) showResult();
    }
  }

  function processAutoplay(now){
    if(!state.autoplay) return;

    for(const n of state.notes){
      if(n.hit || n.missed || n.holding) continue;
      if(now < n.time) continue;

      setKeyGlow(n.lane, true);
      pulseKey(n.lane);

      if(n.hold){
        n.holding = true;
        state.heldLanes.set(n.lane, n.id);
      } else {
        n.hit = true;
        removeSprite(n.id);
        gsap.delayedCall(0.05, () => {
          if(state.autoplay && !state.heldLanes.has(n.lane)) setKeyGlow(n.lane, false);
        });
      }
      judge('PERFECT', 1000, n.lane);
    }
  }

  // ─────────────────────────────────────────
  // NOTE RENDER
  // 일반 노트: 하단이 판정선(hitY)에 닿을 때 progress=1
  //   → 하단 y = progress*hitY, 중심 y = 하단y - blockH/2
  // 홀드 노트: 머리(head)는 일반 노트처럼 떨어지고, 꼬리(tail)가 위로 이어짐
  //   - 누르고 있는 동안: 머리는 판정선에 고정, 꼬리가 위에서부터 줄어듦
  // ─────────────────────────────────────────
  function renderNotes(now){
    for(const n of state.notes){
      if(n.hit){ removeSprite(n.id); continue; }
      if(n.missed) continue; // 페이드 애니메이션이 별도 처리 후 제거

      const blockH = Math.max(28, Math.min(112, 30 + Math.min(n.duration,0.5)*120));

      if(n.holding){
        // 판정선에 고정, 꼬리만 줄어든다
        let s = state.sprites.get(n.id);
        if(!s){ s=createNote(n, blockH); state.sprites.set(n.id,s); state.notesLayer.addChild(s); }
        s.x = laneCenter(n.lane);
        s.y = state.hitY - blockH/2;
        s.alpha = 1;
        if(s.headGraphic) s.headGraphic.visible = false;
        if(s.holdCapGraphic){
          s.holdCapGraphic.visible = true;
          s.holdCapGraphic.alpha = 0.96;
          const capPulse = 1 + Math.sin(now * 18) * 0.035;
          s.holdCapGraphic.scale.set(capPulse, 1);
        }
        if(s.tailGraphic){
          const remaining = Math.max(0, n.holdEnd - now);
          const holdHeadH = Math.max(10, blockH * 0.24);
          drawTail(s.tailGraphic, state.laneW*0.42, holdHeadH, remaining*state.speed, true, n.lane);
        }
        emitHoldParticles(n, now);
        continue;
      }

      const appear = n.time - FALL_TIME;
      const past = n.time + BAD + 0.05;
      if(now < appear || now > past){ removeSprite(n.id); continue; }

      let s = state.sprites.get(n.id);
      if(!s){ s=createNote(n, blockH); state.sprites.set(n.id,s); state.notesLayer.addChild(s); }

      const progress = (now - appear) / FALL_TIME;
      s.x = laneCenter(n.lane);
      s.y = progress * state.hitY - blockH / 2;
      s.alpha = Math.max(0.20, Math.min(1, 0.18 + progress * 1.5));
      if(s.headGraphic) s.headGraphic.visible = true;
      if(s.holdCapGraphic){
        s.holdCapGraphic.visible = false;
        s.holdCapGraphic.scale.set(1,1);
      }

      if(s.tailGraphic){
        const tailLen = n.duration * state.speed;
        drawTail(s.tailGraphic, state.laneW*0.52, blockH, tailLen, false, n.lane);
      }
    }
  }

  function checkAutoCompleteHolds(now){
    for(const n of state.notes){
      if(n.holding && now >= n.holdEnd){
        n.holding = false; n.hit = true;
        state.heldLanes.delete(n.lane);
        if(state.autoplay) setKeyGlow(n.lane, false);
        removeSprite(n.id);
        state.score += 300; // 홀드 완수 보너스 (콤보는 헤드 판정 시 이미 반영됨)
      }
    }
  }

  function createNote(n, blockH){
    const w = state.laneW * 0.62;
    const h = Math.max(blockH * 0.78, 18);
    const col = laneColor(n.lane);
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();

    // 네온 아우라: 바깥 광 -> 본체 -> 내부 광택 순으로, 필터 없이 처리
    g.roundRect(-w/2-8, -h/2-4, w+16, h+8, 8).fill({color:col, alpha:0.14});
    g.roundRect(-w/2, -h/2, w, h, 5).fill({color:0xf7f8fb, alpha:0.98});
    g.roundRect(-w/2, -h/2, w, h, 5).stroke({color:0xffffff, alpha:0.48, width:1});
    g.roundRect(-w/2+2, -h/2+2, w-4, h-4, 4).fill({color:col, alpha:0.92});
    g.roundRect(-w/2+4, -h/2+4, w-8, 5, 3).fill({color:0xffffff, alpha:0.46});

    const rows = Math.max(1, Math.min(4, Math.floor(h / 18)));
    const innerX = -w/2 + 5;
    const innerW = w - 10;
    const cellH = (h - 10) / rows;
    for(let r=1; r<rows; r++){
      const yy = -h/2 + 5 + r*cellH;
      g.moveTo(innerX, yy).lineTo(innerX+innerW, yy).stroke({color:0xffffff, alpha:0.18, width:1});
    }
    g.moveTo(0, -h/2+5).lineTo(0, h/2-5).stroke({color:0xffffff, alpha:0.10, width:1});

    c.addChild(g);
    c.headGraphic = g;
    c.noteWidth = w;
    c.noteHeight = h;
    c._laneColor = col;

    if(n.hold){
      const tail = new PIXI.Graphics();
      c.addChildAt(tail, 0);
      c.tailGraphic = tail;
      const holdCap = new PIXI.Graphics();
      drawHoldCap(holdCap, w, Math.max(10, h * 0.24), n.lane);
      holdCap.visible = false;
      c.addChild(holdCap);
      c.holdCapGraphic = holdCap;
    }
    return c;
  }

  function drawHoldCap(graphic, w, h, lane=0){
    const col = laneColor(lane);
    const capW = Math.max(22, w * 0.72);
    const capH = Math.max(8, h);
    graphic.clear();
    graphic.roundRect(-capW/2-8, -capH/2-6, capW+16, capH+12, capH).fill({color:col, alpha:0.16});
    graphic.roundRect(-capW/2, -capH/2, capW, capH, capH).fill({color:0xffffff, alpha:0.96});
    graphic.roundRect(-capW/2+2, -capH/2+2, capW-4, Math.max(4, capH-4), capH).fill({color:col, alpha:0.94});
    graphic.roundRect(-capW/2+4, -capH/2+2, capW-8, Math.max(2, capH*0.26), capH).fill({color:0xffffff, alpha:0.36});
  }

  // 홀드 꼬리 그리기: 헤드와 동일한 너비로, 길이는 화면 내로 제한
  function drawTail(tail, w, headH, tailLen, isHolding, lane=0){
    tail.clear();
    const maxLen = state.hitY * 0.85;
    tailLen = Math.min(tailLen, maxLen);
    if(tailLen <= 1) return;
    const col = laneColor(lane);
    const alpha = isHolding ? 0.64 : 0.38;
    tail.roundRect(-w/2-6, -headH/2 - tailLen - 2, w+12, tailLen+4, 6).fill({color:col, alpha:alpha*0.18});
    tail.roundRect(-w/2, -headH/2 - tailLen, w, tailLen, 4).fill({color:0xffffff, alpha:0.92});
    tail.roundRect(-w/2+2, -headH/2 - tailLen + 2, w-4, Math.max(0, tailLen-4), 3).fill({color:col, alpha});

    const segments = Math.min(16, Math.floor(tailLen / 28));
    for(let i=1;i<=segments;i++){
      const y = -headH/2 - i*(tailLen/(segments+1));
      tail.moveTo(-w/2+3, y).lineTo(w/2-3, y).stroke({color:0xffffff, alpha:isHolding?0.20:0.10, width:1});
    }
    tail.roundRect(-w/2+1, -headH/2 - tailLen - 1, w-2, 4, 2).fill({color:0xffffff, alpha:isHolding?0.92:0.66});
  }

  function emitHoldParticles(note, now){
    if(now < (note.holdFxAt || 0)) return;
    note.holdFxAt = now + HOLD_PARTICLE_INTERVAL;
    cleanupFx();

    const x = laneCenter(note.lane);
    const y = state.hitY - 6;
    const col = laneColor(note.lane);
    const count = state.feverActive ? 3 : 2;
    for(let i=0;i<count;i++){
      const p = new PIXI.Graphics();
      const size = 3 + Math.random() * 5;
      p.roundRect(-size/2, -size/2, size, size, Math.max(1, size * 0.35)).fill({color:i===0 ? 0xffffff : col, alpha:0.86});
      p.x = x + (Math.random() - 0.5) * state.laneW * 0.28;
      p.y = y + (Math.random() - 0.5) * 8;
      p.rotation = Math.random() * Math.PI;
      state.fx.addChild(p);

      const driftX = (Math.random() - 0.5) * 24;
      const driftY = -(18 + Math.random() * 34);
      gsap.to(p, {
        x:p.x + driftX,
        y:p.y + driftY,
        alpha:0,
        rotation:p.rotation + (Math.random() - 0.5) * 1.8,
        duration:0.28 + Math.random() * 0.18,
        ease:'power2.out',
        onComplete:()=>destroyFxObject(p)
      });
      gsap.to(p.scale,{x:0.45,y:0.45,duration:0.34,ease:'power1.in'});
    }
  }

  function removeSprite(id){
    const s=state.sprites.get(id); if(!s) return;
    gsap.killTweensOf(s); gsap.killTweensOf(s.scale);
    s.destroy({children:true}); state.sprites.delete(id);
  }

  // 미스 시 단조롭게 사라지는 대신 페이드+낙하+흔들림 효과
  function fadeOutMiss(n){
    const s = state.sprites.get(n.id);
    if(!s){ return; }
    gsap.killTweensOf(s); gsap.killTweensOf(s.scale);
    if(s.headGraphic) s.headGraphic.tint = 0x34404f;
    if(s.tailGraphic) s.tailGraphic.tint = 0x34404f;
    const startX = s.x;
    gsap.to(s, { y: s.y + 36, alpha: 0, duration: 0.34, ease: 'power1.in' });
    gsap.to(s.scale, { x: 0.82, y: 0.82, duration: 0.34, ease: 'power1.in' });
    gsap.to(s, { x: startX - 6, duration: 0.05, repeat: 5, yoyo: true, ease:'none',
      onComplete: () => removeSprite(n.id) });
  }

  // ─────────────────────────────────────────
  // INPUT
  // ─────────────────────────────────────────
  function onKeyDown(e){
    const k=e.key.toLowerCase();
    if(k==='f1'){ e.preventDefault(); playDemoFromUi(); return; }
    if(k==='f3'){ e.preventDefault(); watchDemoFromUi(); return; }
    if(k===' '){ togglePause(); return; }
    if(k==='f2'){ e.preventDefault(); toggleAutoplay(); return; }
    const lane = state.KEY_TO_LANE[k]; if(lane===undefined) return;
    if(state.autoplay){ e.preventDefault(); return; }
    if(e.repeat) return; // 키 반복(autorepeat) 무시
    e.preventDefault();
    setKeyGlow(lane, true);
    pulseKey(lane);
    if(!state.started || state.paused || state.gameOver) return;

    const now=songTime();
    const target = state.notes
      .filter(n=>!n.hit && !n.missed && !n.holding && n.lane===lane)
      .map(n=>({n,diff:Math.abs(n.time-now)}))
      .filter(x=>x.diff<=BAD)
      .sort((a,b)=>a.diff-b.diff)[0];

    if(!target){ judge('MISS',0,lane); return; }
    const n = target.n;

    if(n.hold){
      // 롱노트: 헤드 판정 후 holding 상태로 전환 (제거하지 않음)
      n.holding = true;
      state.heldLanes.set(lane, n.id);
      if(target.diff<=PERFECT) judge('PERFECT',1000,lane);
      else if(target.diff<=GOOD) judge('GOOD',650,lane);
      else judge('BAD',250,lane);
    } else {
      n.hit=true; removeSprite(n.id);
      if(target.diff<=PERFECT) judge('PERFECT',1000,lane);
      else if(target.diff<=GOOD) judge('GOOD',650,lane);
      else judge('BAD',250,lane);
    }
  }

  function onKeyUp(e){
    const k=e.key.toLowerCase();
    const lane = state.KEY_TO_LANE[k]; if(lane===undefined) return;
    if(state.autoplay) return;
    setKeyGlow(lane, false);
    const noteId = state.heldLanes.get(lane);
    if(noteId===undefined) return;
    state.heldLanes.delete(lane);

    const n = state.notes.find(x=>x.id===noteId);
    if(!n || n.hit || n.missed) return;

    const now = songTime();
    if(now >= n.holdEnd - GOOD){
      // 충분히 오래 눌렀음 → 정상 완료 (자동완성 로직과 중복 방지)
      if(!n.hit){
        n.holding = false; n.hit = true;
        removeSprite(n.id);
        state.score += Math.round(300 * (state.feverActive ? state.feverMultiplier : 1));
      }
    } else {
      // 너무 빨리 뗌 → BREAK (콤보 초기화)
      n.holding = false; n.missed = true;
      fadeOutMiss(n);
      state.judged++;
      breakCombo();
      showJudge('BREAK');
    }
  }

  function togglePause(){
    if(!state.started || state.gameOver) return;
    if(!state.paused){
      state.paused=true; state.pauseAt=performance.now()/1000;
      if(window.Tone) Tone.Transport.pause();
      centerEditorWindow(songTime());
    } else {
      state.paused=false; state.pausedSum += performance.now()/1000 - state.pauseAt;
      if(window.Tone) Tone.Transport.start();
    }
    refreshChartPanel();
  }

  // ─────────────────────────────────────────
  // JUDGE — 자동 miss는 항상 silent (텍스트 도배 방지) + 페이드 효과
  // ─────────────────────────────────────────
  function checkMiss(now){
    for(const n of state.notes){
      if(!n.hit && !n.missed && !n.holding && now > n.time + BAD){
        n.missed=true;
        fadeOutMiss(n);
        judge('MISS', 0, n.lane, true);
      }
    }
  }

  function judge(type, point, lane, silent=false){
    state.judged++;
    let displayType = type;
    if(type==='MISS'){
      breakCombo();
    } else {
      state.hits++;
      state.combo++;
      const feverEvent = updateFeverState();
      if(feverEvent.levelUp) displayType = `FEVER ${feverEvent.level}`;
      const baseScore = point + state.combo*10;
      state.score += Math.round(baseScore * (state.feverActive ? state.feverMultiplier : 1));
      if(state.combo > state.maxCombo) state.maxCombo = state.combo;
      smokeBurst(lane, type);
      pulseComboHud(displayType);
    }
    if(!silent) showJudge(displayType);
  }

  // ─────────────────────────────────────────
  // VISUAL FX
  // ─────────────────────────────────────────
  function breakCombo(){
    if(state.combo === 0 && !state.feverActive) return;
    state.combo = 0;
    updateFeverState();
  }

  function clearFeverClasses(){
    document.body.classList.remove('fever', 'fever-1', 'fever-2', 'fever-3');
  }

  function getFeverLevel(combo){
    let level = 0;
    for(let i=0;i<FEVER_STAGES.length;i++){
      if(combo >= FEVER_STAGES[i].combo) level = i + 1;
    }
    return level;
  }

  function updateFeverState(){
    const prevLevel = state.feverLevel;
    const level = getFeverLevel(state.combo);
    const active = level > 0;
    const stage = level ? FEVER_STAGES[level - 1] : null;

    state.feverLevel = level;
    state.feverActive = active;
    state.feverMultiplier = stage ? stage.multiplier : 1;

    clearFeverClasses();
    if(active){
      document.body.classList.add('fever', `fever-${level}`);
      if(level > prevLevel) pulseComboHud(`FEVER ${level}`);
    }
    return {
      level,
      active,
      levelUp: level > prevLevel
    };
  }

  function pulseComboHud(type='HIT'){
    const comboHud = $('comboHud');
    const comboBurst = $('comboBurst');
    if(!comboHud || !comboBurst) return;

    gsap.killTweensOf(comboHud);
    gsap.killTweensOf(comboBurst);
    const isFever = String(type).startsWith('FEVER');
    const scaleBoost = isFever ? (1.12 + state.feverLevel * 0.03) : state.feverActive ? 1.1 : 1.06;
    gsap.fromTo(comboHud, { y:10, scale:.96 }, { y:0, scale:1, duration:.20, ease:'power2.out' });
    gsap.fromTo(comboBurst, { scale:scaleBoost, opacity:1 }, { scale:1, opacity:1, duration:.22, ease:'back.out(1.8)' });
  }

  function showJudge(type){
    const el=$('judgeMsg'); el.textContent=type;
    el.style.color = type==='FEVER 3'?'#ffe7f0'
      : type==='FEVER 2'?'#ffe3c2'
      : type==='FEVER 1'?'#fff1bf'
      : type==='PERFECT'?'#ffffff'
      : type==='GOOD'?'#ef8cab'
      : type==='BAD'?'#ffd56f'
      : type==='BREAK'?'#ffb86d'
      : '#c6ced8';
    gsap.killTweensOf(el);
    gsap.fromTo(el,{opacity:0,y:12,scale:.88,letterSpacing:'.28em'},{opacity:1,y:0,scale:1,duration:.055,ease:'power2.out',
      onComplete:()=>gsap.to(el,{opacity:0,y:-18,scale:1.08,letterSpacing:'.34em',duration:.38,delay:.055,ease:'power2.out'})});
  }

  function cleanupFx(){
    while(state.fx.children.length > MAX_FX_CHILDREN){
      const old = state.fx.children[0];
      destroyFxObject(old);
    }
  }

  function destroyFxObject(displayObject){
    if(!displayObject || displayObject.destroyed) return;
    gsap.killTweensOf(displayObject);
    if(displayObject.scale) gsap.killTweensOf(displayObject.scale);
    if(displayObject.parent) displayObject.parent.removeChild(displayObject);
    displayObject.destroy({children:true});
  }

  function clearFxLayer(){
    if(!state.fx) return;
    const children = [...state.fx.children];
    for(const child of children) destroyFxObject(child);
    state.fx.removeChildren();
  }

  function smokeBurst(lane,type){
    const x=laneCenter(lane), y=state.hitY;
    const base = laneColor(lane);
    const feverLevel = state.feverLevel || 0;
    const alt = feverLevel >= 3 ? 0xff7a8e : feverLevel === 2 ? 0xff9b68 : type==='PERFECT' ? 0xffc24b : 0x7dff75;
    cleanupFx();

    // 히트 라인 광폭 플래시: 큰 효과지만 오브젝트 1개라 가볍다.
    const line = new PIXI.Graphics();
    line.rect(state.startX-40, y-8, state.totalW+80, 18).fill({color:base, alpha:(type==='PERFECT'?0.26:0.18) + feverLevel*0.04});
    line.rect(state.startX-24, y-2, state.totalW+48, 4).fill({color:0xffffff, alpha:.92});
    state.fx.addChild(line);
    gsap.to(line,{alpha:0,duration:.20,ease:'power2.out',onComplete:()=>destroyFxObject(line)});

    const ring = new PIXI.Graphics();
    ring.circle(0,0,18).stroke({color:base, alpha:.78, width:3});
    ring.circle(0,0,34).stroke({color:alt, alpha:.32, width:2});
    ring.x=x; ring.y=y; state.fx.addChild(ring);
    gsap.to(ring.scale,{x:2.15,y:2.15,duration:.42,ease:'power3.out'});
    gsap.to(ring,{alpha:0,duration:.42,ease:'power2.out',onComplete:()=>destroyFxObject(ring)});

    if(feverLevel > 0){
      const aura = new PIXI.Graphics();
      aura.circle(0,0,28 + feverLevel * 6).stroke({color:alt, alpha:.34 + feverLevel * 0.08, width:2 + feverLevel});
      aura.x=x; aura.y=y; state.fx.addChild(aura);
      gsap.to(aura.scale,{x:2.3 + feverLevel * 0.15,y:2.3 + feverLevel * 0.15,duration:.42,ease:'power3.out'});
      gsap.to(aura,{alpha:0,duration:.38,ease:'power2.out',onComplete:()=>destroyFxObject(aura)});
    }

    // 원형 연기 대신 '미노' 조각. 개수 제한으로 빠르게 유지.
    const count = (type==='PERFECT' ? 22 : 15) + feverLevel * 6;
    for(let i=0;i<count;i++){
      const p=new PIXI.Graphics();
      const size=5 + Math.random()*8;
      const col = i%3===0 ? 0xffffff : (i%3===1 ? base : alt);
      p.roundRect(-size/2,-size/2,size,size,Math.max(1,size*.16)).fill({color:col, alpha:.88});
      p.roundRect(-size/2,-size/2,size,size,Math.max(1,size*.16)).stroke({color:0xffffff, alpha:.22, width:1});
      p.x=x+(Math.random()-.5)*state.laneW*.35;
      p.y=y+(Math.random()-.5)*10;
      p.rotation=Math.random()*Math.PI;
      state.fx.addChild(p);
      const angle = (-Math.PI/2) + (Math.random()-.5)*1.9;
      const dist = 58 + Math.random()*118;
      gsap.to(p,{x:p.x+Math.cos(angle)*dist,y:p.y+Math.sin(angle)*dist,rotation:p.rotation+(Math.random()-.5)*5.8,alpha:0,duration:.48+Math.random()*.32,ease:'power3.out',onComplete:()=>destroyFxObject(p)});
      gsap.to(p.scale,{x:.35,y:.35,duration:.52,ease:'power2.in'});
    }

    // 수직 빛기둥. 레인마다 한 개만 생성해 비용 대비 임팩트가 큼.
    const beam = new PIXI.Graphics();
    const bw = state.laneW * .82;
    beam.roundRect(-bw/2, -state.hitY*.72, bw, state.hitY*.72, 8).fill({color:base, alpha:type==='PERFECT'?0.22:0.12});
    beam.x=x; beam.y=y; state.fx.addChild(beam);
    gsap.to(beam,{alpha:0,y:y-24,duration:.28,ease:'power2.out',onComplete:()=>destroyFxObject(beam)});
  }

  function pulseKey(lane){
    const x=laneCenter(lane), y=state.hitY+18;
    const kh=62;
    const col = laneColor(lane);
    const g=new PIXI.Graphics();
    g.roundRect(x-state.laneW*.46, y-10, state.laneW*.92, kh+22, 16).fill({color:col, alpha:.18});
    g.roundRect(x-state.laneW*.40, y-2, state.laneW*.80, kh+6, 12).stroke({color:0xffffff, alpha:.72, width:2});
    state.fx.addChild(g);
    gsap.to(g,{alpha:0,duration:.20,ease:'power2.out',onComplete:()=>destroyFxObject(g)});
  }


  // ─────────────────────────────────────────
