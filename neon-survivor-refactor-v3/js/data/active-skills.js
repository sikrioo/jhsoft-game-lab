window.ACTIVE_SKILL_DEFINITIONS = [
  {
    id: "decoy_drone",
    name: "Decoy Drone",
    desc: "Deploy a decoy that pulls enemy aggro for a short time.",
    type: "support",
    mpCost: 30,
    cooldown: 240,
    duration: 210,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      hp: 3
    }
  },
  {
    id: "boost",
    name: "Boost",
    desc: "Burst toward your aim direction with a short defensive window.",
    type: "mobility",
    mpCost: 18,
    cooldown: 72,
    duration: 12,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      speed: 20,
      invulnerability: 16
    }
  },
  {
    id: "afterburner",
    name: "Afterburner",
    desc: "Temporarily enhance movement, fire rate, and bullet speed.",
    type: "support",
    mpCost: 25,
    cooldown: 300,
    duration: 120,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      speedMultiplier: 1.42,
      fireRateMultiplier: 0.72,
      bulletSpeedMultiplier: 1.2
    }
  }
];
