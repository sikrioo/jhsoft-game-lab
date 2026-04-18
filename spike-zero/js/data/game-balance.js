window.GAME_BALANCE = {
  PLAYER: {
    FIRE_RATE_BASE: 25,
    FIRE_RATE_MIN: 3,
    MOVE_SPEED: 3.68,
    DASH_SPEED: 14,
    DASH_CD_MAX: 70,
    BULLET_SPEED: 9.6,
    BULLET_DAMAGE: 1,
    BULLET_COUNT: 1,
    DEFENSE: 0,
    MP_MAX: 100,
    MP_REGEN: 10,
    SHIELD_REGEN_DELAY_MAX: 180,
    HOMING_MISSILE_DAMAGE: 2,
    HOMING_MISSILE_CD_MAX: 140
  },

  XP: {
    BASE_TO_NEXT: 16,
    GROWTH: 1.48
  },

  TEST: {
    STARTING_UPGRADES: [
      "shield",
      "homingmissile",
      "multishot"
    ],
    STARTING_ACTIVE_SKILL_LEVELS: {
      boost: 3
    },
    STARTING_WEAPON: "machinegun",
    STARTING_ACTIVE_SKILLS: [
      "decoy_drone",
      "boost",
      "afterburner",
      "nova_pulse",
      "stealth_field"
    ]
  }
};
