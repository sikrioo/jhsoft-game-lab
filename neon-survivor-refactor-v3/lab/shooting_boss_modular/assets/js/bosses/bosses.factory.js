(function() {
  const { BossRegistry } = window.ShootingBossRegistry;
  const {
    PatternBossRuntime,
    SummonerBossRuntime,
    KnightBossRuntime,
    SplitBossRuntime,
  } = window.ShootingBossRuntime;

  const BossRuntimeClasses = {
    pattern: PatternBossRuntime,
    summoner: SummonerBossRuntime,
    knight: KnightBossRuntime,
    split: SplitBossRuntime
  };

  function createBoss(type, player, startPhase) {
    const definition = BossRegistry[type];
    const runtimeKey = definition.runtimeClass || "pattern";
    const RuntimeClass = BossRuntimeClasses[runtimeKey] || PatternBossRuntime;
    return new RuntimeClass(type, player, startPhase);
  }

  window.ShootingBosses = { BossRegistry, BossRuntimeClasses, createBoss };
})();
