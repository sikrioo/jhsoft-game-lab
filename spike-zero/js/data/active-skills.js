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
    desc: "Directional burst based on movement input, or aim direction when idle.",
    type: "mobility",
    mpCost: 18,
    cooldown: 72,
    duration: 12,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      forward: { speed: 18, drag: 0.93, mitigationMul: 0.9 },
      side: { speed: 16, drag: 0.91, mitigationMul: 0.88 },
      back: { speed: 21, drag: 0.84, mitigationMul: 0.82 }
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
  },
  {
    id: "nova_pulse",
    name: "Nova Pulse",
    desc: "Emit a close-range shockwave that damages nearby enemies and wipes hostile shots.",
    type: "offense",
    mpCost: 28,
    cooldown: 210,
    duration: 1,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      radius: 150,
      damage: 8,
      bossDamage: 5,
      bulletClearRadius: 190,
      knockback: 26
    }
  },
  {
    id: "stealth_field",
    name: "Stealth Field",
    desc: "Vanish for a short time. Normal enemies lose your position until you attack.",
    type: "utility",
    mpCost: 24,
    cooldown: 260,
    duration: 180,
    manualCast: true,
    autoCast: false,
    slotType: "active",
    effectData: {
      alpha: 0.42
    }
  }
];
