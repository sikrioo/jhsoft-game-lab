window.SkillSystem = (() => {
  const UPGRADE_POOL = [
    {
      id:"firerate",
      name:"연사 강화",
      desc:"발사 간격 -15%",
      apply:()=>{
        const S = GameState;
        S.stats.fireRate = Math.max(
          CONFIG.PLAYER.FIRE_RATE_MIN,
          Math.floor(S.stats.fireRate * 0.85)
        );
      }
    },
    {
      id:"damage",
      name:"관통력 강화",
      desc:"한 발당 타수 +1",
      apply:()=>{
        GameState.stats.bulletDamage += 1;
      }
    },
    {
      id:"speed",
      name:"기동력",
      desc:"이동 속도 +12%",
      apply:()=>{
        GameState.stats.speed *= 1.12;
      }
    },
    {
      id:"dash",
      name:"대시 쿨감",
      desc:"대시 쿨타임 -20%",
      apply:()=>{
        const S = GameState;
        S.stats.dashCdMax = Math.max(25, Math.floor(S.stats.dashCdMax * 0.80));
      }
    },
    {
      id:"pierce",
      name:"관통",
      desc:"탄환 관통 +1",
      apply:()=>{
        GameState.stats.bulletPierce += 1;
      }
    },
    {
      id:"hp",
      name:"최대 HP",
      desc:"최대 HP +25",
      apply:()=>{
        const S = GameState;
        S.stats.maxHp += 25;
        S.stats.hp += 25;
      }
    },
    {
      id:"regen",
      name:"재생",
      desc:"초당 HP +0.6",
      apply:()=>{
        GameState.stats.regen += 0.6;
      }
    },
    {
      id:"bulletspeed",
      name:"탄속",
      desc:"탄환 속도 +15%",
      apply:()=>{
        GameState.stats.bulletSpeed *= 1.15;
      }
    }
  ];

  function pickChoices(n=3){
    const pool = [...UPGRADE_POOL];
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
      P.xpToNext = Math.ceil(P.xpToNext * CONFIG.XP.GROWTH);
    }

    UI.hudUpdate();
    openLevelUpIfNeeded();
  }

  return {
    gainXp,
    openLevelUpIfNeeded
  };
})();
