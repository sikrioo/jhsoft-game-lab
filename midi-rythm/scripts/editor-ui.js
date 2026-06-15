/* Editor/UI module: in-game editor, export, HUD, results, formatting */

function canEditChart(){
    return state.started && state.paused && !state.gameOver;
  }

  function isEditableNote(note){
    return !!note && !note.hit && !note.missed;
  }

  function findNoteByUid(uid){
    return state.notes.find(note => note.uid === uid);
  }

  function centerEditorWindow(time=0){
    const span = state.editor.windowSpan;
    const maxStart = Math.max(0, state.duration - span);
    state.editor.windowStart = clamp((time || 0) - span * 0.35, 0, maxStart);
    refreshEditorPanel();
  }

  function panEditorWindow(delta){
    const span = state.editor.windowSpan;
    const maxStart = Math.max(0, state.duration - span);
    state.editor.windowStart = clamp((state.editor.windowStart || 0) + delta, 0, maxStart);
    refreshEditorPanel();
  }

  function refreshEditorPanel(){
    const status = $('chartEditorStatus');
    const help = $('chartEditorHelp');
    const viewport = $('chartEditorViewport');
    const holdBtn = $('editorHoldBtn');
    const deleteBtn = $('editorDeleteBtn');
    const note = findNoteByUid(state.editor.selectedUid);
    const editable = canEditChart();

    if(viewport) viewport.classList.toggle('disabled', !editable);
    if(holdBtn) holdBtn.disabled = !editable || !isEditableNote(note);
    if(deleteBtn) deleteBtn.disabled = !editable || !isEditableNote(note);
    if($('editorPrevBtn')) $('editorPrevBtn').disabled = !state.notes.length;
    if($('editorCenterBtn')) $('editorCenterBtn').disabled = !state.notes.length;
    if($('editorNextBtn')) $('editorNextBtn').disabled = !state.notes.length;

    if(status){
      if(!state.started) status.textContent = 'Load a chart, then pause the game to edit.';
      else if(!state.paused) status.textContent = 'Press SPACE to pause. Editing is enabled only while the song is paused.';
      else if(state.gameOver) status.textContent = 'Result screen is open. Retry or return before editing.';
      else if(note && isEditableNote(note)) status.textContent = `Editing note #${note.id + 1} at ${note.time.toFixed(3)}s on lane ${state.KEYS[note.lane] === ';' ? ';' : state.KEYS[note.lane].toUpperCase()}.`;
      else status.textContent = `Paused at ${songTime().toFixed(3)}s. Drag notes to move, drag the bright handle to stretch, click empty space to add.`;
    }
    if(help){
      help.textContent = editable
        ? 'Only unhit notes can be changed. Added notes snap to the beat grid and update CHART DATA on release.'
        : 'Timeline stays visible for inspection, but edits are locked until the game is paused.';
    }

    renderEditorLaneLabels();
    renderEditorTimeline();
  }

  function renderEditorLaneLabels(){
    const lanes = $('chartEditorLanes');
    if(!lanes) return;
    const rowH = 236 / Math.max(1, state.LANES);
    lanes.innerHTML = state.KEYS.map(key => `<div class="editor-lane" style="height:${Math.max(20, rowH - 2)}px">${key === ';' ? ';' : key.toUpperCase()}</div>`).join('');
  }

  function renderEditorTimeline(){
    const surface = $('chartEditorSurface');
    const viewport = $('chartEditorViewport');
    if(!surface || !viewport) return;

    if(!state.notes.length){
      surface.innerHTML = '';
      return;
    }

    const span = state.editor.windowSpan;
    const maxStart = Math.max(0, state.duration - span);
    const start = clamp(state.editor.windowStart || 0, 0, maxStart);
    state.editor.windowStart = start;
    const end = start + span;
    const beat = 60 / Math.max(1, state.bpm || 120);
    const measure = beat * 4;
    const rowH = 236 / Math.max(1, state.LANES);
    surface.style.setProperty('--lane-count', String(state.LANES));
    surface.style.setProperty('--beat-step', `${Math.max(3, (beat / span) * 100)}%`);
    surface.style.setProperty('--measure-step', `${Math.max(6, (measure / span) * 100)}%`);

    const parts = [];
    if(state.started){
      const now = clamp(songTime(), start, end);
      const nowLeft = ((now - start) / span) * 100;
      parts.push(`<div class="editor-now" style="left:${nowLeft}%"></div>`);
    }

    for(let sec=Math.floor(start); sec<=Math.ceil(end); sec++){
      const left = ((sec - start) / span) * 100;
      if(left < 0 || left > 100) continue;
      parts.push(`<div class="editor-tick" style="left:${left}%"></div>`);
      parts.push(`<div class="editor-tick-label" style="left:${left}%">${sec}s</div>`);
    }

    const visibleNotes = state.notes.filter(note => {
      const noteEnd = note.hold ? (note.holdEnd || (note.time + note.duration)) : note.time + Math.max(note.duration || 0.12, beat * 0.18);
      return note.time <= end + 0.02 && noteEnd >= start - 0.02;
    });

    for(const note of visibleNotes){
      const noteEnd = note.hold ? (note.holdEnd || (note.time + note.duration)) : note.time + Math.max(note.duration || 0.12, beat * 0.18);
      const left = ((Math.max(note.time, start) - start) / span) * 100;
      const width = Math.max(1.1, ((Math.min(noteEnd, end) - Math.max(note.time, start)) / span) * 100);
      const top = note.lane * rowH + rowH * 0.15;
      const height = Math.max(18, rowH * 0.7);
      const color = hexColor(laneColor(note.lane));
      const selected = note.uid === state.editor.selectedUid ? ' selected' : '';
      const hold = note.hold ? ' is-hold' : '';
      const disabled = isEditableNote(note) ? '' : ' is-disabled';
      const handle = note.uid === state.editor.selectedUid && isEditableNote(note)
        ? '<div class="editor-note-handle"></div>'
        : '';
      const label = note.hold || note.uid === state.editor.selectedUid
        ? `<div class="editor-note-label">${state.KEYS[note.lane] === ';' ? ';' : state.KEYS[note.lane].toUpperCase()}</div>`
        : '';
      parts.push(`<div class="editor-note${selected}${hold}${disabled}" data-uid="${note.uid}" style="left:${left}%;top:${top}px;height:${height}px;width:${width}%;background:${color};">${label}${handle}</div>`);
    }

    surface.innerHTML = parts.join('');
  }

  function editorPointerInfo(e){
    const viewport = $('chartEditorViewport');
    if(!viewport) return null;
    const rect = viewport.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const y = clamp(e.clientY - rect.top, 0, rect.height);
    const lane = clamp(Math.floor(y / Math.max(1, rect.height / state.LANES)), 0, state.LANES-1);
    const time = (state.editor.windowStart || 0) + (x / Math.max(1, rect.width)) * state.editor.windowSpan;
    return {x, y, width:rect.width, height:rect.height, lane, time};
  }

  function onEditorPointerDown(e){
    const info = editorPointerInfo(e);
    if(!info) return;

    const noteEl = e.target.closest('.editor-note');
    const handleEl = e.target.closest('.editor-note-handle');
    if(noteEl){
      const uid = Number(noteEl.dataset.uid);
      state.editor.selectedUid = uid;
      const note = findNoteByUid(uid);
      if(!note || !isEditableNote(note) || !canEditChart()){
        refreshEditorPanel();
        return;
      }
      if(handleEl) state.editor.drag = { type:'resize', uid, startDuration:note.duration, startX:info.x };
      else state.editor.drag = { type:'move', uid, startTime:note.time, startLane:note.lane, startX:info.x, startY:info.y };
      refreshEditorPanel();
      e.preventDefault();
      return;
    }

    if(!canEditChart()) return;
    const created = addEditorNoteAt(info.time, info.lane);
    state.editor.selectedUid = created.uid;
    state.editor.drag = { type:'move', uid:created.uid, startTime:created.time, startLane:created.lane, startX:info.x, startY:info.y };
    applyEditorPreview();
    refreshEditorPanel();
    e.preventDefault();
  }

  function onEditorPointerMove(e){
    const drag = state.editor.drag;
    if(!drag) return;
    const note = findNoteByUid(drag.uid);
    const info = editorPointerInfo(e);
    if(!note || !info) return;

    const beat = 60 / Math.max(1, state.bpm || 120);
    const snap = Math.max(beat / 4, 0.05);
    const maxDuration = Math.max(HOLD_MAX_DURATION * 2.4, beat * 3.5);

    if(drag.type === 'move'){
      const deltaTime = ((info.x - drag.startX) / Math.max(1, info.width)) * state.editor.windowSpan;
      const laneDelta = Math.round((info.y - drag.startY) / Math.max(1, info.height / state.LANES));
      note.time = clamp(snapValue(drag.startTime + deltaTime, snap), 0, Math.max(0, state.duration - 0.05));
      note.lane = clamp(drag.startLane + laneDelta, 0, state.LANES-1);
      note.manualLane = true;
    } else {
      note.duration = clamp(snapValue(drag.startDuration + ((info.x - drag.startX) / Math.max(1, info.width)) * state.editor.windowSpan, snap), Math.max(0.12, beat / 4), maxDuration);
      note.hold = note.duration >= HOLD_MIN_DURATION * 0.65;
    }

    note.holdEnd = roundTo(note.time + note.duration, 4);
    applyEditorPreview();
    renderEditorTimeline();
    e.preventDefault();
  }

  function onEditorPointerUp(){
    if(!state.editor.drag) return;
    state.editor.drag = null;
    commitEditorEdit();
  }

  function addEditorNoteAt(time, lane){
    const beat = 60 / Math.max(1, state.bpm || 120);
    const snap = Math.max(beat / 4, 0.05);
    const noteTime = clamp(snapValue(time, snap), 0, Math.max(0, state.duration - 0.05));
    const duration = roundTo(Math.max(0.12, beat * 0.35), 4);
    const note = {
      id:state.notes.length,
      uid:allocNoteUid(),
      time:noteTime,
      lane,
      midi:inferMidiForNewNote(noteTime, lane),
      duration,
      hold:false,
      holdEnd:roundTo(noteTime + duration, 4),
      manualLane:true,
      holding:false,
      hit:false,
      missed:false
    };
    state.notes.push(note);
    return note;
  }

  function inferMidiForNewNote(time, lane){
    const nearby = state.notes
      .filter(note => Number.isFinite(note.midi))
      .sort((a,b)=>Math.abs(a.time-time)-Math.abs(b.time-time));
    const sameBeat = nearby.filter(note => Math.abs(note.time - time) < 0.18);
    if(sameBeat.length){
      const baseMidi = avg(sameBeat.map(note => note.midi));
      const baseLane = avg(sameBeat.map(note => note.lane));
      return Math.round(clamp(baseMidi + (lane - baseLane) * 2, 36, 96));
    }
    if(nearby.length){
      const ref = nearby[0];
      return Math.round(clamp((ref.midi ?? 60) + (lane - ref.lane) * 2, 36, 96));
    }
    return 60 + lane * 2;
  }

  function toggleSelectedEditorHold(){
    if(!canEditChart()) return;
    const note = findNoteByUid(state.editor.selectedUid);
    if(!isEditableNote(note)) return;
    const beat = 60 / Math.max(1, state.bpm || 120);
    if(note.hold){
      note.duration = roundTo(Math.max(0.12, beat * 0.35), 4);
      note.hold = false;
    } else {
      note.duration = roundTo(Math.max(note.duration, HOLD_MIN_DURATION * 0.9, beat * 1.1), 4);
      note.hold = true;
    }
    note.holdEnd = roundTo(note.time + note.duration, 4);
    commitEditorEdit();
  }

  function deleteSelectedEditorNote(){
    if(!canEditChart()) return;
    const note = findNoteByUid(state.editor.selectedUid);
    if(!isEditableNote(note)) return;
    removeSprite(note.id);
    state.notes = state.notes.filter(item => item.uid !== note.uid);
    state.editor.selectedUid = null;
    commitEditorEdit();
  }

  function applyEditorPreview(){
    if(!state.started) return;
    refreshVisibleNotes();
  }

  function commitEditorEdit(){
    state.notes = reindexChartNotes(state.notes, { preserveState:true });
    state.lastChart = state.notes.map(note => ({...note}));
    buildChartExport();
    refreshEditorPanel();
    refreshChartPanel();
    refreshVisibleNotes();
  }

  function refreshVisibleNotes(){
    const ids = [...state.sprites.keys()];
    for(const id of ids) removeSprite(id);
    state.notesLayer.removeChildren();
    state.sprites.clear();
    renderNotes(songTime());
  }

  function snapValue(value, step){
    return roundTo(Math.round(value / step) * step, 4);
  }

  function hexColor(color){
    return `#${color.toString(16).padStart(6, '0')}`;
  }

  // CHART DATA VIEW / COPY
  // ─────────────────────────────────────────
  function buildChartExport(){
    const notes = state.notes.map(n => ({
      id:n.id,
      time:+n.time.toFixed(4),
      lane:n.lane,
      key:state.KEYS[n.lane] || String(n.lane),
      midi:n.midi ?? null,
      duration:+(n.duration || 0).toFixed(4),
      hold:!!n.hold,
      holdEnd:n.hold ? +(n.holdEnd || (n.time+n.duration)).toFixed(4) : null
    }));

    const laneCounts = Array.from({length:state.LANES}, (_, lane) => ({
      lane,
      key:state.KEYS[lane] || String(lane),
      count:notes.filter(n => n.lane === lane).length
    }));

    const holdCount = notes.filter(n => n.hold).length;
    const firstTime = notes.length ? notes[0].time : 0;
    const lastTime = notes.length ? Math.max(...notes.map(n => n.holdEnd ?? n.time)) : 0;
    const playLength = Math.max(0.001, lastTime - firstTime);
    const nps = notes.length ? +(notes.length / playLength).toFixed(3) : 0;

    state.chartExport = {
      format:'midi-auto-chart-v1',
      song:state.lastName || '',
      generatedAt:new Date().toISOString(),
      mode:state.mode,
      bpm:state.bpm,
      lanes:state.LANES,
      keys:[...state.KEYS],
      duration:+state.duration.toFixed(4),
      noteCount:notes.length,
      holdCount,
      nps,
      laneCounts,
      debug:state.chartDebug || null,
      notes
    };

    state.chartExportText = JSON.stringify(state.chartExport, null, 2);
    return state.chartExport;
  }

  function syncChartTextEditUi(){
    const area = $('chartDataText');
    const editBtn = $('editChartBtn');
    const applyBtn = $('applyChartBtn');
    if(area){
      area.readOnly = !state.chartTextEditing;
      area.classList.toggle('editing', state.chartTextEditing);
      area.spellcheck = false;
    }
    if(editBtn){
      editBtn.classList.toggle('active', state.chartTextEditing);
      editBtn.textContent = state.chartTextEditing ? 'Cancel' : 'Edit';
    }
    if(applyBtn) applyBtn.disabled = !state.chartTextEditing;
  }

  function toggleChartTextEditing(){
    state.chartTextEditing = !state.chartTextEditing;
    if(!state.chartTextEditing && state.chartExportText){
      const area = $('chartDataText');
      if(area) area.value = state.chartExportText;
    }
    syncChartTextEditUi();
  }

  function chartFromExportData(data){
    if(!data || typeof data !== 'object' || !Array.isArray(data.notes)){
      throw new Error('Chart JSON must include a notes array.');
    }
    const lanes = Number(data.lanes ?? state.LANES);
    if(lanes !== state.LANES){
      throw new Error(`Edited chart lanes (${lanes}) do not match the current mode (${state.LANES} lanes).`);
    }

    const chart = data.notes.map((note, index) => {
      const time = Math.max(0, Number(note.time) || 0);
      const duration = Math.max(0, Number(note.duration) || 0);
      const hold = Boolean(note.hold) || duration >= HOLD_MIN_DURATION * 0.65 || Number(note.holdEnd) > time + 0.18;
      const lane = clamp(Math.round(Number(note.lane) || 0), 0, state.LANES - 1);
      const holdEnd = hold
        ? roundTo(Math.max(time + Math.max(duration, 0.12), Number(note.holdEnd) || 0), 4)
        : null;
      return {
        id:index,
        time:roundTo(time, 4),
        lane,
        midi:Number.isFinite(Number(note.midi)) ? Math.round(Number(note.midi)) : null,
        duration:roundTo(hold ? Math.max(holdEnd - time, 0.12) : Math.max(duration, 0.12), 4),
        hold,
        holdEnd,
        holding:false,
        hit:false,
        missed:false
      };
    }).sort((a,b) => a.time - b.time || a.lane - b.lane || a.id - b.id);

    chart.forEach((note, index) => { note.id = index; });
    return chart;
  }

  async function applyChartTextEdit(){
    if(!state.chartTextEditing) return;
    const area = $('chartDataText');
    const status = $('chartCopyStatus');
    if(!area) return;

    try{
      const parsed = JSON.parse(area.value);
      let chart = null;
      let bpm = state.lastBpm || state.bpm || 120;

      if(parsed?.format === 'midi-auto-chart-v1' || Array.isArray(parsed?.notes)){
        chart = chartFromExportData(parsed);
        bpm = Number(parsed.bpm) || bpm;
      } else {
        const imported = convertImportedChartData(parsed, preferredImportedDifficulty(state.mode));
        if(!imported) throw new Error('Unsupported chart format.');
        if(imported.laneCount !== state.LANES){
          throw new Error(`Edited chart lanes (${imported.laneCount}) do not match the current mode (${state.LANES} lanes).`);
        }
        chart = imported.chart;
        bpm = imported.bpm || bpm;
      }

      state.chartTextEditing = false;
      syncChartTextEditUi();
      if(status){
        status.textContent = 'Chart applied. Restarting with the current mode.';
        gsap.killTweensOf(status);
        gsap.fromTo(status,{opacity:1},{opacity:.55,duration:.8,delay:1.1});
      }
      await startGame(chart, bpm, state.lastName || 'Edited Chart', state.lastPlayback || []);
    }catch(err){
      if(status){
        status.textContent = `Apply failed: ${err.message}`;
        gsap.killTweensOf(status);
        gsap.fromTo(status,{opacity:1},{opacity:.65,duration:.8,delay:1.4});
      }
    }
  }

  function refreshChartPanel(){
    if(!state.chartExport) buildChartExport();

    const data = state.chartExport;
    if(!data){
      $('chartPanelSub').textContent = '아직 생성된 채보가 없습니다.';
      $('chartDataText').value = '아직 생성된 채보가 없습니다.';
      syncChartTextEditUi();
      refreshEditorPanel();
      return;
    }

    $('chartPanelSub').textContent = `${data.song || 'Untitled'} / ${data.mode} / ${data.lanes} lanes / ${data.keys.join(' ')}`;
    $('chartSummaryBpm').textContent = data.bpm ?? '-';
    $('chartSummaryNotes').textContent = data.noteCount ?? '-';
    $('chartSummaryHolds').textContent = data.holdCount ?? '-';
    $('chartSummaryNps').textContent = data.nps ?? '-';
    if(!state.chartTextEditing) $('chartDataText').value = state.chartExportText || JSON.stringify(data, null, 2);
    syncChartTextEditUi();
    refreshEditorPanel();
  }

  function toggleChartPanel(){
    refreshChartPanel();
    const panel = $('chartPanel');
    if(!panel) return;
    panel.classList.toggle('active');
    if(panel.classList.contains('active')){
      gsap.fromTo(panel,{opacity:0,y:10,scale:.985},{opacity:1,y:0,scale:1,duration:.18,ease:'power2.out'});
    }
  }

  async function copyTextToClipboard(text){
    if(!text) return false;

    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(text);
        return true;
      }
    }catch(err){}

    const area = $('chartDataText');
    if(!area) return false;
    area.value = text;
    area.focus();
    area.select();
    area.setSelectionRange(0, area.value.length);

    try{
      return document.execCommand('copy');
    }catch(err){
      return false;
    }
  }

  async function copyChartData(kind='full'){
    if(!state.chartExport) buildChartExport();
    const text = kind === 'notes'
      ? JSON.stringify(state.chartExport?.notes || [], null, 2)
      : (state.chartExportText || JSON.stringify(state.chartExport, null, 2));

    const ok = await copyTextToClipboard(text);
    const status = $('chartCopyStatus');
    if(status){
      status.textContent = ok ? '복사 완료' : '복사 실패: 텍스트를 직접 선택해서 복사해주세요.';
      gsap.killTweensOf(status);
      gsap.fromTo(status,{opacity:1},{opacity:.55,duration:.6,delay:.9});
    }
  }


  // ─────────────────────────────────────────
  // HUD
  // ─────────────────────────────────────────
  function updateHud(nowValue){
    const now=Math.max(0,Math.min(state.duration, Number.isFinite(nowValue) ? nowValue : songTime()));
    $('score').textContent=Math.floor(state.score).toLocaleString();
    $('combo').textContent=state.combo;
    const acc=state.judged?Math.round(state.hits/state.judged*100):100;
    $('acc').textContent=acc+'%';
    $('rank').textContent=acc>=96?'S+':acc>=90?'S':acc>=80?'A':acc>=70?'B':'C';
    $('curTime').textContent=fmt(now);
    $('progress').style.width=(state.duration?now/state.duration*100:0)+'%';

    const comboHud = $('comboHud');
    const comboBurst = $('comboBurst');
    const comboStatus = $('comboStatus');
    const feverFill = $('feverFill');
    const feverState = $('feverState');
    const feverBonus = $('feverBonus');
    const feverHint = $('feverHint');
    const currentStage = state.feverLevel > 0 ? FEVER_STAGES[state.feverLevel - 1] : null;
    const nextStage = FEVER_STAGES[state.feverLevel] || null;
    const prevStageCombo = state.feverLevel > 0 ? FEVER_STAGES[state.feverLevel - 1].combo : 0;
    const targetCombo = nextStage ? nextStage.combo : (currentStage ? currentStage.combo : FEVER_STAGES[0].combo);
    const stageSpan = Math.max(1, targetCombo - prevStageCombo);
    const stageProgress = state.feverLevel >= FEVER_STAGES.length
      ? 1
      : Math.max(0, Math.min(1, (state.combo - prevStageCombo) / stageSpan));
    const readyCombo = nextStage ? Math.max(0, nextStage.combo - state.combo) : 0;

    if(comboHud) comboHud.classList.toggle('active', state.started && (state.combo > 0 || state.feverLevel > 0));
    if(comboBurst) comboBurst.textContent = state.combo;
    if(comboStatus){
      comboStatus.textContent = state.feverLevel === 0
        ? state.combo === 0
          ? 'Build a streak'
          : `${readyCombo} more for ${FEVER_STAGES[0].label}`
        : state.feverLevel >= FEVER_STAGES.length
          ? `FEVER ACTIVE  x${state.feverMultiplier.toFixed(2)} SCORE`
          : `${readyCombo} more for ${nextStage.label}`;
    }
    if(feverFill) feverFill.style.width = `${stageProgress * 100}%`;
    if(feverState) feverState.textContent = state.feverLevel > 0
      ? nextStage
        ? `${currentStage.label}  ${state.combo} / ${nextStage.combo}`
        : `FEVER  ${state.combo} COMBO`
      : `READY ${state.combo} / ${FEVER_STAGES[0].combo}`;
    if(feverBonus) feverBonus.textContent = `x${state.feverMultiplier.toFixed(2)}`;
    if(feverHint) feverHint.textContent = state.feverLevel > 0
      ? nextStage
        ? `${currentStage.label} x${state.feverMultiplier.toFixed(2)} -> ${nextStage.combo}`
        : `FEVER MAX x${state.feverMultiplier.toFixed(2)}`
      : `FEVER 0 / ${FEVER_STAGES[0].combo}`;
  }

  // ─────────────────────────────────────────
  // RESULT SCREEN
  // ─────────────────────────────────────────
  function showResult(){
    state.gameOver = true;
    state.started = false;
    Tone.Transport.stop();
    releaseAllKeyGlows();

    const acc = state.judged ? Math.round(state.hits/state.judged*100) : 100;
    const rankStr = acc>=96?'S+':acc>=90?'S':acc>=80?'A':acc>=70?'B':'C';
    const rankColor = acc>=96?'#24f6ff':acc>=90?'#ff2bd6':acc>=80?'#ffe45e':'#8a92a6';

    $('resultRank').textContent = rankStr;
    $('resultRank').style.color = rankColor;
    $('resultScore').textContent = Math.floor(state.score).toLocaleString();
    $('resultAcc').textContent = acc + '%';
    $('resultCombo').textContent = state.maxCombo;
    $('resultSong').textContent = state.lastName || '-';

    const rs = $('resultScreen');
    rs.classList.add('active');
    const panel = rs.querySelector('.result-panel');
    gsap.fromTo(panel,{opacity:0,y:32,scale:.95},{opacity:1,y:0,scale:1,duration:.45,ease:'back.out(1.3)'});
    gsap.fromTo($('resultRank'),{scale:.5,opacity:0},{scale:1,opacity:1,duration:.55,delay:.18,ease:'back.out(1.6)'});
  }

  function fmt(sec){
    sec=Math.max(0,sec|0);
    const m=String((sec/60)|0).padStart(2,'0'), s=String(sec%60).padStart(2,'0');
    return `${m}:${s}`;
  }
