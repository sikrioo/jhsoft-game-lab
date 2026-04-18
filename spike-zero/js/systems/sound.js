window.SoundSystem = (() => {
  const SOUND_DEFS = {
    player_fire: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser2.ogg",
      volume: 0.18,
      poolSize: 6,
      cooldownMs: 58
    },
    laser_fire: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser9.ogg",
      volume: 0.2,
      poolSize: 4,
      cooldownMs: 120
    },
    shotgun_fire: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser5.ogg",
      volume: 0.22,
      poolSize: 4,
      cooldownMs: 90
    },
    missile_launch: {
      src: "./assets/sfx/kenney_digital-audio/Audio/laser1.ogg",
      volume: 0.34,
      poolSize: 4,
      cooldownMs: 70
    },
    player_hit: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/forceField_003.ogg",
      volume: 0.26,
      poolSize: 3,
      cooldownMs: 90
    },
    level_up: {
      src: "./assets/sfx/kenney_digital-audio/Audio/powerUp5.ogg",
      volume: 0.34,
      poolSize: 2,
      cooldownMs: 160
    },
    comms: {
      src: "./assets/sfx/kenney_digital-audio/Audio/phaserUp3.ogg",
      volume: 0.2,
      poolSize: 3,
      cooldownMs: 60
    },
    radio_in: {
      src: "./assets/sfx/kenney_digital-audio/Audio/phaserUp2.ogg",
      volume: 0.22,
      poolSize: 3,
      cooldownMs: 40
    },
    radio_out: {
      src: "./assets/sfx/kenney_digital-audio/Audio/phaserDown2.ogg",
      volume: 0.18,
      poolSize: 3,
      cooldownMs: 40
    },
    upgrade_pick: {
      src: "./assets/sfx/levelup/universfield-level-up-05-326133.mp3",
      volume: 0.34,
      poolSize: 2,
      cooldownMs: 120
    },
    ui_hover: {
      src: "./assets/sfx/kenney_ui-audio/Audio/rollover2.ogg",
      volume: 0.24,
      poolSize: 3,
      cooldownMs: 45
    },
      boss_alarm: {
        src: "./assets/sfx/alert/red-alert.mp3",
        volume: 0.46,
        poolSize: 4,
        cooldownMs: 1200
      },
    low_explosion: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/lowFrequency_explosion_001.ogg",
      volume: 0.3,
      poolSize: 3,
      cooldownMs: 140
    },
    boss_destroy: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_001.ogg",
      volume: 0.48,
      poolSize: 2,
      cooldownMs: 250
    },
      boss_clear: {
        src: "./assets/sfx/kenney_digital-audio/Audio/powerUp10.ogg",
        volume: 0.34,
        poolSize: 2,
        cooldownMs: 250
      },
      stage_clear: {
        src: "./assets/sfx/stage/clear/grumpynora-rock-ending-8-440862.mp3",
        volume: 0.44,
        poolSize: 2,
        cooldownMs: 500
      },
      player_death: {
        src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_000.ogg",
        volume: 0.58,
        poolSize: 2,
      cooldownMs: 400
    },
    enemy_destroy: {
      src: "./assets/sfx/kenney_sci-fi-sounds/Audio/explosionCrunch_003.ogg",
      volume: 0.28,
      poolSize: 4,
      cooldownMs: 55
    },
    debris_glass: {
      src: "./assets/sfx/kenney_impact-sounds/Audio/impactGlass_heavy_003.ogg",
      volume: 0.18,
      poolSize: 3,
      cooldownMs: 120
    },
    armor_hit: {
      src: "./assets/sfx/kenney_impact-sounds/Audio/impactPlate_heavy_001.ogg",
      volume: 0.18,
      poolSize: 3,
      cooldownMs: 100
    }
  };

  const pools = new Map();
  const lastPlayAt = new Map();
  let unlocked = false;

  function ensurePool(id) {
    if (pools.has(id)) return pools.get(id);
    const def = SOUND_DEFS[id];
    if (!def) return null;
    const pool = [];
    for (let i = 0; i < (def.poolSize || 1); i++) {
      const audio = new Audio(def.src);
      audio.preload = "auto";
      audio.volume = def.volume != null ? def.volume : 1;
      pool.push(audio);
    }
    pools.set(id, pool);
    return pool;
  }

  function prime() {
    unlocked = true;
    for (const id of Object.keys(SOUND_DEFS)) ensurePool(id);
  }

  function play(id, options = {}) {
    const def = SOUND_DEFS[id];
    if (!def) return false;
    if (!unlocked) return false;

    const now = performance.now();
    const cooldownMs = options.cooldownMs != null ? options.cooldownMs : (def.cooldownMs || 0);
    const prev = lastPlayAt.get(id) || 0;
    if (now - prev < cooldownMs) return false;

    const pool = ensurePool(id);
    if (!pool || !pool.length) return false;
    const audio = pool.find((item) => item.paused || item.ended) || pool[0];
    if (!audio) return false;

    lastPlayAt.set(id, now);
    audio.pause();
    audio.currentTime = 0;
    audio.volume = options.volume != null ? options.volume : (def.volume != null ? def.volume : 1);
    audio.playbackRate = options.playbackRate != null ? options.playbackRate : 1;
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
    return true;
  }

  return {
    prime,
    play
  };
})();
