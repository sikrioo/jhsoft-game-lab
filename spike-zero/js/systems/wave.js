window.WaveSystem = (() => {
  function startNextWave(){
    const P = GameState.progression;
    const bossWave = window.BossSystem && BossSystem.isBossWave(P.wave);
    P.waveTarget = bossWave ? 0 : 10 + Math.floor(P.wave * 3.1);
    P.waveAlive = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
    if (bossWave) BossSystem.spawnWaveBoss(P.wave);
    UI.hudUpdate();
  }

  function completeCurrentWave(){
    const P = GameState.progression;
    P.wave += 1;
    startNextWave();
  }

  return {
    startNextWave,
    completeCurrentWave
  };
})();
