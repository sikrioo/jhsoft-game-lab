window.CONFIG = {
  PLAYER: {
    FIRE_RATE_BASE: 18,
    FIRE_RATE_MIN: 3,
    MOVE_SPEED: 4.6,
    DASH_SPEED: 14,
    DASH_CD_MAX: 70,
    BULLET_SPEED: 12,
    BULLET_DAMAGE: 1
  },

  XP: {
    BASE_TO_NEXT: 10,
    GROWTH: 1.35
  },

  ENEMY_TIERS: {
    normal: {
      hitsMin: 1, hitsMax: 5,
      radius: 16,
      moveSpeedMin: 2.2, moveSpeedMax: 3.0,
      damage: 12,
      scoreBase: 120,
      xpBase: 3,
      lineColor: 0x32f6ff,
      fillColor: 0x32f6ff,
      glowColor: 0x32f6ff,
      glowDistance: 18,
      glowOuter: 2.2,
      glowInner: 0.1,
      numberFontSize: 13
    },
    elite: {
      hitsMin: 5, hitsMax: 10,
      radius: 22,
      moveSpeedMin: 1.8, moveSpeedMax: 2.4,
      damage: 18,
      scoreBase: 260,
      xpBase: 8,
      lineColor: 0x4da3ff,
      fillColor: 0x4da3ff,
      glowColor: 0x4da3ff,
      glowDistance: 24,
      glowOuter: 2.8,
      glowInner: 0.2,
      numberFontSize: 15
    },
    midboss: {
      hitsMin: 10, hitsMax: 20,
      radius: 30,
      moveSpeedMin: 1.25, moveSpeedMax: 1.7,
      damage: 26,
      scoreBase: 700,
      xpBase: 18,
      lineColor: 0xffa63d,
      fillColor: 0xffa63d,
      glowColor: 0xffa63d,
      glowDistance: 30,
      glowOuter: 3.2,
      glowInner: 0.25,
      numberFontSize: 18
    },
    boss: {
      hitsMin: 30, hitsMax: 42,
      radius: 42,
      moveSpeedMin: 0.85, moveSpeedMax: 1.15,
      damage: 40,
      scoreBase: 2200,
      xpBase: 35,
      lineColor: 0xff5f5f,
      fillColor: 0xff4d9d,
      glowColor: 0xff4d6d,
      glowDistance: 40,
      glowOuter: 4.0,
      glowInner: 0.35,
      numberFontSize: 24
    }
  }
};
