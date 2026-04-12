window.WaveSystem = (() => {
  function startNextWave(){
    const P = GameState.progression;
    P.waveTarget = 6 + Math.floor(P.wave * 2.3);
    P.waveAlive = 0;
    P.spawnT = 0;
    P.spawnedCount = 0;
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
