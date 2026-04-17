window.SkillSystem = (() => {
  function getUpgradeById(id){
    return UPGRADE_DEFINITIONS.find(upgrade => upgrade.id === id) || null;
  }

  function applyUpgradeById(id){
    const upgrade = getUpgradeById(id);
    if (!upgrade) return false;
    upgrade.apply();
    return true;
  }

  function applyStartingLoadout(testMode=false){
    const starting = testMode ? ((GAME_BALANCE.TEST && GAME_BALANCE.TEST.STARTING_UPGRADES) || []) : [];
    for (const id of starting) applyUpgradeById(id);
  }

  function pickChoices(n=3){
    const pool = [...UPGRADE_DEFINITIONS];
    const picks = [];
    while (picks.length < n && pool.length){
      const idx = Helpers.randi(0, pool.length - 1);
      picks.push(pool.splice(idx, 1)[0]);
    }
    return picks;
  }

  function openLevelUpIfNeeded(){
    const S = GameState;
    if (S.progression.pendingLevelUps <= 0) return false;
    if (S.progression.waveState !== "running") return false;

    S.progression.waveState = "levelup";
    const choices = pickChoices(3);
    UI.renderUpgradeChoices(choices, (choice) => {
      choice.apply();
      S.progression.pendingLevelUps -= 1;
      UI.hudUpdate();

      if (S.progression.pendingLevelUps > 0) {
        openLevelUpIfNeeded();
      } else {
        UI.showCard(null);
        S.progression.waveState = "running";
      }
    });
    UI.showCard("upgrade");
    return true;
  }

  function gainXp(amount){
    const S = GameState;
    const P = S.progression;

    P.xp += amount;
    while (P.xp >= P.xpToNext){
      P.xp -= P.xpToNext;
      P.level += 1;
      P.pendingLevelUps += 1;
      P.xpToNext = Math.ceil(P.xpToNext * GAME_BALANCE.XP.GROWTH);
    }

    UI.hudUpdate();
    openLevelUpIfNeeded();
  }

  return {
    gainXp,
    openLevelUpIfNeeded,
    applyUpgradeById,
    applyStartingLoadout
  };
})();
