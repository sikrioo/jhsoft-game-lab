/* Core module: constants, state, init, mode switching */

const MODE_KEYS = {
    normal: ['a','s','d','f','j','k','l',';'],
    easy:   ['d','f','j','k'],
    simple: ['j','k']
  };
  const HIT_RATIO = 0.79;
  const FALL_TIME = 2.0;
  const PERFECT = 0.04, GOOD = 0.078, BAD = 0.13;
  const HOLD_MIN_DURATION = 0.6;  // 이 이상이면 롱노트로 분류 (캐논류 긴 음 과다 방지)
  const HOLD_MAX_DURATION = 1.0;  // 롱노트 최대 길이 (꼬리가 화면 밖으로 과도하게 길어지지 않도록)
  const TETRIS_COLORS = [0x35e7ff, 0x4f8dff, 0xffa03c, 0xffd24f, 0x7dff75, 0x9d6dff, 0xff5678, 0xfff0a8];
  const TETRIS_SHAPES = [
    [[0,0],[1,0],[2,0],[3,0]], [[0,0],[1,0],[0,1],[1,1]], [[1,0],[0,1],[1,1],[2,1]],
    [[0,0],[1,0],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[2,1]], [[2,0],[0,1],[1,1],[2,1]]
  ];
  const FEVER_STAGES = [
    { combo:20, multiplier:1.15, label:'FEVER 1' },
    { combo:40, multiplier:1.35, label:'FEVER 2' },
    { combo:65, multiplier:1.65, label:'FEVER 3' }
  ];
  const DEMO_MIDI_URL = 'assets/mid/sPIU_Beethoven_Virus.mid';
  const DEMO_CHART_URL = 'assets/chart/sPIU_Beethoven_Virus.chart.json';
  const MAX_BG_BLOCKS = 24;
  const MAX_FX_CHILDREN = 240;
  const HOLD_PARTICLE_INTERVAL = 0.065;
  function laneColor(lane){ return TETRIS_COLORS[lane % TETRIS_COLORS.length]; }

  const state = {
    app:null, w:0, h:0, laneW:0, totalW:0, startX:0, hitY:0, speed:0,
    mode:'normal', LANES:8, KEYS:MODE_KEYS.normal, KEY_TO_LANE:Object.fromEntries(MODE_KEYS.normal.map((k,i)=>[k,i])),
    notes:[], sprites:new Map(), started:false, paused:false, startAt:0, pauseAt:0, pausedSum:0,
    score:0, combo:0, maxCombo:0, judged:0, hits:0, bpm:120, duration:0,
    feverActive:false, feverLevel:0, feverMultiplier:1,
    sampler:null, samplerReady:false, samplerLoading:false, playbackNotes:[],
    bg:null, lanes:null, notesLayer:null, fx:null, keyLayer:null, bgBlocks:[], keyButtons:[],
    lastChart:null, lastBpm:120, lastName:'', lastPlayback:[],
    gameOver:false, heldLanes:new Map(), pressedKeys:new Set(),
    keyGlowTime:0,
    autoplay:false,
    chartExport:null, chartExportText:'',
    chartDebug:null,
    nextNoteUid:1,
    editor:{
      windowSpan:8,
      windowStart:0,
      selectedUid:null,
      drag:null
    }
  };
  const $ = id => document.getElementById(id);

  // ─────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────
  async function init(){
    ensureDemoButtons();
    const app = new PIXI.Application();
    await app.init({
      resizeTo:window, backgroundAlpha:0, antialias:false,
      resolution:Math.min(devicePixelRatio||1,2), autoDensity:true
    });
    state.app = app;
    app.ticker.maxFPS = 60;
    if(app.renderer) app.renderer.roundPixels = true;
    $('gameRoot').appendChild(app.canvas);
    state.bg = new PIXI.Container();
    state.lanes = new PIXI.Container();
    state.notesLayer = new PIXI.Container();
    state.keyLayer = new PIXI.Container();
    state.fx = new PIXI.Container();
    app.stage.addChild(state.bg, state.lanes, state.notesLayer, state.keyLayer, state.fx);
    const loaderPanel = document.querySelector('.loader .panel');
    const loaderDesc = loaderPanel?.querySelector('p');
    if(loaderPanel?.querySelector('h1')) loaderPanel.querySelector('h1').textContent = 'MIDI MUSE';
    if(loaderDesc) loaderDesc.innerHTML = 'Bemuse-inspired keyboard rhythm prototype.<br />Play Demo lets you play the built-in chart. Watch Demo runs the built-in autoplay showcase.';
    if($('modeNormalBtn')) $('modeNormalBtn').textContent = 'Normal (8K)';
    if($('modeEasyBtn')) $('modeEasyBtn').textContent = 'Easy (4K)';
    if($('modeSimpleBtn')) $('modeSimpleBtn').textContent = 'Simple (2K)';
    if($('fileBtnLabel')) $('fileBtnLabel').childNodes[0].nodeValue = 'Choose MIDI File';
    if($('demoBtn')) $('demoBtn').textContent = 'Play Demo';
    if($('watchDemoBtn')) $('watchDemoBtn').textContent = 'Watch Demo';
    if($('loadingText')) $('loadingText').textContent = 'The first run downloads the sampler.';
    if($('chartPanelSub')) $('chartPanelSub').textContent = 'No generated chart yet.';
    if($('chartCloseBtn')) $('chartCloseBtn').textContent = 'Close';
    if($('chartDataText')) $('chartDataText').value = 'No generated chart yet.';
    if($('copyChartBtn')) $('copyChartBtn').textContent = 'Copy All';
    if($('refreshChartBtn')) $('refreshChartBtn').textContent = 'Refresh';
    if($('copyNotesOnlyBtn')) $('copyNotesOnlyBtn').textContent = 'Copy Notes';
    if($('resultDemoBtn')) $('resultDemoBtn').textContent = 'Play Demo';
    if($('resultWatchDemoBtn')) $('resultWatchDemoBtn').textContent = 'Watch Demo';
    if($('retryBtn')) $('retryBtn').textContent = 'Retry';
    if($('backBtn')) $('backBtn').textContent = 'Back';
    if($('resultSong')) $('resultSong').textContent = '-';
    refreshAutoplayUi();
    resize(); window.addEventListener('resize', resize);
    app.ticker.add(tick);

    $('midiInput').addEventListener('change', async e => {
      const f = e.target.files?.[0];
      if(f) await loadMidi(f);
      e.target.value = ''; // 같은 파일 재선택 가능하도록
    });
    $('demoBtn').addEventListener('click', () => {
      if(state.samplerLoading) return;
      playDemoFromUi();
    });
    $('watchDemoBtn')?.addEventListener('click', () => {
      if(state.samplerLoading) return;
      watchDemoFromUi();
    });
    $('resultDemoBtn')?.addEventListener('click', () => {
      if(state.samplerLoading) return;
      playDemoFromUi();
    });
    $('resultWatchDemoBtn')?.addEventListener('click', () => {
      if(state.samplerLoading) return;
      watchDemoFromUi();
    });
    $('modeNormalBtn').addEventListener('click', () => setMode('normal'));
    $('modeEasyBtn').addEventListener('click', () => setMode('easy'));
    $('modeSimpleBtn').addEventListener('click', () => setMode('simple'));
    $('retryBtn').addEventListener('click', retryGame);
    $('backBtn').addEventListener('click', backToMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAllKeyGlows);
    $('chartToggleBtn')?.addEventListener('click', toggleChartPanel);
    $('chartCloseBtn')?.addEventListener('click', () => $('chartPanel')?.classList.remove('active'));
    $('copyChartBtn')?.addEventListener('click', () => copyChartData('full'));
    $('copyNotesOnlyBtn')?.addEventListener('click', () => copyChartData('notes'));
    $('refreshChartBtn')?.addEventListener('click', refreshChartPanel);
    $('editorPrevBtn')?.addEventListener('click', () => panEditorWindow(-4));
    $('editorCenterBtn')?.addEventListener('click', () => centerEditorWindow(songTime()));
    $('editorNextBtn')?.addEventListener('click', () => panEditorWindow(4));
    $('editorHoldBtn')?.addEventListener('click', toggleSelectedEditorHold);
    $('editorDeleteBtn')?.addEventListener('click', deleteSelectedEditorNote);
    $('chartEditorViewport')?.addEventListener('pointerdown', onEditorPointerDown);
    window.addEventListener('pointermove', onEditorPointerMove);
    window.addEventListener('pointerup', onEditorPointerUp);
  }

  function ensureDemoButtons(){
    const resultRow = $('retryBtn')?.parentElement;
    if(resultRow && !$('resultDemoBtn')){
      const btn = document.createElement('button');
      btn.id = 'resultDemoBtn';
      btn.textContent = 'Play Demo';
      resultRow.insertBefore(btn, $('retryBtn'));
    }
    if(resultRow && !$('resultWatchDemoBtn')){
      const btn = document.createElement('button');
      btn.id = 'resultWatchDemoBtn';
      btn.className = 'secondary';
      btn.textContent = 'Watch Demo';
      resultRow.insertBefore(btn, $('retryBtn'));
    }
  }

  function setMode(mode){
    if(state.started) return; // 게임 중에는 변경 불가
    state.mode = mode;
    state.KEYS = MODE_KEYS[mode];
    state.LANES = state.KEYS.length;
    state.KEY_TO_LANE = Object.fromEntries(state.KEYS.map((k,i)=>[k,i]));
    $('modeNormalBtn').classList.toggle('active', mode==='normal');
    $('modeEasyBtn').classList.toggle('active', mode==='easy');
    $('modeSimpleBtn').classList.toggle('active', mode==='simple');
    $('keyHint').textContent = state.KEYS.map(k=>k===';'?';':k.toUpperCase()).join(' ');
    resize();
  }

  // ─────────────────────────────────────────
  // RESIZE / DRAW
  // ─────────────────────────────────────────
