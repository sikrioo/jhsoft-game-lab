window.WaveSystem = (() => {
  const DEFAULT_STAGE_DURATION = 180 * 60;

  function startStage(stage = 1){
    const P = GameState.progression;
    P.stage = Math.max(1, stage);
    P.stageDuration = DEFAULT_STAGE_DURATION;
    P.stageTime = P.stageDuration;
    P.stageState = "combat";
    P.wave = 1;
    startNextWave();
  }

  function triggerStageBoss(){
    const P = GameState.progression;
    if (P.stageState === "boss") return;
    P.stageState = "boss";
    P.waveAlive = 0;
    P.waveTarget = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    if (window.BossSystem) BossSystem.spawnStageBoss(P.stage);
    UI.hudUpdate();
  }

  function completeStage(){
    startStage(GameState.progression.stage + 1);
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
