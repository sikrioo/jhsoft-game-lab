window.BgmSystem = (() => {
  const TRACKS = {
    "stage1:gameplay": {
      src: "./assets/bgm/stage-1/gameplay/Everything falls apart.ogg",
      volume: 0.34
    },
    "stage1:boss": {
      src: "./assets/bgm/stage-1/boss/usb.mp3",
      volume: 0.42
    },
    "stage2:gameplay": {
      src: "./assets/bgm/stage-2/gameplay/racing tecno.ogg",
      volume: 0.36
    },
    "stage2:boss:phase1": {
      src: "./assets/bgm/stage-2/boss/phase1/racing tecno_v2(slow).ogg",
      volume: 0.42
    },
    "stage2:boss:phase2": {
      src: "./assets/bgm/stage-2/boss/phase2/racing tecno_v2.ogg",
      volume: 0.46
    }
  };

  const players = new Map();
  let unlocked = false;
  let currentKey = null;

  function getStageIndex() {
    return Math.max(1, GameState.progression.stage || 1);
  }

  function getBossPhase() {
    if (!window.BossSystem) return null;
    const boss = BossSystem.getActiveBoss();
    if (!boss || !boss.isBoss) return null;
    return boss.phase && boss.phase > 1 ? `phase${boss.phase}` : "phase1";
  }

  function resolveTrackKey() {
    const stageKey = `stage${getStageIndex()}`;
    if (GameState.progression.stageState === "clear") return null;
    const inBoss = GameState.progression.stageState === "boss" || (window.BossSystem && BossSystem.hasActiveBoss());
    if (!inBoss) return `${stageKey}:gameplay`;

    const phase = getBossPhase();
    if (phase && TRACKS[`${stageKey}:boss:${phase}`]) return `${stageKey}:boss:${phase}`;
    if (TRACKS[`${stageKey}:boss`]) return `${stageKey}:boss`;
    return `${stageKey}:gameplay`;
  }

  function ensurePlayer(key) {
    if (players.has(key)) return players.get(key);
    const def = TRACKS[key];
    if (!def) return null;
    const audio = new Audio(def.src);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = def.volume != null ? def.volume : 0.35;
    players.set(key, audio);
    return audio;
  }

  function prime() {
    unlocked = true;
    for (const key of Object.keys(TRACKS)) ensurePlayer(key);
  }

  function stopAll() {
    currentKey = null;
    for (const audio of players.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  function playKey(key) {
    if (!unlocked) return false;
    if (!TRACKS[key]) return false;
    if (currentKey === key) return true;

    const next = ensurePlayer(key);
    if (!next) return false;

    for (const [otherKey, audio] of players.entries()) {
      if (otherKey === key) continue;
      audio.pause();
      audio.currentTime = 0;
    }

    currentKey = key;
    next.volume = TRACKS[key].volume != null ? TRACKS[key].volume : 0.35;
    const playPromise = next.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    return true;
  }

  function refresh() {
    if (!unlocked) return false;
    const key = resolveTrackKey();
    if (!key) return false;
    return playKey(key);
  }

  return {
    prime,
    refresh,
    stopAll
  };
})();
