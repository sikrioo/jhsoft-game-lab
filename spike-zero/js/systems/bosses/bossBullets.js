/**
 * BossBullets.js
 * 보스 탄환 생성 및 공통 탄막 패턴 모듈
 * 모든 보스 파일에서 공통으로 참조
 */
window.BossBullets = (() => {

  /** 기본 탄환 옵션 상수 */
  const DEFAULTS = {
    speed:  5.8,
    damage: 8,
    radius: 9,
    color:  0xffd166,
    life:   140,
    scaleX: 1.15,
    scaleY: 1.15
  };

  /**
   * 단일 보스 탄환 생성
   * @param {number} x
   * @param {number} y
   * @param {number} angle
   * @param {object} [options]
   * @returns {object} bullet
   */
  function make(x, y, angle, options = {}) {
    const opts = { ...DEFAULTS, ...options };
    const spr  = Effects.makeBulletSprite(x, y, angle, opts.color);
    spr.scale.set(opts.scaleX, opts.scaleY);
    GameState.fx.addChild(spr);
    return {
      spr,
      x,
      y,
      vx:    Math.cos(angle) * opts.speed,
      vy:    Math.sin(angle) * opts.speed,
      r:     opts.radius,
      dmg:   opts.damage,
      life:  opts.life,
      color: opts.color
    };
  }

  /**
   * 원형 방사 탄막
   * @param {number} x
   * @param {number} y
   * @param {number} count         - 탄환 수
   * @param {number} speed
   * @param {number} color
   * @param {number} damage
   * @param {number} [angleOffset=0]
   * @param {number} [radius=7]
   */
  function radialBurst(x, y, count, speed, color, damage, angleOffset = 0, radius = 7) {
    for (let i = 0; i < count; i++) {
      const angle = angleOffset + (Math.PI * 2 * i) / count;
      GameState.enemyBullets.push(make(x, y, angle, { color, speed, damage, radius }));
    }
  }

  /**
   * 안전 통로형 원형 탄막 (플레이어 방향 일부 제외)
   * @param {number} bossX
   * @param {number} bossY
   * @param {object} options
   * @param {boolean} options.randomize  - 레인 랜덤 오프셋 여부
   * @param {function} [options.onSchedule] - 딜레이 발사 콜백 등록 (scheduler.schedule 등)
   */
  function safeLaneBurst(bossX, bossY, options = {}) {
    const { randomize = false, onSchedule, laneAngle: explicitLaneAngle } = options;
    const player    = GameState.player;
    const baseLaneAngle = explicitLaneAngle != null
      ? explicitLaneAngle
      : Math.atan2(player.spr.y - bossY, player.spr.x - bossX);
    const laneAngle = baseLaneAngle + (randomize ? Helpers.rand(-0.45, 0.45) : 0);
    const laneWidth = randomize ? 0.4  : 0.62;
    const count     = randomize ? 40   : 34;
    const speed     = randomize ? 6.2  : 5.4;
    const color     = randomize ? 0xff6bb5 : 0x7df9ff;
    const damage    = randomize ? 9    : 8;

    Effects.emitLineTelegraph(
      bossX, bossY,
      bossX + Math.cos(laneAngle) * 220,
      bossY + Math.sin(laneAngle) * 220,
      color, 12, 7
    );

    const fire = () => {
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        let delta   = angle - laneAngle;
        while (delta >  Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        if (Math.abs(delta) < laneWidth * 0.5) continue;
        GameState.enemyBullets.push(make(bossX, bossY, angle, { color, speed, damage, radius: 6 }));
      }
    };

    if (typeof onSchedule === "function") {
      onSchedule(12, fire);
    } else {
      fire();
    }
  }

  /**
   * 플레이어 조준 산탄
   * @param {number} bossX
   * @param {number} bossY
   * @param {number} spread   - 좌우 탄 수 (총 spread*2+1 발)
   * @param {object} bulletOpts
   */
  function aimSpread(bossX, bossY, spread, bulletOpts = {}) {
    const player = GameState.player;
    const aim    = bulletOpts.aimAngle != null
      ? bulletOpts.aimAngle
      : Math.atan2(player.spr.y - bossY, player.spr.x - bossX);
    const options = { ...bulletOpts };
    delete options.aimAngle;
    for (let i = -spread; i <= spread; i++) {
      GameState.enemyBullets.push(make(bossX, bossY, aim + i * 0.14, options));
    }
  }

  return {
    DEFAULTS,
    make,
    radialBurst,
    safeLaneBurst,
    aimSpread
  };
})();
