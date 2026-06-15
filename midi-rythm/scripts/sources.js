/* Source module: autoplay state, imported charts, built-in demo loading */

function refreshAutoplayUi(){
    const el = $('autoPlayHint');
    document.body.classList.toggle('autoplay-on', !!state.autoplay);
    if(!el) return;
    el.textContent = `F2 : AUTOPLAY ${state.autoplay ? 'ON' : 'OFF'}`;
    el.style.color = state.autoplay ? '#ffd978' : 'rgba(246,241,220,.78)';
  }

  function setAutoplay(enabled){
    state.autoplay = !!enabled;
    if(!state.autoplay) releaseAllKeyGlows();
    refreshAutoplayUi();
  }

  function toggleAutoplay(){
    setAutoplay(!state.autoplay);
  }

  function playDemoFromUi(){
    if(state.samplerLoading) return;
    startDemo({ autoplay:false });
  }

  function watchDemoFromUi(){
    if(state.samplerLoading) return;
    startDemo({ autoplay:true });
  }

  function modeForLaneCount(lanes){
    if(lanes === 2) return 'simple';
    if(lanes === 4) return 'easy';
    if(lanes === 8) return 'normal';
    return null;
  }

  function preferredImportedDifficulty(mode=state.mode){
    return mode === 'normal' ? 'normal' : 'easy';
  }

  function convertImportedChartData(data, preferredDifficulty=preferredImportedDifficulty()){
    if(!data || typeof data !== 'object' || !data.difficulties || typeof data.difficulties !== 'object'){
      return null;
    }

    const difficultyOrder = [preferredDifficulty, 'normal', 'hard', 'easy']
      .filter((value, index, arr) => value && arr.indexOf(value) === index);
    const difficultyName = difficultyOrder.find(name => Array.isArray(data.difficulties?.[name]?.notes) && data.difficulties[name].notes.length)
      || Object.keys(data.difficulties).find(name => Array.isArray(data.difficulties?.[name]?.notes) && data.difficulties[name].notes.length);

    if(!difficultyName) throw new Error('Imported chart data has no playable difficulty.');

    const sourceNotes = data.difficulties[difficultyName].notes;
    const laneCount = Number(data.lanes) || (Math.max(0, ...sourceNotes.map(note => Number(note.lane) || 0)) + 1);
    if(!modeForLaneCount(laneCount)){
      throw new Error(`Unsupported imported lane count: ${laneCount}.`);
    }

    const chart = sourceNotes.map((note, index) => {
      const time = Math.max(0, Number(note.time) || 0);
      const rawDuration = Math.max(0.04, Number(note.duration) || 0.12);
      const hold = note.type === 'hold';
      const duration = hold ? rawDuration : Math.min(rawDuration, 0.16);
      const lane = clamp(Math.round(Number(note.lane) || 0), 0, laneCount - 1);
      const midi = Math.round(Number(note.pitch) || 60);
      return {
        id:index,
        time:roundTo(time, 4),
        lane,
        midi,
        sourcePitch:midi,
        duration:roundTo(duration, 4),
        hold,
        holdEnd:roundTo(time + duration, 4),
        holding:false,
        hit:false,
        missed:false
      };
    }).sort((a,b) => a.time - b.time || a.lane - b.lane || a.id - b.id);

    chart.forEach((note, index) => { note.id = index; });
    return {
      chart,
      difficultyName,
      laneCount,
      bpm:Number(data.bpm) || null,
      sourceTracks:Array.isArray(data.source_tracks) ? [...data.source_tracks] : []
    };
  }

  // ─────────────────────────────────────────
  // GAME START / RETRY / BACK
  // ─────────────────────────────────────────
  async function startDemo({autoplay=true} = {}){
    if(!window.ToneMidiParser){ alert('MIDI parser is still loading. Please try again in a moment.'); return; }
    setAutoplay(autoplay);
    setLoadingUI(true);
    try{
      const preferredDifficulty = preferredImportedDifficulty();
      const [midiRes, chartRes] = await Promise.all([
        fetch(DEMO_MIDI_URL),
        fetch(DEMO_CHART_URL)
      ]);
      if(!midiRes.ok) throw new Error(`Demo MIDI load failed (${midiRes.status}).`);
      if(!chartRes.ok) throw new Error(`Demo chart load failed (${chartRes.status}).`);

      const [buffer, importedData] = await Promise.all([
        midiRes.arrayBuffer(),
        chartRes.json()
      ]);
      const imported = convertImportedChartData(importedData, preferredDifficulty);
      if(!imported) throw new Error('Demo chart format is not supported.');

      const targetMode = modeForLaneCount(imported.laneCount);
      if(targetMode && !state.started && state.mode !== targetMode){
        setMode(targetMode);
      }

      const midi = new window.ToneMidiParser(buffer);
      const bpm = imported.bpm || extractBpm(midi);
      const playback = extractPlaybackNotes(midi);
      state.chartDebug = {
        imported:true,
        format:'external-difficulty-chart',
        difficulty:imported.difficultyName,
        sourceTracks:imported.sourceTracks
      };
      const demoLabel = autoplay ? 'Watch Demo' : 'Play Demo';
      await startGame(imported.chart, bpm, `sPIU_Beethoven_Virus.mid [${imported.difficultyName}] / ${demoLabel}`, playback);
    }catch(err){
      console.error(err);
      alert('Built-in demo load failed: ' + err.message);
      setLoadingUI(false);
    }
  }
