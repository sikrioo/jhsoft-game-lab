window.UPGRADE_DEFINITIONS = [
  {
    id:"active_boost_unlock",
    upgradeType:"active",
    name:"Unlock Boost",
    desc:"Gain the Boost active skill. It auto-fills the first empty slot in Q > E > R order.",
    requires:(S)=>!S.activeSkillState.ownedSkillIds.includes("boost"),
    apply:()=>{
      ActiveSkillSystem.unlockSkill("boost");
    }
  },
  {
    id:"active_afterburner_unlock",
    upgradeType:"active",
    name:"Unlock Afterburner",
    desc:"Gain Afterburner. If a slot is empty, it is mapped automatically.",
    requires:(S)=>!S.activeSkillState.ownedSkillIds.includes("afterburner"),
    apply:()=>{
      ActiveSkillSystem.unlockSkill("afterburner");
    }
  },
  {
    id:"active_decoy_unlock",
    upgradeType:"active",
    name:"Unlock Decoy Drone",
    desc:"Gain Decoy Drone. Extra active skills stay owned even when every slot is full.",
    requires:(S)=>!S.activeSkillState.ownedSkillIds.includes("decoy_drone"),
    apply:()=>{
      ActiveSkillSystem.unlockSkill("decoy_drone");
    }
  },
  {
    id:"active_nova_unlock",
    upgradeType:"active",
    name:"Unlock Nova Pulse",
    desc:"Gain Nova Pulse, a close-range emergency shockwave for clearing pressure.",
    requires:(S)=>!S.activeSkillState.ownedSkillIds.includes("nova_pulse"),
    apply:()=>{
      ActiveSkillSystem.unlockSkill("nova_pulse");
    }
  },
  {
    id:"active_stealth_unlock",
    upgradeType:"active",
    name:"Unlock Stealth Field",
    desc:"Gain Stealth Field for short repositioning. It ends immediately when you attack.",
    requires:(S)=>!S.activeSkillState.ownedSkillIds.includes("stealth_field"),
    apply:()=>{
      ActiveSkillSystem.unlockSkill("stealth_field");
    }
  },
  {
    id:"weapon_machinegun",
    upgradeType:"weapon",
    name:"Equip Machinegun",
    desc:"Switch weapon type to Machinegun. Shared weapon stats stay the same.",
    requires:(S)=>S.weaponState.current !== "machinegun",
    apply:()=>{
      CombatSystem.setWeaponType("machinegun");
    }
  },
  {
    id:"weapon_laser",
    upgradeType:"weapon",
    name:"Equip Laser",
    desc:"Switch weapon type to Laser. Shared weapon stats stay the same.",
    requires:(S)=>S.weaponState.current !== "laser",
    apply:()=>{
      CombatSystem.setWeaponType("laser");
    }
  },
  {
    id:"weapon_shotgun",
    upgradeType:"weapon",
    name:"Equip Shotgun",
    desc:"Switch weapon type to Shotgun. Shared weapon stats stay the same.",
    requires:(S)=>S.weaponState.current !== "shotgun",
    apply:()=>{
      CombatSystem.setWeaponType("shotgun");
    }
  },
  {
    id:"firerate",
    upgradeType:"weapon",
    name:"Fire Rate",
    desc:"Fire interval -8%",
    apply:()=>{
      const S = GameState;
      S.stats.fireRate = Math.max(
        GAME_BALANCE.PLAYER.FIRE_RATE_MIN,
        Math.floor(S.stats.fireRate * 0.92)
      );
    }
  },
  {
    id:"damage",
    upgradeType:"weapon",
    name:"Damage Up",
    desc:"Bullet damage +1",
    apply:()=>{
      GameState.stats.bulletDamage += 1;
    }
  },
  {
    id:"defense",
    upgradeType:"passive",
    name:"Defense Up",
    desc:"Incoming hit damage -2",
    apply:()=>{
      GameState.stats.defense += 2;
    }
  },
  {
    id:"speed",
    upgradeType:"passive",
    name:"Thruster Tune",
    desc:"Move speed +8%",
    apply:()=>{
      GameState.stats.speed *= 1.08;
    }
  },
  {
    id:"dash",
    upgradeType:"passive",
    name:"Thruster Cooling",
    desc:"Shift dash cooldown -10%",
    apply:()=>{
      const S = GameState;
      S.stats.dashCdMax = Math.max(25, Math.floor(S.stats.dashCdMax * 0.90));
    }
  },
  {
    id:"pierce",
    upgradeType:"weapon",
    name:"Pierce",
    desc:"Bullet pierce +1",
    apply:()=>{
      GameState.stats.bulletPierce += 1;
    }
  },
  {
    id:"shield",
    upgradeType:"passive",
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
    upgradeType:"weapon",
    name:"Homing Missile",
    desc:"Unlocks tracking missiles. Further picks improve output.",
    apply:()=>{
      const S = GameState;
      const firstPickup = S.stats.homingMissileLevel <= 0;
      S.stats.homingMissileLevel += 1;
      if (firstPickup) {
        S.stats.homingMissileDamage = Math.max(2, S.stats.homingMissileDamage);
        S.stats.homingMissileCdMax = Math.max(120, Math.floor(S.stats.homingMissileCdMax * 0.96));
      } else {
        S.stats.homingMissileDamage += 0.5;
        S.stats.homingMissileCdMax = Math.max(84, Math.floor(S.stats.homingMissileCdMax * 0.94));
      }
    }
  },
  {
    id:"multishot",
    upgradeType:"weapon",
    name:"Multi Shot",
    desc:"Bullets fired per shot +1",
    apply:()=>{
      GameState.stats.bulletCount += 1;
    }
  },
  {
    id:"hp",
    upgradeType:"passive",
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
    upgradeType:"passive",
    name:"Regen",
    desc:"HP regen +0.6/s",
    apply:()=>{
      GameState.stats.regen += 0.6;
    }
  },
  {
    id:"bulletspeed",
    upgradeType:"weapon",
    name:"Velocity",
    desc:"Bullet speed +8%",
    apply:()=>{
      GameState.stats.bulletSpeed *= 1.08;
    }
  }
];
