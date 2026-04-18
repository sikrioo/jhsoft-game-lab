window.DialogueSystem = (() => {
  const TYPE_DELAY_MS = 24;
  const LINE_HOLD_MS = 3400;
  const END_HOLD_MS = 2600;

  let token = 0;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function typeLine(line, currentToken) {
    const entry = UI.createDialogueCard(line);
    if (!entry) return false;
    const isController = line && line.speaker === "controller";
    if (window.SoundSystem) {
      if (isController) {
        SoundSystem.play("radio_in", { playbackRate: 0.98 + Math.random() * 0.04 });
        SoundSystem.play("comms", { playbackRate: 0.96, volume: 0.16, cooldownMs: 0 });
      } else {
        SoundSystem.play("comms", {
          playbackRate: 0.94,
          volume: 0.12
        });
      }
    }
    UI.showDialogueLine(entry, "");
    for (let i = 1; i <= line.text.length; i++) {
      if (currentToken !== token) return false;
      UI.showDialogueLine(entry, line.text.slice(0, i));
      await sleep(TYPE_DELAY_MS);
    }
    UI.commitDialogueLine(entry);
    if (isController && window.SoundSystem) {
      SoundSystem.play("radio_out", { playbackRate: 0.96 + Math.random() * 0.04 });
    }
    return currentToken === token;
  }

  async function playLines(lines = [], onComplete = null) {
    const S = GameState;
    const currentToken = ++token;
    const queue = lines.filter((line) => line && line.text).slice(0, 4);
    if (!queue.length) {
      if (typeof onComplete === "function") onComplete();
      return false;
    }

    S.progression.waveState = "dialogue";
    UI.openDialogueOverlay();

    for (const line of queue) {
      const ok = await typeLine(line, currentToken);
      if (!ok) return false;
      await sleep(LINE_HOLD_MS);
      if (currentToken !== token) return false;
    }

    if (currentToken !== token) return false;
    await sleep(END_HOLD_MS);
    if (currentToken !== token) return false;
    UI.resetDialogueLog();
    if (typeof onComplete === "function") onComplete();
    return true;
  }

  function buildStageIntro(stage = 1) {
    return window.DIALOGUE_LIBRARY ? DIALOGUE_LIBRARY.stageStart(stage) : [];
  }

  function buildBossWarning(stage = 1, bossId = "basic") {
    return window.DIALOGUE_LIBRARY ? DIALOGUE_LIBRARY.bossWarning(stage, bossId) : [];
  }

  function buildBossClear(stage = 1, bossId = "basic") {
    return window.DIALOGUE_LIBRARY ? DIALOGUE_LIBRARY.bossClear(stage, bossId) : [];
  }

  function playStageIntro(stage = 1, onComplete = null) {
    return playLines(buildStageIntro(stage), onComplete);
  }

  function playBossWarning(stage = 1, bossId = "basic", onComplete = null) {
    return playLines(buildBossWarning(stage, bossId), onComplete);
  }

  function playBossClear(stage = 1, bossId = "basic", onComplete = null) {
    if (window.SoundSystem) SoundSystem.play("boss_clear");
    return playLines(buildBossClear(stage, bossId), onComplete);
  }

  function cancel() {
    token += 1;
    UI.resetDialogueLog();
  }

  return {
    cancel,
    playLines,
    playStageIntro,
    playBossWarning,
    playBossClear
  };
})();
