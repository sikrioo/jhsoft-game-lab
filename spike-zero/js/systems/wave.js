window.WaveSystem = (() => {
  function getDefaultStageDurationFrames() {
    const sec = GameState.stats.practice && GameState.stats.practiceMode === "stage"
      ? Math.max(10, Math.floor(GameState.practiceStageDurationSec || 180))
      : 180;
    return sec * 60;
  }

  function resumeCombat() {
    GameState.progression.waveState = "running";
    UI.hudUpdate();
  }

  function startStage(stage = 1, options = {}){
    const P = GameState.progression;
    P.stage = Math.max(1, stage);
    P.stageDuration = options.stageDurationFrames || getDefaultStageDurationFrames();
    P.stageTime = P.stageDuration;
    P.stageState = "combat";
    P.bossFinishTimer = 0;
    P.wave = 1;
    const shouldSkipDialogue = options.skipDialogue || (GameState.stats.practice && GameState.stats.practiceMode === "boss");
    if (shouldSkipDialogue || !window.DialogueSystem) {
      startNextWave();
      resumeCombat();
      return;
    }
    DialogueSystem.playStageIntro(P.stage, () => {
      startNextWave();
      resumeCombat();
    });
  }

  function triggerStageBoss(){
    const P = GameState.progression;
    if (P.stageState === "boss") return;
    P.stageState = "boss";
    P.bossFinishTimer = 0;
    P.waveState = "dialogue";
    P.waveAlive = 0;
    P.waveTarget = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    const spawnBoss = () => {
      if (window.BossSystem) BossSystem.spawnStageBoss(P.stage);
      resumeCombat();
      UI.hudUpdate();
    };
    if (!window.BossSystem) {
      spawnBoss();
      return;
    }
    const continueToDialogue = () => {
      if (!window.DialogueSystem) {
        spawnBoss();
        return;
      }
      DialogueSystem.playBossWarning(P.stage, BossSystem.getStageBossId(P.stage), spawnBoss);
    };
    if (window.SoundSystem) SoundSystem.play("boss_alarm");
    UI.playBossWarning().then(continueToDialogue);
  }

  function completeStage(){
      const currentStage = GameState.progression.stage;
      const nextStage = currentStage + 1;
      GameState.progression.waveState = "dialogue";
      setTimeout(() => {
        const P = GameState.progression;
        const bossGone = !window.BossSystem || !BossSystem.hasActiveBoss();
        if (P.stage === currentStage && P.waveState === "dialogue" && bossGone) {
          P.stageState = "clear";
          if (window.BgmSystem) BgmSystem.stopAll();
        }
      }, 550);
      const continueToClear = () => UI.showStageClear(currentStage).then(() => startStage(nextStage));
      if (!window.DialogueSystem || !window.BossSystem) {
        continueToClear();
        return;
      }
    DialogueSystem.playBossClear(currentStage, BossSystem.getStageBossId(currentStage), continueToClear);
  }

  function startNextWave(){
    const P = GameState.progression;
    P.stageState = P.stageState === "boss" ? "boss" : "combat";
    P.waveTarget = 10 + Math.floor(P.wave * 3.1);
    P.waveAlive = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    UI.hudUpdate();
  }

  function completeCurrentWave(){
    const P = GameState.progression;
    if (P.stageState !== "combat") return;
    if (!GameState.stats.practice && P.stageTime <= 0) {
      triggerStageBoss();
      return;
    }
    P.wave += 1;
    startNextWave();
  }

  return {
    startStage,
    triggerStageBoss,
    completeStage,
    startNextWave,
    completeCurrentWave
  };
})();
