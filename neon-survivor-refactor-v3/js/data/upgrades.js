window.UPGRADE_DEFINITIONS = [
  {
    id:"firerate",
    name:"연사 강화",
    desc:"발사 간격 -15%",
    apply:()=>{
      const S = GameState;
      S.stats.fireRate = Math.max(
        GAME_BALANCE.PLAYER.FIRE_RATE_MIN,
        Math.floor(S.stats.fireRate * 0.85)
      );
    }
  },
  {
    id:"damage",
    name:"공격력 강화",
    desc:"한 발당 타수 +1",
    apply:()=>{
      GameState.stats.bulletDamage += 1;
    }
  },
  {
    id:"defense",
    name:"방어력 강화",
    desc:"받는 피해 -2",
    apply:()=>{
      GameState.stats.defense += 2;
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
