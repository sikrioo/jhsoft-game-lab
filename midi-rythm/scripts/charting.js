/* Charting module: MIDI loading, analysis, chart generation utilities */

async function loadMidi(file){
    if(!window.ToneMidiParser){ alert('MIDI 파서 로딩 중입니다. 잠시 후 다시 시도해주세요.'); return; }
    setLoadingUI(true);
    try {
      const buffer = await file.arrayBuffer();
      const midi = new window.ToneMidiParser(buffer);
      const bpm = extractBpm(midi);
      const playback = extractPlaybackNotes(midi);
      let chart;
      if(state.mode === 'simple'){
        const totalDur = Math.max(...playback.map(n=>n.time+n.duration), 4);
        chart = generateSimplePatternChart(bpm, totalDur);
      } else {
        chart = generateAutoChart(midi, bpm);
      }
      if(chart.length < 1){ alert('채보를 만들 노트를 찾지 못했습니다.'); setLoadingUI(false); return; }
      await startGame(chart, bpm, file.name, playback);
    } catch(err) {
      console.error(err);
      alert('MIDI 파일 처리 중 오류: ' + err.message);
      setLoadingUI(false);
    }
  }

  function setLoadingUI(loading){
    state.samplerLoading = loading;
    $('demoBtn').disabled = loading;
    if($('watchDemoBtn')) $('watchDemoBtn').disabled = loading;
    if($('resultDemoBtn')) $('resultDemoBtn').disabled = loading;
    if($('resultWatchDemoBtn')) $('resultWatchDemoBtn').disabled = loading;
    const label = $('fileBtnLabel');
    if(loading) label.classList.add('disabled'); else label.classList.remove('disabled');
    $('loadingText').textContent = loading
      ? '로딩 중... 잠시만 기다려주세요.'
      : '첫 실행 시 피아노 샘플을 다운로드합니다.';
  }

  function extractBpm(midi){
    const tempos = midi.header?.tempos || [];
    if(tempos.length) return Math.round(tempos[0].bpm || 120);
    return 120;
  }

  function extractPlaybackNotes(midi){
    const raw = midi.tracks.flatMap((track, trackIndex) =>
      track.notes.map(n => ({
        time:n.time,
        duration:Math.min(Math.max(n.duration, 0.04), 1.4),
        midi:n.midi,
        velocity:Math.max(0.08, Math.min(0.9, n.velocity ?? 0.55)),
        trackIndex
      }))
    ).filter(n => n.duration > 0.02 && n.velocity > 0.05)
     .sort((a,b)=>a.time-b.time || b.velocity-a.velocity);

    const byBucket = new Map();
    for(const n of raw){
      const t = Math.round(n.time * 100) / 100;
      if(!byBucket.has(t)) byBucket.set(t, []);
      byBucket.get(t).push(n);
    }
    const out = [];
    for(const group of byBucket.values()){
      group.sort((a,b)=>b.velocity-a.velocity);
      out.push(...group.slice(0, 8));
    }
    return out.slice(0, 5000);
  }

  // ─────────────────────────────────────────
  // SAMPLER
  // ─────────────────────────────────────────
  async function ensureSampler(){
    if(state.samplerReady) return;
    $('loadingText').textContent = '피아노 샘플 로딩 중... 잠시만 기다려주세요.';
    if(!window.Tone){ throw new Error('Tone.js 로딩 실패'); }

    state.sampler = new Tone.Sampler({
      urls: {
        A0:'A0.mp3', C1:'C1.mp3', 'D#1':'Ds1.mp3', 'F#1':'Fs1.mp3', A1:'A1.mp3',
        C2:'C2.mp3', 'D#2':'Ds2.mp3', 'F#2':'Fs2.mp3', A2:'A2.mp3',
        C3:'C3.mp3', 'D#3':'Ds3.mp3', 'F#3':'Fs3.mp3', A3:'A3.mp3',
        C4:'C4.mp3', 'D#4':'Ds4.mp3', 'F#4':'Fs4.mp3', A4:'A4.mp3',
        C5:'C5.mp3', 'D#5':'Ds5.mp3', 'F#5':'Fs5.mp3', A5:'A5.mp3',
        C6:'C6.mp3', 'D#6':'Ds6.mp3', 'F#6':'Fs6.mp3', A6:'A6.mp3',
        C7:'C7.mp3', 'D#7':'Ds7.mp3', 'F#7':'Fs7.mp3', A7:'A7.mp3', C8:'C8.mp3'
      },
      release: 0.9,
      baseUrl: 'https://tonejs.github.io/audio/salamander/'
    }).toDestination();

    const compressor = new Tone.Compressor(-18, 3).toDestination();
    state.sampler.disconnect();
    state.sampler.connect(compressor);
    await Tone.loaded();
    state.sampler.volume.value = -7;
    state.samplerReady = true;
    $('loadingText').textContent = '샘플 로딩 완료!';
  }

  function scheduleSamplerPlayback(notes){
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    for(const n of notes){
      Tone.Transport.schedule((time) => {
        const noteName = Tone.Frequency(n.midi, 'midi').toNote();
        state.sampler.triggerAttackRelease(noteName, n.duration, time, n.velocity);
      }, n.time);
    }
  }

  // ─────────────────────────────────────────
  // SIMPLE PATTERN CHART (2키) — "딴다다 딴다다 딴다다다다다다" 리듬을
  // BPM 그리드에 맞춰 곡 끝까지 반복. MIDI 멜로디 추출 없이 박자만 사용.
  // ─────────────────────────────────────────
  function generateSimplePatternChart(bpm, totalDur){
    const beat = 60 / bpm;
    const grid = beat / 2; // 8분음표
    // 딴(강, lane0) 다(약, lane1) — 3+3+6 = 12 unit 패턴
    const pattern = [0,1,1, 0,1,1, 0,1,1,1,1,1];
    const chart = [];
    let t = 1.0, i = 0;
    while(t < totalDur){
      const lane = pattern[i % pattern.length];
      chart.push({
        id:chart.length, time:t, lane,
        duration: grid * 0.6,
        hold:false, holdEnd: t + grid*0.6, holding:false,
        hit:false, missed:false
      });
      t += grid; i++;
    }
    return chart;
  }

  // ─────────────────────────────────────────
  // AUTO CHART — Melody Focus
  // 핵심 변경점:
  // 1) 드럼/퍼커션 트랙 제외
  // 2) 전체 노트를 섞지 않고, 가장 멜로디다운 트랙을 먼저 선택
  // 3) 같은 시간대의 화음/반주음은 1개 대표 노트로 압축
  // 4) 목표 NPS(notes per second)를 제한해 “거의 모든 음을 치는” 문제 방지
  // ─────────────────────────────────────────
  const LEAD_TRACK_COUNT = 4;
  const TARGET_NPS = { normal:2.85, easy:1.85, simple:1.1 };

  function generateAutoChart(midi, bpm){
    const beat = 60 / bpm;
    const measure = getMeasureDuration(midi, beat);
    const grid = beat / 4;
    const minGap = Math.max(beat * (state.mode === 'normal' ? 0.5 : 0.8), 1 / (TARGET_NPS[state.mode] || 2.4));

    const tracks = analyzeMidiTracks(midi, beat, measure);
    let leadTracks = selectLeadTracks(tracks, LEAD_TRACK_COUNT);
    if(!leadTracks.length){
      leadTracks = tracks.filter(t => !t.isDrum && t.notes.length >= 8).sort((a,b)=>b.score-a.score).slice(0, Math.min(3, tracks.length));
    }

    const sourceNotes = collectLeadCandidates(leadTracks, tracks, beat, measure);
    state.chartDebug = {
      leadTracks: leadTracks.map(t => ({
        trackIndex:t.trackIndex,
        name:t.name,
        score:+t.score.toFixed(2),
        notes:t.notes.length,
        density:+t.density.toFixed(2)
      })),
      trackScores: tracks.map(t => ({
        trackIndex:t.trackIndex,
        name:t.name,
        family:t.family,
        score:+t.score.toFixed(2),
        notes:t.notes.length,
        density:+t.density.toFixed(2),
        avgPitch:+t.avgPitch.toFixed(2),
        isDrum:t.isDrum
      })),
      candidateCount: sourceNotes.length
    };
    console.table(state.chartDebug.trackScores);
    console.log('Selected lead tracks:', state.chartDebug.leadTracks);

    if(!sourceNotes.length) return [];

    const buckets = bucketSourceNotes(sourceNotes, grid);
    const skeleton = buildSkeletonChart(buckets, beat, measure, minGap);
    const densified = smoothChartDensity(skeleton, sourceNotes, beat, grid, minGap, measure);
    const withLanes = assignChartLanes(densified);
    return reindexChartNotes(withLanes, { preserveState:false });
  }

  function analyzeMidiTracks(midi, beat, measure){
    return midi.tracks.map((track, trackIndex) => {
      const isDrum = isLikelyDrumTrack(track);
      const name = (track.name || track.instrument?.name || `Track ${trackIndex}`).trim() || `Track ${trackIndex}`;
      const family = track.instrument?.family || '';
      const notes = (track.notes || [])
        .map(n => ({
          time:n.time,
          duration:Math.min(Math.max(n.duration || 0, 0.03), 1.8),
          midi:n.midi,
          velocity:Math.max(0.05, Math.min(1, n.velocity ?? 0.55)),
          trackIndex,
          name,
          family
        }))
        .filter(n => Number.isFinite(n.time) && Number.isFinite(n.midi) && n.duration >= 0.025)
        .sort((a,b)=>a.time-b.time || b.midi-a.midi);

      if(!notes.length){
        return {trackIndex, name, family, notes, isDrum, score:-999, density:0, avgPitch:0};
      }

      const pitches = notes.map(n=>n.midi);
      const velocities = notes.map(n=>n.velocity);
      const durations = notes.map(n=>n.duration);
      const first = Math.min(...notes.map(n=>n.time));
      const last = Math.max(...notes.map(n=>n.time+n.duration));
      const active = Math.max(1, last-first);
      const density = notes.length / active;
      const avgPitch = avg(pitches);
      const p85 = percentile(pitches, .85);
      const avgVel = avg(velocities);
      const medDur = median(durations);
      const velStd = stddev(velocities);
      const durStd = stddev(durations);
      const pitchSpan = percentile(pitches, .9) - percentile(pitches, .1);
      const poly = estimatePolyphony(notes);
      const intervalMed = estimateMedianInterval(notes);
      const repetition = estimateRepetition(notes, beat);

      annotateTrackNotes(notes, beat, measure, {avgVel, velStd});
      const accentRatio = avg(notes.map(n => (n.beatStrength >= 0.95 || n.trackVelocityLift > 0.55 || n.duration >= beat * 0.85) ? 1 : 0));
      const phraseRatio = avg(notes.map(n => (n.phraseStart || n.phraseEnd) ? 1 : 0));

      const pitchScore = clamp((p85 - 58) / 20, 0, 1.3) * 1.45 + clamp((avgPitch - 54) / 24, 0, 1.2) * 0.9;
      const densityTarget = state.mode === 'normal' ? 3.3 : 2.2;
      const densityScore = (1 - clamp(Math.abs(density - densityTarget) / 4.6, 0, 1)) * 1.2;
      const phraseScore = phraseRatio * 1.15;
      const accentScore = accentRatio * 1.1;
      const expressiveScore = clamp(velStd / 0.12, 0, 1) * 0.5 + clamp(durStd / 0.18, 0, 1) * 0.45;
      const motionScore = clamp(pitchSpan / 18, 0, 1.15) * 0.55 + clamp(intervalMed / 9, 0, 1.0) * 0.25;
      const monoScore = (1 - clamp((poly.avgSimul - 1.2) / 2.6, 0, 1)) * 0.95;
      const bassPenalty = avgPitch < 50 ? 1.0 : 0;
      const ostinatoPenalty = repetition.ostinato * 1.35;
      const densePenalty = density > 9 ? (density - 9) * 0.15 : 0;
      const drumPenalty = isDrum ? 999 : 0;
      const score = pitchScore + densityScore + phraseScore + accentScore + expressiveScore + motionScore + monoScore
        - bassPenalty - ostinatoPenalty - densePenalty - drumPenalty;

      return {
        trackIndex, name, family, notes, isDrum, score, density, avgPitch, avgVel, medDur,
        velStd, durStd, pitchSpan, poly, intervalMed, repetition
      };
    });
  }

  function isLikelyDrumTrack(track){
    const name = `${track.name || ''} ${track.instrument?.name || ''}`.toLowerCase();
    return track.channel === 9 || track.instrument?.percussion === true ||
      name.includes('drum') || name.includes('percussion') || name.includes('kit');
  }

  function getMeasureDuration(midi, beat){
    const sig = midi.header?.timeSignatures?.[0]?.timeSignature || [4,4];
    const numerator = sig[0] || 4;
    const denominator = sig[1] || 4;
    return beat * numerator * (4 / denominator);
  }

  function selectLeadTracks(tracks, count){
    const ranked = tracks
      .filter(t => !t.isDrum && t.notes.length >= 16 && t.density <= 10.5 && percentile(t.notes.map(n=>n.midi), .75) >= 52)
      .sort((a,b)=>b.score-a.score);

    const selected = [];
    for(const track of ranked){
      const tooSimilar = selected.some(prev =>
        Math.abs(prev.avgPitch - track.avgPitch) < 3 &&
        Math.abs(prev.density - track.density) < 0.85 &&
        prev.family === track.family &&
        track.score < prev.score + 0.55
      );
      if(tooSimilar) continue;
      selected.push(track);
      if(selected.length >= count) break;
    }
    return selected.length ? selected : ranked.slice(0, count);
  }

  function annotateTrackNotes(notes, beat, measure, meta){
    const byBucket = new Map();
    for(const note of notes){
      const key = Math.round(note.time * 1000) / 1000;
      if(!byBucket.has(key)) byBucket.set(key, []);
      byBucket.get(key).push(note);
    }
    for(const group of byBucket.values()){
      const sorted = [...group].sort((a,b)=>b.midi-a.midi || b.velocity-a.velocity);
      const spread = sorted.length > 1 ? sorted[0].midi - sorted[sorted.length-1].midi : 0;
      sorted.forEach((note, index) => {
        note.voiceRank = index;
        note.voiceCount = sorted.length;
        note.voiceSpread = spread;
      });
    }

    const ordered = [...notes].sort((a,b)=>a.time-b.time || b.midi-a.midi);
    for(let i=0;i<ordered.length;i++){
      const note = ordered[i];
      let prev = null;
      for(let p=i-1; p>=0; p--){
        if(ordered[p].time < note.time - 0.02){ prev = ordered[p]; break; }
      }
      let next = null;
      for(let n=i+1; n<ordered.length; n++){
        if(ordered[n].time > note.time + 0.02){ next = ordered[n]; break; }
      }

      note.prevGap = prev ? note.time - prev.time : 999;
      note.nextGap = next ? next.time - note.time : 999;
      note.intervalFromPrev = prev ? note.midi - prev.midi : 0;
      note.intervalToNext = next ? next.midi - note.midi : 0;
      note.beatStrength = beatStrengthAt(note.time, beat, measure);
      note.phraseStart = note.prevGap > beat * 0.45 ? 1 : 0;
      note.phraseEnd = note.nextGap > beat * 0.45 ? 1 : 0;
      const velLift = meta.velStd > 0.0001 ? (note.velocity - meta.avgVel) / meta.velStd : (note.velocity - meta.avgVel) * 4;
      note.trackVelocityLift = clamp(velLift, -1.2, 1.8);
      note.repetitionPenalty = prev && note.prevGap < beat * 0.55 && Math.abs(note.intervalFromPrev) <= 2 && note.duration < beat * 0.45
        ? (Math.abs(note.intervalFromPrev) === 0 ? 0.62 : 0.35)
        : 0;
      if(note.voiceCount > 2 && note.voiceRank > 1) note.repetitionPenalty += 0.15;
    }
  }

  function collectLeadCandidates(leadTracks, tracks, beat, measure){
    const bucketSize = Math.max(beat / 8, 0.06);
    const ensemble = new Map();
    for(const track of tracks.filter(t => !t.isDrum)){
      for(const note of track.notes){
        const key = Math.round(note.time / bucketSize);
        if(!ensemble.has(key)) ensemble.set(key, []);
        ensemble.get(key).push(note);
      }
    }
    for(const group of ensemble.values()){
      group.sort((a,b)=>b.midi-a.midi || b.velocity-a.velocity);
    }

    const out = [];
    for(const track of leadTracks){
      for(const note of track.notes){
        if(note.velocity < 0.13 || note.duration < 0.03) continue;
        if(note.voiceCount > 2 && note.voiceRank > 1) continue;

        const key = Math.round(note.time / bucketSize);
        const group = ensemble.get(key) || [];
        const globalRank = group.indexOf(note);
        const globalTopBonus = globalRank === 0 ? 0.62 : globalRank === 1 ? 0.34 : globalRank === 2 ? 0.12 : -0.08;
        const topVoiceBonus = note.voiceRank === 0 ? 0.42 : note.voiceRank === 1 ? 0.14 : -0.18;
        const highRegister = clamp((note.midi - track.avgPitch) / 12, -0.25, 0.75);
        const lowRegisterPenalty = note.midi < track.avgPitch - 7
          ? clamp((track.avgPitch - 7 - note.midi) / 6, 0, 1.2) * 0.9
          : 0;
        const durScore = clamp(note.duration / Math.max(beat * 0.9, 0.42), 0, 1.25) * 0.55;
        const accentScore = note.beatStrength * 0.48
          + note.phraseStart * 0.38
          + note.phraseEnd * 0.16
          + clamp(note.trackVelocityLift * 0.18, -0.15, 0.45);
        const priority = track.score * 0.34 + globalTopBonus + topVoiceBonus + highRegister * 0.34 + durScore + accentScore
          - note.repetitionPenalty * 0.95
          - lowRegisterPenalty;

        out.push({
          ...note,
          trackScore:track.score,
          trackAvgPitch:track.avgPitch,
          trackIndex:track.trackIndex,
          name:track.name,
          family:track.family,
          globalRank,
          accentScore,
          priority
        });
      }
    }
    return out.sort((a,b)=>a.time-b.time || b.priority-a.priority || b.midi-a.midi);
  }

  function bucketSourceNotes(sourceNotes, grid){
    const buckets = new Map();
    for(const note of sourceNotes){
      const t = roundTo(Math.round(note.time / grid) * grid, 4);
      if(!buckets.has(t)) buckets.set(t, []);
      buckets.get(t).push({...note, time:t});
    }
    for(const group of buckets.values()){
      group.sort((a,b)=>b.priority-a.priority || b.midi-a.midi);
    }
    return buckets;
  }

  function buildSkeletonChart(buckets, beat, measure, minGap){
    const times = [...buckets.keys()].sort((a,b)=>a-b);
    const chart = [];
    const context = { lastTime:-999, lastPitch:null, flowDir:0, chordStreak:0, lastChordTime:-999 };

    for(const t of times){
      const group = buckets.get(t);
      const chosen = chooseMelodyNote(group, context, beat, measure);
      if(!chosen) continue;

      const strongAccent = chosen.accentScore >= 0.95 || chosen.beatStrength >= 0.95;
      const lowSupport = chosen.midi < (chosen.trackAvgPitch ?? chosen.midi) - 7;
      const lowSupportRun = lowSupport && chosen.prevGap < beat * 0.7 && chosen.nextGap < beat * 0.7;
      const gapFactor = strongAccent ? 0.56 : lowSupportRun ? 1.8 : lowSupport ? 1.55 : chosen.repetitionPenalty > 0.45 ? 1.18 : chosen.priority > 2.35 ? 0.78 : 1;
      if(t - context.lastTime < minGap * gapFactor && !strongAccent) continue;
      if(lowSupportRun && chosen.accentScore < 1.25) continue;
      if(lowSupport && chosen.accentScore < 1.18 && chosen.repetitionPenalty > 0.2) continue;
      if(chosen.repetitionPenalty > 0.55 && !strongAccent && chosen.globalRank > 1) continue;

      const notesAtTime = [createChartNoteFromSource(chosen, t, beat)];
      const chordSize = computeChordSize(group, chosen, context, beat, measure);
      if(chordSize > 1){
        const supports = pickChordSupportNotes(group, chosen, chordSize - 1);
        for(const extra of supports){
          notesAtTime.push(createChartNoteFromSource(extra, t, beat));
        }
      }

      chart.push(...notesAtTime);
      if(context.lastPitch != null){
        const diff = chosen.midi - context.lastPitch;
        if(diff !== 0) context.flowDir = Math.sign(diff);
      }
      context.lastPitch = chosen.midi;
      context.lastTime = t;
      if(notesAtTime.length > 1){
        context.chordStreak = Math.min(2, context.chordStreak + 1);
        context.lastChordTime = t;
      } else {
        context.chordStreak = 0;
      }
    }
    return chart;
  }

  function chooseMelodyNote(group, context, beat, measure){
    if(!group?.length) return null;
    return group
      .map(note => {
        const lastPitch = context.lastPitch;
        const gap = lastPitch == null ? 0 : Math.abs(note.midi - lastPitch);
        const continuity = lastPitch == null ? 0 : (gap <= 7 ? 0.45 : gap <= 12 ? 0.18 : -Math.min((gap - 12) * 0.05, 0.6));
        const direction = lastPitch == null || context.flowDir === 0 || note.midi === lastPitch
          ? 0
          : (Math.sign(note.midi - lastPitch) === context.flowDir ? 0.1 : -0.04);
        const beatBias = isStrongBeat(note.time, beat, measure) ? 0.18 : 0;
        return {note, score:note.priority + continuity + direction + beatBias};
      })
      .sort((a,b)=>b.score-a.score)[0].note;
  }

  function createChartNoteFromSource(source, time, beat){
    const tapCap = Math.max(0.34, beat * 0.95);
    const holdCap = Math.max(HOLD_MAX_DURATION * 2.2, beat * 2.6);
    const rawDur = clamp(source.duration || 0.12, 0.08, holdCap);
    const holdBias = source.accentScore > 0.9 || source.phraseEnd || source.nextGap > beat * 0.75;
    const hold = rawDur >= HOLD_MIN_DURATION * 0.82 && holdBias;
    const duration = hold ? rawDur : Math.min(rawDur, tapCap);
    return {
      id:0,
      uid:allocNoteUid(),
      time:roundTo(time, 4),
      lane:0,
      midi:source.midi,
      duration:roundTo(duration, 4),
      hold,
      holdEnd:roundTo(time + duration, 4),
      manualLane:false,
      sourceTrack:source.trackIndex,
      sourceTrackName:source.name,
      accent:source.accentScore,
      priority:source.priority,
      holding:false,
      hit:false,
      missed:false
    };
  }

  function computeChordSize(group, chosen, context, beat, measure){
    if(group.length < 2) return 1;
    if(context.chordStreak >= 2 || chosen.time - context.lastChordTime < beat * 0.8) return 1;
    const strongAccent = chosen.accentScore >= 1.2 || chosen.velocity >= 0.82 || beatStrengthAt(chosen.time, beat, measure) >= 1.2;
    if(!strongAccent) return 1;
    const pitchSpread = Math.max(...group.map(n=>n.midi)) - Math.min(...group.map(n=>n.midi));
    if(pitchSpread < 5) return 1;
    const supports = group.filter(n => n !== chosen && Math.abs(n.midi - chosen.midi) >= 4 && (n.voiceRank ?? 0) <= 1);
    if(!supports.length) return 1;
    if(supports.length >= 2 && (chosen.accentScore >= 1.45 || chosen.velocity >= 0.88) && pitchSpread >= 10) return 3;
    return 2;
  }

  function pickChordSupportNotes(group, chosen, count){
    return group
      .filter(n => n !== chosen && Math.abs(n.midi - chosen.midi) >= 4 && (n.voiceRank ?? 0) <= 1)
      .map(note => {
        const distance = Math.abs(note.midi - chosen.midi);
        const spacing = distance >= 4 && distance <= 14 ? 0.55 : distance > 14 ? 0.32 : -0.2;
        const lowerAnchor = note.midi < chosen.midi ? 0.18 : 0.08;
        return {note, score:note.priority * 0.62 + spacing + lowerAnchor - note.repetitionPenalty * 0.8};
      })
      .sort((a,b)=>b.score-a.score)
      .slice(0, count)
      .map(entry => entry.note);
  }

  function smoothChartDensity(chart, sourceNotes, beat, grid, minGap, measure){
    if(chart.length < 2 || !sourceNotes.length) return chart;
    const maxGap = Math.max(beat * 2.25, minGap * 2.1);
    const additions = [];
    const existingTimes = new Set(chart.map(n => roundTo(n.time, 4)));
    const grouped = groupNotesByTime(chart);
    const times = [...grouped.keys()].sort((a,b)=>a-b);

    for(let i=0;i<times.length-1;i++){
      const a = times[i];
      const b = times[i+1];
      if(b - a <= maxGap) continue;

      const midStart = a + minGap * 0.8;
      const midEnd = b - minGap * 0.8;
      const candidate = sourceNotes
        .filter(n => n.time >= midStart && n.time <= midEnd)
        .map(n => {
          const t = roundTo(Math.round(n.time / grid) * grid, 4);
          return {note:n, t, score:n.priority + n.accentScore * 0.45 + (isStrongBeat(n.time, beat, measure) ? 0.18 : 0)};
        })
        .filter(entry => !existingTimes.has(entry.t))
        .sort((x,y)=>y.score-x.score)[0];

        if(candidate && (candidate.note.accentScore > 0.55 || isStrongBeat(candidate.note.time, beat, measure))){
          additions.push(createChartNoteFromSource(candidate.note, candidate.t, beat));
          existingTimes.add(candidate.t);
        }
    }

    const merged = [...chart, ...additions].sort((a,b)=>a.time-b.time || (b.priority ?? 0)-(a.priority ?? 0) || b.midi-a.midi);
    const mergedGroups = groupNotesByTime(merged);
    const final = [];
    let lastTime = -999;

    for(const time of [...mergedGroups.keys()].sort((a,b)=>a-b)){
      const group = mergedGroups.get(time).sort((a,b)=>a.midi-b.midi);
      const strongGroup = group.length > 1 || Math.max(...group.map(n=>n.accent || 0)) >= 1.1;
      if(time - lastTime < minGap * 0.68 && !strongGroup) continue;
      final.push(...group);
      lastTime = time;
    }

    return final;
  }

  function assignChartLanes(chart){
    if(!chart.length) return [];
    const pitches = chart.map(n=>n.midi).filter(Number.isFinite);
    const pitchMin = percentile(pitches, 0.12);
    const pitchMax = percentile(pitches, 0.88);
    const groups = groupNotesByTime(chart);
    const context = {
      lastLane:Math.floor((state.LANES-1) / 2),
      lastPitch:null,
      lastTime:-999,
      flowDir:0,
      laneLastTimes:Array(state.LANES).fill(-999)
    };
    const out = [];

    for(const time of [...groups.keys()].sort((a,b)=>a-b)){
      const group = [...groups.get(time)];
      if(group.length > 3){
        group.sort((a,b)=>(b.priority ?? 0)-(a.priority ?? 0) || b.midi-a.midi);
        group.length = 3;
      }
      group.sort((a,b)=>a.midi-b.midi);

      if(group.length === 1){
        const note = group[0];
        note.lane = note.manualLane ? clamp(Math.round(note.lane || 0), 0, state.LANES-1) : smartLane(note, context, pitchMin, pitchMax, new Set());
        touchLaneContext(context, note);
        out.push(note);
        continue;
      }

      assignChordLanes(group, context, pitchMin, pitchMax);
      const lead = [...group].sort((a,b)=>(b.priority ?? 0)-(a.priority ?? 0) || b.midi-a.midi)[0];
      touchLaneContext(context, lead);
      for(const note of group){
        context.laneLastTimes[note.lane] = note.time;
        out.push(note);
      }
    }

    return out.sort((a,b)=>a.time-b.time || a.lane-b.lane || b.midi-a.midi);
  }

  function assignChordLanes(group, context, pitchMin, pitchMax){
    const lead = [...group].sort((a,b)=>(b.priority ?? 0)-(a.priority ?? 0) || b.midi-a.midi)[0];
    const anchorLane = smartLane(lead, context, pitchMin, pitchMax, new Set());
    const lanes = chordLaneWindow(group.length, anchorLane);
    const sorted = [...group].sort((a,b)=>a.midi-b.midi);
    sorted.forEach((note, index) => {
      note.lane = lanes[Math.min(index, lanes.length-1)];
      note.manualLane = false;
    });
  }

  function chordLaneWindow(count, anchorLane){
    if(count <= 1) return [clamp(anchorLane, 0, state.LANES-1)];
    if(count === 2){
      const low = clamp(anchorLane - 1, 0, state.LANES - 2);
      const high = Math.min(state.LANES - 1, low + 2);
      return high - low >= 2 ? [low, high] : [low, low + 1];
    }
    const start = clamp(anchorLane - 1, 0, state.LANES - 3);
    return [start, start + 1, start + 2];
  }

  function touchLaneContext(context, note){
    context.lastLane = note.lane;
    context.lastPitch = note.midi;
    context.lastTime = note.time;
    context.laneLastTimes[note.lane] = note.time;
  }

  function smartLane(note, context, pitchMin, pitchMax, occupied){
    let lane = Math.round(pitchToLane(note.midi, pitchMin, pitchMax));
    const timeGap = note.time - context.lastTime;

    if(context.lastPitch != null){
      const diff = note.midi - context.lastPitch;
      const absDiff = Math.abs(diff);
      if(absDiff >= 2){
        const step = absDiff >= 7 ? 2 : 1;
        if(diff > 0) lane = Math.max(lane, context.lastLane + step);
        else if(diff < 0) lane = Math.min(lane, context.lastLane - step);
      }

      if(timeGap < 0.24){
        lane = alternateHandLane(lane, context.lastLane, diff);
      } else if(timeGap < 0.34 && lane === context.lastLane){
        lane += diff >= 0 ? 1 : -1;
      }
    }

    lane = resolveLaneReuse(lane, context, note.time, occupied, note.midi - (context.lastPitch ?? note.midi));
    return lane;
  }

  function pitchToLane(midi, pitchMin, pitchMax){
    const span = Math.max(8, pitchMax - pitchMin);
    const normalized = clamp((midi - pitchMin) / span, 0, 1);
    return normalized * (state.LANES - 1);
  }

  function alternateHandLane(lane, lastLane, diff){
    const mid = state.LANES / 2;
    const lastWasLeft = lastLane < mid;
    const currentLeft = lane < mid;
    if(lastWasLeft === currentLeft){
      lane = lastWasLeft
        ? Math.max(Math.floor(mid), lane + Math.ceil(mid * 0.75))
        : Math.min(Math.ceil(mid) - 1, lane - Math.ceil(mid * 0.75));
    }
    if(diff > 0 && lane <= lastLane) lane = lastLane + 1;
    if(diff < 0 && lane >= lastLane) lane = lastLane - 1;
    return clamp(lane, 0, state.LANES-1);
  }

  function resolveLaneReuse(lane, context, time, occupied, pitchDiff=0){
    lane = clamp(lane, 0, state.LANES-1);
    const direction = pitchDiff >= 0 ? 1 : -1;
    const candidates = [];
    const push = cand => {
      if(Number.isFinite(cand) && cand >= 0 && cand < state.LANES && !candidates.includes(cand)) candidates.push(cand);
    };

    push(lane);
    push(lane + direction);
    push(lane - direction);
    push(lane + direction * 2);
    push(lane - direction * 2);
    push(context.lastLane + direction);
    push(context.lastLane - direction);

    for(const cand of candidates){
      if(occupied.has(cand)) continue;
      const sameLaneFast = time - (context.laneLastTimes[cand] ?? -999) < 0.28;
      const sameAsPrevFast = cand === context.lastLane && time - context.lastTime < 0.32;
      if(sameLaneFast || sameAsPrevFast) continue;
      return cand;
    }
    for(const cand of candidates){
      if(!occupied.has(cand)) return cand;
    }
    return lane;
  }

  function beatStrengthAt(time, beat, measure){
    const pos = ((time % measure) + measure) % measure;
    if(distanceToGrid(pos, measure) <= beat * 0.08) return 1.35;
    if(distanceToGrid(pos, beat) <= beat * 0.08) return 0.95;
    if(distanceToGrid(pos, beat / 2) <= beat * 0.055) return 0.42;
    return 0;
  }

  function isStrongBeat(time, beat, measure){
    return beatStrengthAt(time, beat, measure) >= 0.95;
  }

  function distanceToGrid(value, grid){
    const mod = ((value % grid) + grid) % grid;
    return Math.min(mod, grid - mod);
  }

  function estimatePolyphony(notes){
    const buckets = new Map();
    for(const note of notes){
      const t = Math.round(note.time * 20) / 20;
      buckets.set(t, (buckets.get(t) || 0) + 1);
    }
    const values = [...buckets.values()];
    return {avgSimul:avg(values), maxSimul:values.length ? Math.max(...values) : 1};
  }

  function estimateMedianInterval(notes){
    const sorted = [...notes].sort((a,b)=>a.time-b.time || b.midi-a.midi);
    const intervals = [];
    let prev = null;
    for(const note of sorted){
      if(prev != null && note.time > prev.time + 0.025) intervals.push(Math.abs(note.midi - prev.midi));
      prev = note;
    }
    return median(intervals);
  }

  function estimateRepetition(notes, beat){
    const sorted = [...notes].sort((a,b)=>a.time-b.time || b.midi-a.midi);
    let same = 0, close = 0, pulse = 0, count = 0;
    let prev = null;
    for(const note of sorted){
      if(prev != null && note.time > prev.time + 0.025){
        const gap = note.time - prev.time;
        const diff = Math.abs(note.midi - prev.midi);
        if(diff === 0) same++;
        if(diff <= 2 && gap < beat * 0.6) close++;
        if(gap <= beat * 0.55) pulse++;
        count++;
      }
      prev = note;
    }
    const sameRatio = same / Math.max(1, count);
    const closeRatio = close / Math.max(1, count);
    const pulseRatio = pulse / Math.max(1, count);
    return {
      sameRatio,
      closeRatio,
      pulseRatio,
      ostinato: clamp(sameRatio * 1.2 + closeRatio * 0.45 + pulseRatio * 0.25, 0, 1.6)
    };
  }

  function groupNotesByTime(notes){
    const groups = new Map();
    for(const note of notes){
      const key = roundTo(note.time, 4);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(note);
    }
    return groups;
  }

  function allocNoteUid(){
    const uid = state.nextNoteUid;
    state.nextNoteUid += 1;
    return uid;
  }

  function reindexChartNotes(notes, {preserveState=true} = {}){
    const tapCap = Math.max(0.36, (60 / Math.max(1, state.bpm || 120)) * 0.95);
    const holdCap = Math.max(HOLD_MAX_DURATION * 2.4, tapCap * 3.2);

    notes.sort((a,b)=>a.time-b.time || (a.lane ?? 0) - (b.lane ?? 0) || (b.midi ?? 0) - (a.midi ?? 0));
    notes.forEach((note, index) => {
      if(!note.uid) note.uid = allocNoteUid();
      note.id = index;
      note.time = roundTo(Math.max(0, note.time || 0), 4);
      note.duration = roundTo(clamp(Number.isFinite(note.duration) ? note.duration : 0.12, 0.08, holdCap), 4);
      note.lane = clamp(Math.round(note.lane || 0), 0, state.LANES-1);
      if(note.hold || note.duration >= HOLD_MIN_DURATION * 0.7){
        note.hold = note.duration >= Math.max(0.18, HOLD_MIN_DURATION * 0.65);
      } else {
        note.hold = false;
      }
      if(!note.hold) note.duration = roundTo(Math.min(note.duration, tapCap), 4);
      note.holdEnd = roundTo(note.time + note.duration, 4);
      note.manualLane = !!note.manualLane;
      note.holding = false;
      if(!preserveState){
        note.hit = false;
        note.missed = false;
      } else {
        note.hit = !!note.hit;
        note.missed = !!note.missed;
      }
    });
    return notes;
  }

  function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
  function median(arr){
    if(!arr.length) return 0;
    const sorted = [...arr].sort((a,b)=>a-b);
    const mid = sorted.length >> 1;
    return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
  }
  function percentile(arr, p){
    if(!arr.length) return 0;
    const sorted = [...arr].sort((a,b)=>a-b);
    const idx = Math.min(sorted.length-1, Math.max(0, Math.floor((sorted.length-1) * p)));
    return sorted[idx];
  }
  function stddev(arr){
    if(arr.length < 2) return 0;
    const mean = avg(arr);
    return Math.sqrt(avg(arr.map(v => (v-mean) ** 2)));
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
  function roundTo(value, digits=4){
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }
