window.UPGRADE_DEFINITIONS = [
  {
    id:"firerate",
    name:"Fire Rate",
    desc:"Fire interval -15%",
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
    name:"Damage Up",
    desc:"Bullet damage +1",
    apply:()=>{
      GameState.stats.bulletDamage += 1;
    }
  },
  {
    id:"defense",
    name:"Defense Up",
    desc:"Incoming hit damage -2",
    apply:()=>{
      GameState.stats.defense += 2;
    }
  },
  {
    id:"speed",
    name:"Thruster Tune",
    desc:"Move speed +12%",
    apply:()=>{
      GameState.stats.speed *= 1.12;
    }
  },
  {
    id:"dash",
    name:"Dash Cooling",
    desc:"Dash cooldown -20%",
    apply:()=>{
      const S = GameState;
      S.stats.dashCdMax = Math.max(25, Math.floor(S.stats.dashCdMax * 0.80));
    }
  },
  {
    id:"pierce",
    name:"Pierce",
    desc:"Bullet pierce +1",
    apply:()=>{
      GameState.stats.bulletPierce += 1;
    }
  },
  {
    id:"shield",
    name:"Shield Matrix",
    desc:"Shield max +35, shield regen +4/s",
    apply:()=>{
      const S = GameState;
      S.stats.shieldMax += 35;
      S.stats.shield = S.stats.shieldMax;
      S.stats.shieldRegen += 4;
      S.stats.shieldRegenDelay = 0;
    }
  },
  {
    id:"homingmissile",
    name:"Homing Missile",
    desc:"Launches tracking missiles automatically",
    apply:()=>{
      const S = GameState;
      S.stats.homingMissileLevel += 1;
      S.stats.homingMissileDamage += 1;
      S.stats.homingMissileCdMax = Math.max(28, Math.floor(S.stats.homingMissileCdMax * 0.90));
    }
  },
  {
    id:"multishot",
    name:"Multi Shot",
    desc:"Bullets fired per shot +1",
    apply:()=>{
      GameState.stats.bulletCount += 1;
    }
  },
  {
    id:"hp",
    name:"Max HP",
    desc:"Max HP +25",
    apply:()=>{
      const S = GameState;
      S.stats.maxHp += 25;
      S.stats.hp += 25;
    }
  },
  {
    id:"regen",
    name:"Regen",
    desc:"HP regen +0.6/s",
    apply:()=>{
      GameState.stats.regen += 0.6;
    }
  },
  {
    id:"bulletspeed",
    name:"Velocity",
    desc:"Bullet speed +15%",
    apply:()=>{
      GameState.stats.bulletSpeed *= 1.15;
    }
  }
];
