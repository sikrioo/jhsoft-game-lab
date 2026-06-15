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
    clearActiveNoteSprites();
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
    state.renderStartIndex = 0;
    state.missIndex = 0;
    state.autoplayIndex = 0;
    state.hudNextUpdate = 0;
    state.lastCameraPulseAt = 0;
    state.lastBurstAt = 0;
    state.lastKeyPulseAt = 0;
    state.fxActiveParticles = 0;
    clearFeverClasses();
    resetPlayfieldTransform();
    syncFeverBackdrop(true);
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
    $('bpmText').textContent = `BPM ${bpm} / ${chart.length} NOTES`;
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
    state.renderStartIndex = 0;
    state.missIndex = 0;
    state.autoplayIndex = 0;
    state.lastCameraPulseAt = 0;
    state.lastBurstAt = 0;
    state.lastKeyPulseAt = 0;
    state.fxActiveParticles = 0;
    clearFeverClasses();
    clearActiveNoteSprites();
    clearFxLayer();
    releaseAllKeyGlows();
    resetPlayfieldTransform();
    syncFeverBackdrop(true);
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
    const realtime = performance.now() / 1000;
    if(realtime >= (state.hudNextUpdate || 0)){
      updateHud(state.started ? songTime() : 0);
      state.hudNextUpdate = realtime + 1 / (state.started && !state.paused ? 30 : 18);
    }

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

    while(state.autoplayIndex < state.notes.length){
      const n = state.notes[state.autoplayIndex];
      if(now < n.time) break;
      state.autoplayIndex++;
      if(n.hit || n.missed || n.holding) continue;

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
    while(state.renderStartIndex < state.notes.length){
      const lead = state.notes[state.renderStartIndex];
      if(lead.holding) break;
      if(!lead.hit && !lead.missed && now <= lead.time + BAD + 0.05) break;
      state.renderStartIndex++;
    }

    for(let i=state.renderStartIndex; i<state.notes.length; i++){
      const n = state.notes[i];
      if(n.hit){ removeSprite(n.id); continue; }
      if(n.missed) continue; // 페이드 애니메이션이 별도 처리 후 제거

      const blockH = Math.max(28, Math.min(112, 30 + Math.min(n.duration,0.5)*120));

      if(n.holding){
        // 판정선에 고정, 꼬리만 줄어든다
        let s = state.sprites.get(n.id);
        if(!s){ s=createNote(n, blockH); state.sprites.set(n.id,s); state.notesLayer.addChild(s); }
        else {
          const metrics = noteVisualMetrics(blockH);
          if(s.noteWidth !== metrics.w || s.noteHeight !== metrics.h) configureNoteSprite(s, n, blockH);
        }
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
          const holdTailW = state.laneW * 0.34;
          drawTail(s.tailGraphic, holdTailW, holdHeadH, remaining*state.speed, true, n.lane);
        }
        emitHoldParticles(n, now);
        continue;
      }

      const appear = n.time - FALL_TIME;
      const past = n.time + BAD + 0.05;
      if(appear > now + 0.04) break;
      if(now < appear || now > past){ removeSprite(n.id); continue; }

      let s = state.sprites.get(n.id);
      if(!s){ s=createNote(n, blockH); state.sprites.set(n.id,s); state.notesLayer.addChild(s); }
      else {
        const metrics = noteVisualMetrics(blockH);
        if(s.noteWidth !== metrics.w || s.noteHeight !== metrics.h) configureNoteSprite(s, n, blockH);
      }

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
        const fallingTailW = state.laneW * 0.38;
        drawTail(s.tailGraphic, fallingTailW, blockH, tailLen, false, n.lane);
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
    const pool = n.hold ? state.notePools.hold : state.notePools.single;
    const c = pool.pop() || buildNoteShell(n.hold);
    configureNoteSprite(c, n, blockH);
    c.visible = true;
    c.renderable = true;
    c.alpha = 1;
    c.rotation = 0;
    c.scale.set(1, 1);
    return c;
  }

  function noteVisualMetrics(blockH){
    return {
      w:state.laneW * 0.58,
      h:Math.max(20, Math.min(30, blockH * 0.44))
    };
  }

  function buildNoteShell(isHold){
    const c = new PIXI.Container();
    const head = new PIXI.Graphics();
    c.addChild(head);
    c.headGraphic = head;
    c._isHoldShell = !!isHold;
    if(isHold){
      const tail = new PIXI.Graphics();
      c.addChildAt(tail, 0);
      c.tailGraphic = tail;
      const holdCap = new PIXI.Graphics();
      c.addChild(holdCap);
      c.holdCapGraphic = holdCap;
    }
    return c;
  }

  function configureNoteSprite(c, n, blockH){
    const { w, h } = noteVisualMetrics(blockH);
    const variantKey = `${n.lane}|${n.hold ? 1 : 0}|${Math.round(w)}|${Math.round(h)}`;

    c.noteWidth = w;
    c.noteHeight = h;
    c._laneColor = laneColor(n.lane);

    if(c._variantKey !== variantKey){
      drawNoteHead(c.headGraphic, w, h, n.lane);
      c.headGraphic.visible = true;
      c.headGraphic.alpha = 1;
      c.headGraphic.tint = 0xffffff;
      if(c.holdCapGraphic){
        drawHoldCap(c.holdCapGraphic, w, Math.max(10, h * 0.24), n.lane);
        c.holdCapGraphic.visible = false;
        c.holdCapGraphic.alpha = 1;
        c.holdCapGraphic.tint = 0xffffff;
        c.holdCapGraphic.scale.set(1, 1);
      }
      if(c.tailGraphic){
        c.tailGraphic.clear();
        c.tailGraphic.alpha = 1;
        c.tailGraphic.tint = 0xffffff;
        c.tailGraphic._lastLen = -1;
        c.tailGraphic._lastWidth = null;
        c.tailGraphic._lastHeadH = null;
        c.tailGraphic._lastHolding = null;
        c.tailGraphic._lastLane = null;
      }
      c._variantKey = variantKey;
    }
  }

  function drawNoteHead(graphic, w, h, lane=0){
    const col = laneColor(lane);
    graphic.clear();

    graphic.roundRect(-w/2-8, -h/2-6, w+16, h+12, 8).fill({color:col, alpha:0.16});
    graphic.roundRect(-w/2-2, -h/2-2, w+4, h+4, 6).fill({color:0x000000, alpha:0.24});
    graphic.roundRect(-w/2, -h/2, w, h, 5).fill({color:col, alpha:0.96});
    graphic.roundRect(-w/2, -h/2, w, h, 5).stroke({color:0xffffff, alpha:0.30, width:1});
    graphic.roundRect(-w/2+2, -h/2+2, w-4, Math.max(4, h * 0.28), 4).fill({color:0xffffff, alpha:0.22});
    graphic.roundRect(-w/2+4, h/2-8, w-8, 4, 2).fill({color:0xffffff, alpha:0.42});
  }

  function drawHoldCap(graphic, w, h, lane=0){
    const col = laneColor(lane);
    const capW = Math.max(22, w * 0.72);
    const capH = Math.max(10, h);
    graphic.clear();
    graphic.roundRect(-capW/2-6, -capH/2-5, capW+12, capH+10, capH).fill({color:col, alpha:0.16});
    graphic.roundRect(-capW/2-2, -capH/2-2, capW+4, capH+4, capH).fill({color:0x000000, alpha:0.22});
    graphic.roundRect(-capW/2, -capH/2, capW, capH, capH).fill({color:col, alpha:0.98});
    graphic.roundRect(-capW/2, -capH/2, capW, capH, capH).stroke({color:0xffffff, alpha:0.30, width:1});
    graphic.roundRect(-capW/2+2, -capH/2+2, capW-4, Math.max(3, capH*0.34), capH).fill({color:0xffffff, alpha:0.22});
  }

  // 홀드 꼬리 그리기: 헤드와 동일한 너비로, 길이는 화면 내로 제한
  function drawTail(tail, w, headH, tailLen, isHolding, lane=0){
    const maxLen = state.hitY * 0.85;
    tailLen = Math.min(tailLen, maxLen);
    const quantizedLen = Math.max(0, Math.round(tailLen / 6) * 6);
    if(
      tail._lastLen === quantizedLen &&
      tail._lastWidth === w &&
      tail._lastHeadH === headH &&
      tail._lastHolding === isHolding &&
      tail._lastLane === lane
    ) return;
    tail._lastLen = quantizedLen;
    tail._lastWidth = w;
    tail._lastHeadH = headH;
    tail._lastHolding = isHolding;
    tail._lastLane = lane;
    tail.clear();
    if(quantizedLen <= 1) return;
    const col = laneColor(lane);
    tail.roundRect(-w/2-4, -headH/2 - quantizedLen - 2, w+8, quantizedLen+6, 8).fill({color:col, alpha:isHolding ? 0.16 : 0.10});
    tail.roundRect(-w/2, -headH/2 - quantizedLen, w, quantizedLen, 5).fill({color:col, alpha:isHolding ? 0.78 : 0.58});
    tail.roundRect(-w/2, -headH/2 - quantizedLen, w, quantizedLen, 5).stroke({color:0xffffff, alpha:isHolding ? 0.18 : 0.10, width:1});
    tail.roundRect(-w/2+2, -headH/2 - quantizedLen + 2, w-4, Math.max(2, quantizedLen * 0.14), 4).fill({color:0xffffff, alpha:isHolding ? 0.16 : 0.08});
  }

  function emitHoldParticles(note, now){
    if(state.autoplay) return;
    if(now < (note.holdFxAt || 0)) return;
    const liteFx = isLiteFxMode();
    note.holdFxAt = now + HOLD_PARTICLE_INTERVAL * (liteFx ? 2.8 : 1.1);

    const x = laneCenter(note.lane);
    const y = state.hitY - 6;
    const col = laneColor(note.lane);
    const count = liteFx
      ? 1
      : (state.feverActive ? 3 + Math.min(1, state.feverLevel - 1) : 2);
    for(let i=0;i<count;i++){
      const size = 3 + Math.random() * 5;
      const p = acquireFxParticle();
      if(!p) break;
      p.width = size;
      p.height = size;
      p.tint = i===0 ? 0xffffff : col;
      p.alpha = 0.86;
      p.x = x + (Math.random() - 0.5) * state.laneW * 0.28;
      p.y = y + (Math.random() - 0.5) * 8;
      p.rotation = Math.random() * Math.PI;

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
    releaseNoteSprite(s);
    state.sprites.delete(id);
  }

  function releaseNoteSprite(s){
    if(!s) return;
    gsap.killTweensOf(s);
    if(s.scale) gsap.killTweensOf(s.scale);
    if(s.parent) s.parent.removeChild(s);
    s.visible = false;
    s.renderable = false;
    s.alpha = 1;
    s.rotation = 0;
    s.scale.set(1, 1);
    s.x = -9999;
    s.y = -9999;
    s._variantKey = null;
    if(s.headGraphic){
      s.headGraphic.visible = true;
      s.headGraphic.alpha = 1;
      s.headGraphic.tint = 0xffffff;
    }
    if(s.tailGraphic){
      s.tailGraphic.clear();
      s.tailGraphic.alpha = 1;
      s.tailGraphic.tint = 0xffffff;
      s.tailGraphic._lastLen = -1;
      s.tailGraphic._lastWidth = null;
      s.tailGraphic._lastHeadH = null;
      s.tailGraphic._lastHolding = null;
      s.tailGraphic._lastLane = null;
    }
    if(s.holdCapGraphic){
      s.holdCapGraphic.visible = false;
      s.holdCapGraphic.alpha = 1;
      s.holdCapGraphic.tint = 0xffffff;
      s.holdCapGraphic.scale.set(1, 1);
    }
    const pool = s._isHoldShell ? state.notePools.hold : state.notePools.single;
    pool.push(s);
  }

  function clearActiveNoteSprites(){
    state.sprites.forEach(sprite => releaseNoteSprite(sprite));
    state.sprites.clear();
    state.notesLayer.removeChildren();
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
        state.score += Math.round(300 * state.feverMultiplier);
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
    while(state.missIndex < state.notes.length){
      const n = state.notes[state.missIndex];
      if(now <= n.time + BAD) break;
      state.missIndex++;
      if(!n.hit && !n.missed && !n.holding){
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
      if(feverEvent.levelUp && feverEvent.stage?.label) displayType = feverEvent.stage.label;
      const baseScore = point + state.combo*10;
      state.score += Math.round(baseScore * state.feverMultiplier);
      if(state.combo > state.maxCombo) state.maxCombo = state.combo;
      flashLaneHit(
        lane,
        type === 'PERFECT' ? 1.15 : type === 'GOOD' ? 0.9 : 0.72,
        type === 'PERFECT' ? 0xffffff : type === 'GOOD' ? 0xef8cab : 0xffd56f
      );
      triggerKeyImpact(lane, type === 'PERFECT' ? 1.0 : type === 'GOOD' ? 0.62 : 0.42);
      smokeBurst(lane, type);
      pulseComboHud(displayType);
      if(type === 'PERFECT' && !state.autoplay && canPulseCamera()){
        pulsePlayfieldCamera({
          strength:state.feverActive ? 1 + state.feverLevel * 0.18 : 0.72,
          zoom:state.feverActive ? 0.024 : 0.012,
          duration:state.feverActive ? 0.28 : 0.18,
          rotate:state.feverActive ? 0.004 : 0.002
        });
      }
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
    document.body.classList.remove('fever', 'fever-1', 'fever-2', 'fever-3', 'fever-4');
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
    const active = level >= FEVER_STAGES.length;
    const stage = level ? FEVER_STAGES[level - 1] : null;

    state.feverLevel = level;
    state.feverActive = active;
    state.feverMultiplier = stage ? stage.multiplier : 1;

    clearFeverClasses();
    if(level > 0){
      document.body.classList.add(`fever-${Math.min(level, FEVER_STAGES.length)}`);
      if(active) document.body.classList.add('fever');
      if(level > prevLevel){
        pulseComboHud(stage?.label || `COMBO ${level}`);
        triggerFeverLevelUpFx(level);
      }
    }
    if(level !== prevLevel || (!active && prevLevel > 0)) syncFeverBackdrop();
    return {
      level,
      active,
      stage,
      levelUp: level > prevLevel
    };
  }

  function pulseComboHud(type='HIT'){
    const comboHud = $('comboHud');
    const comboBurst = $('comboBurst');
    if(!comboHud || !comboBurst) return;

    gsap.killTweensOf(comboHud);
    gsap.killTweensOf(comboBurst);
    const isTierUp = type === '20 COMBO' || type === '50 COMBO' || type === '80 COMBO' || type === 'FEVER';
    const isFever = type === 'FEVER';
    const scaleBoost = isFever ? 1.28 : isTierUp ? (1.16 + state.feverLevel * 0.03) : state.feverActive ? 1.12 : 1.08;
    gsap.fromTo(comboHud, { y:12, scale:.94 }, { y:0, scale:1, duration:.18, ease:'power2.out' });
    gsap.fromTo(comboBurst, { scale:scaleBoost, opacity:1 }, { scale:1, opacity:1, duration:.20, ease:'back.out(2.1)' });
    if(isTierUp){
      gsap.fromTo(comboHud, {
        boxShadow:'0 0 0 rgba(255,255,255,0)'
      }, {
        boxShadow:isFever
          ? '0 0 34px rgba(255,217,143,.45), 0 18px 44px rgba(255,110,150,.28)'
          : '0 0 26px rgba(111,218,255,.34), 0 14px 36px rgba(255,183,112,.20)',
        duration:0.22,
        yoyo:true,
        repeat:1,
        ease:'power2.out'
      });
    }
  }

  function showJudge(type){
    const el=$('judgeMsg'); el.textContent=type;
    el.style.color =
      type==='FEVER' ? '#ffe7f0'
      : type==='80 COMBO' ? '#ffe3c2'
      : type==='50 COMBO' ? '#fff0c8'
      : type==='20 COMBO' ? '#fff6d1'
      : type==='PERFECT' ? '#ffffff'
      : type==='GOOD' ? '#ef8cab'
      : type==='BAD' ? '#ffd56f'
      : type==='BREAK' ? '#ffb86d'
      : '#c6ced8';
    gsap.killTweensOf(el);
    gsap.fromTo(el,{opacity:0,y:18,scale:.74,letterSpacing:'.18em'},{opacity:1,y:0,scale:1,duration:.08,ease:'back.out(2.2)',
      onComplete:()=>gsap.to(el,{opacity:0,y:-26,scale:1.16,letterSpacing:'.24em',duration:.30,delay:.07,ease:'power2.out'})});
  }

  function cleanupFx(){
    const cap = state.autoplay ? 14 : 36;
    const overlay = state.fxOverlay || state.fx;
    while(overlay.children.length > cap){
      const old = overlay.children[0];
      destroyFxObject(old);
    }
  }

  function isLiteFxMode(){
    return state.autoplay;
  }

  function canPulseCamera(now=performance.now()/1000){
    const cooldown = state.autoplay ? 0.16 : 0.075;
    if(now - (state.lastCameraPulseAt || 0) < cooldown) return false;
    state.lastCameraPulseAt = now;
    return true;
  }

  function canSpawnBurst(now=performance.now()/1000){
    const cooldown = state.autoplay
      ? 0.12 + (state.feverLevel || 0) * 0.03
      : 0.032;
    if(now - (state.lastBurstAt || 0) < cooldown) return false;
    state.lastBurstAt = now;
    return true;
  }

  function canPulseKeyFx(now=performance.now()/1000){
    const cooldown = state.autoplay ? 0.12 : 0.02;
    if(now - (state.lastKeyPulseAt || 0) < cooldown) return false;
    state.lastKeyPulseAt = now;
    return true;
  }

  function ensureFxParticlePool(){
    if(!state.fxParticles) return;
    if(state.fxParticleStore.length) return;
    for(let i=0;i<MAX_FX_CHILDREN;i++){
      const particle = new PIXI.Sprite(PIXI.Texture.WHITE);
      particle.anchor.set(0.5);
      particle.visible = false;
      particle.renderable = false;
      particle.alpha = 0;
      particle.scale.set(0.001);
      particle._fxPooled = true;
      if(typeof state.fxParticles.addParticle === 'function') state.fxParticles.addParticle(particle);
      else state.fxParticles.addChild(particle);
      state.fxParticleStore.push(particle);
      state.fxParticlePool.push(particle);
    }
  }

  function acquireFxParticle(){
    ensureFxParticlePool();
    if(!state.fxParticles) return null;
    const activeCap = state.autoplay ? 24 : Math.min(120, MAX_FX_CHILDREN);
    if(state.fxActiveParticles >= activeCap && !state.fxParticlePool.length) return null;
    const particle = state.fxParticlePool.pop();
    if(!particle) return null;
    particle.visible = true;
    particle.renderable = true;
    particle.alpha = 1;
    particle.rotation = 0;
    particle.scale.set(1, 1);
    state.fxActiveParticles += 1;
    return particle;
  }

  function releaseFxParticle(particle){
    if(!particle) return;
    gsap.killTweensOf(particle);
    gsap.killTweensOf(particle.scale);
    particle.visible = false;
    particle.renderable = false;
    particle.alpha = 0;
    particle.rotation = 0;
    particle.x = -9999;
    particle.y = -9999;
    particle.tint = 0xffffff;
    particle.scale.set(0.001, 0.001);
    if(!state.fxParticlePool.includes(particle)) state.fxParticlePool.push(particle);
    state.fxActiveParticles = Math.max(0, state.fxActiveParticles - 1);
  }

  function spawnFxParticles({
    x, y, count=8, colors=[0xffffff], sizeMin=4, sizeMax=10,
    distMin=36, distMax=96, durationMin=0.34, durationMax=0.7,
    alpha=0.9, upwardBias=0.7, spread=1.9, shrink=0.35,
    shardiness=0.78, stretchMin=1.6, stretchMax=3.8, thickness=0.34,
    radial=false
  } = {}){
    for(let i=0;i<count;i++){
      const p = acquireFxParticle();
      if(!p) break;
      const size = sizeMin + Math.random() * Math.max(0.01, sizeMax - sizeMin);
      const col = colors[i % colors.length];
      const isShard = Math.random() < shardiness;
      const stretch = isShard
        ? (stretchMin + Math.random() * Math.max(0.01, stretchMax - stretchMin))
        : (0.92 + Math.random() * 0.42);
      const width = isShard ? size * stretch : size;
      const height = Math.max(1.4, isShard ? size * thickness * (0.78 + Math.random() * 0.48) : size * (0.72 + Math.random() * 0.24));
      p.width = width;
      p.height = height;
      p.tint = col;
      p.alpha = alpha;
      p.x = x + (Math.random() - 0.5) * state.laneW * 0.38;
      p.y = y + (Math.random() - 0.5) * 12;
      p.rotation = isShard
        ? (Math.random() - 0.5) * Math.PI * 1.6
        : Math.random() * Math.PI;
      const angle = radial
        ? Math.random() * Math.PI * 2
        : (-Math.PI/2) * upwardBias + (Math.random() - 0.5) * spread;
      const dist = distMin + Math.random() * Math.max(0.01, distMax - distMin);
      const duration = durationMin + Math.random() * Math.max(0.01, durationMax - durationMin);
      gsap.to(p, {
        x:p.x + Math.cos(angle) * dist,
        y:p.y + Math.sin(angle) * dist,
        rotation:p.rotation + (Math.random() - 0.5) * (isShard ? 3.8 : 5.4),
        alpha:0,
        duration,
        ease:'power3.out',
        onComplete:() => destroyFxObject(p)
      });
      gsap.to(p.scale, {
        x:Math.max(0.06, shrink * (isShard ? 0.82 : 1)),
        y:Math.max(0.05, shrink * (isShard ? 0.56 : 1)),
        duration:duration * 0.92,
        ease:'power2.in'
      });
    }
  }

  function destroyFxObject(displayObject){
    if(!displayObject || displayObject.destroyed) return;
    if(displayObject._fxPooled){
      releaseFxParticle(displayObject);
      return;
    }
    gsap.killTweensOf(displayObject);
    if(displayObject.scale) gsap.killTweensOf(displayObject.scale);
    if(displayObject.parent) displayObject.parent.removeChild(displayObject);
    displayObject.destroy({children:true});
  }

  function clearFxLayer(){
    const overlay = state.fxOverlay || state.fx;
    if(overlay){
      const children = [...overlay.children];
      for(const child of children) destroyFxObject(child);
      overlay.removeChildren();
    }
    state.keyPulseFx = [];
    for(const particle of state.fxParticleStore){
      releaseFxParticle(particle);
    }
    state.fxParticlePool = [...state.fxParticleStore];
    state.fxActiveParticles = 0;
  }

  function triggerFeverLevelUpFx(level){
    const overlay = $('feverOverlay');
    if(overlay){
      gsap.killTweensOf(overlay);
      overlay.style.opacity = '0';
      overlay.style.transform = '';
      overlay.style.filter = '';
    }

    pulsePlayfieldCamera({
      strength:(level >= FEVER_STAGES.length ? 1.18 : 0.56) + level * 0.12,
      zoom:(level >= FEVER_STAGES.length ? 0.020 : 0.008) + level * 0.0025,
      duration:0.20 + level * 0.03,
      rotate:0.0032 + level * 0.0005
    });
    gsap.delayedCall(0.07 + level * 0.01, () => {
      pulsePlayfieldCamera({
        strength:0.38 + level * 0.10,
        zoom:0.006 + level * 0.0015,
        duration:0.16 + level * 0.02,
        rotate:0.0018 + level * 0.0004
      });
    });
    if(level >= 3){
      gsap.delayedCall(0.16, () => {
        pulsePlayfieldCamera({
          strength:level >= FEVER_STAGES.length ? 0.42 : 0.26,
          zoom:level >= FEVER_STAGES.length ? 0.008 : 0.004,
          duration:0.14,
          rotate:0.0016
        });
      });
    }
  }


  function spawnHitBurstFlash(x, y, base, accent, perfect=false, liteFx=false, feverLevel=0){
    const overlay = state.fxOverlay || state.fx;
    const burst = new PIXI.Graphics();
    const rayCount = (liteFx ? 6 : (perfect ? 12 : 9)) + Math.min(2, feverLevel);

    for(let i=0;i<rayCount;i++){
      const angle = (Math.PI * 2 * i / rayCount) + (Math.random() - 0.5) * 0.16;
      const inner = 6 + Math.random() * 4;
      const outer = (perfect ? 32 : 24) + Math.random() * 20 + feverLevel * 4;
      const x1 = Math.cos(angle - 0.05) * inner;
      const y1 = Math.sin(angle - 0.05) * inner;
      const x2 = Math.cos(angle) * outer;
      const y2 = Math.sin(angle) * outer;
      const x3 = Math.cos(angle + 0.05) * (inner + 10);
      const y3 = Math.sin(angle + 0.05) * (inner + 10);
      const color = i % 3 === 0 ? 0xffffff : (i % 2 ? base : accent);
      burst.poly([0, 0, x1, y1, x2, y2, x3, y3]).fill({ color, alpha:perfect ? 0.88 : 0.72 });
    }

    burst.circle(0, 0, perfect ? 8 : 6).fill({ color:0xffffff, alpha:perfect ? 0.90 : 0.72 });
    burst.circle(0, 0, perfect ? 14 : 10).stroke({ color:accent, alpha:0.34, width:2 });
    burst.x = x;
    burst.y = y;
    overlay.addChild(burst);
    gsap.fromTo(burst.scale, { x:0.34, y:0.34 }, {
      x:liteFx ? 0.94 : 1.14,
      y:liteFx ? 0.94 : 1.14,
      duration:liteFx ? 0.15 : 0.22,
      ease:'power2.out'
    });
    gsap.to(burst, {
      alpha:0,
      duration:liteFx ? 0.16 : 0.24,
      ease:'power2.out',
      onComplete:() => destroyFxObject(burst)
    });
  }

  function smokeBurst(lane,type){
    if(!canSpawnBurst()) return;
    const x = laneCenter(lane);
    const y = state.hitY;
    const base = laneColor(lane);
    const feverLevel = state.feverLevel || 0;
    const liteFx = isLiteFxMode();
    const perfect = type === 'PERFECT';
    const accent = feverLevel >= 3 ? 0xff7a8e : feverLevel === 2 ? 0xff9b68 : perfect ? 0xffd166 : 0xe8eef8;
    const overlay = state.fxOverlay || state.fx;
    cleanupFx();

    spawnHitBurstFlash(x, y, base, accent, perfect, liteFx, feverLevel);

    const floorGlow = new PIXI.Graphics();
    floorGlow.roundRect(-state.laneW * 0.34, -12, state.laneW * 0.68, 24, 12).fill({
      color:base,
      alpha:liteFx ? 0.16 : (perfect ? 0.24 : 0.16)
    });
    floorGlow.x = x;
    floorGlow.y = y + 2;
    overlay.addChild(floorGlow);
    gsap.fromTo(floorGlow.scale, { x:0.74, y:0.52 }, { x:1.12, y:1.16, duration:0.20, ease:'power2.out' });
    gsap.to(floorGlow, { alpha:0, duration:0.18, ease:'power2.out', onComplete:() => destroyFxObject(floorGlow) });

    if(!liteFx){
      const line = new PIXI.Graphics();
      line.rect(state.startX - 40, y - 8, state.totalW + 80, 18).fill({ color:base, alpha:(perfect ? 0.24 : 0.16) + feverLevel * 0.03 });
      line.rect(state.startX - 24, y - 2, state.totalW + 48, 4).fill({ color:0xffffff, alpha:0.92 });
      overlay.addChild(line);
      gsap.to(line, { alpha:0, duration:0.24, ease:'power2.out', onComplete:() => destroyFxObject(line) });
    }

    if(feverLevel > 0 && !liteFx){
      const aura = new PIXI.Graphics();
      aura.circle(0, 0, 28 + feverLevel * 6).stroke({ color:accent, alpha:0.40 + feverLevel * 0.08, width:2 + feverLevel });
      aura.x = x;
      aura.y = y;
      overlay.addChild(aura);
      gsap.to(aura.scale, { x:2.3 + feverLevel * 0.15, y:2.3 + feverLevel * 0.15, duration:0.42, ease:'power3.out' });
      gsap.to(aura, { alpha:0, duration:0.38, ease:'power2.out', onComplete:() => destroyFxObject(aura) });
    }

    spawnFxParticles({
      x,
      y,
      count:liteFx ? Math.min(6, 4 + feverLevel) : ((perfect ? 18 : 12) + feverLevel * 3),
      colors:[0xffffff, base, accent],
      sizeMin:3,
      sizeMax:liteFx ? 8 : 12,
      distMin:liteFx ? 24 : 38,
      distMax:liteFx ? 62 : 90 + feverLevel * 6,
      durationMin:0.16,
      durationMax:liteFx ? 0.30 : 0.42,
      alpha:liteFx ? 0.82 : 0.94,
      spread:Math.PI * 2,
      shrink:0.10,
      shardiness:0.98,
      stretchMin:2.6,
      stretchMax:5.4,
      thickness:0.20,
      radial:true
    });

    if(!liteFx){
      spawnFxParticles({
        x,
        y:y - 4,
        count:(perfect ? 9 : 6) + feverLevel,
        colors:[base, 0xffffff],
        sizeMin:2,
        sizeMax:6,
        distMin:22,
        distMax:68,
        durationMin:0.22,
        durationMax:0.42,
        alpha:0.68,
        upwardBias:0.10,
        spread:3.2,
        shrink:0.08,
        shardiness:1,
        stretchMin:2.8,
        stretchMax:5.8,
        thickness:0.18
      });
    }

    if(perfect){
      spawnFxParticles({
        x,
        y:y - 2,
        count:liteFx ? 4 : 10,
        colors:[0xffffff, accent],
        sizeMin:2,
        sizeMax:liteFx ? 6 : 8,
        distMin:18,
        distMax:liteFx ? 54 : 74,
        durationMin:0.14,
        durationMax:liteFx ? 0.26 : 0.34,
        alpha:liteFx ? 0.88 : 0.98,
        spread:Math.PI * 2,
        shrink:0.06,
        shardiness:1,
        stretchMin:3.2,
        stretchMax:6.0,
        thickness:0.16,
        radial:true
      });
      if(!liteFx){
        spawnHitBurstFlash(x, y, 0xffffff, accent, true, false, feverLevel);
      }
    }

    if(!liteFx){
      const beam = new PIXI.Graphics();
      const bw = state.laneW * 0.82;
      beam.roundRect(-bw/2, -state.hitY * 0.72, bw, state.hitY * 0.72, 8).fill({ color:base, alpha:perfect ? 0.20 : 0.12 });
      beam.x = x;
      beam.y = y;
      overlay.addChild(beam);
      gsap.to(beam, { alpha:0, y:y - 24, duration:0.28, ease:'power2.out', onComplete:() => destroyFxObject(beam) });
    }
  }

  function pulseKey(lane){
    if(state.autoplay || !canPulseKeyFx()) return;
    const x = laneCenter(lane);
    const y = state.hitY + 54;
    const overlay = state.fxOverlay || state.fx;
    let g = state.keyPulseFx?.[lane];
    if(!g || g.destroyed || g.parent !== overlay){
      g = new PIXI.Graphics();
      state.keyPulseFx[lane] = g;
      overlay.addChild(g);
    }
    gsap.killTweensOf(g);
    gsap.killTweensOf(g.scale);
    g.clear();
    g.alpha = 1;
    g.scale.set(1, 1);
    g.roundRect(-state.laneW * 0.34, -8, state.laneW * 0.68, 16, 8).fill({ color:laneColor(lane), alpha:0.34 });
    g.roundRect(-state.laneW * 0.22, -3, state.laneW * 0.44, 6, 4).fill({ color:0xffffff, alpha:0.82 });
    g.x = x;
    g.y = y;
    gsap.fromTo(g.scale, { x:0.84, y:0.84 }, { x:1.26, y:1.10, duration:0.16, ease:'power2.out' });
    gsap.to(g, { alpha:0, duration:0.16, ease:'power2.out' });
  }
