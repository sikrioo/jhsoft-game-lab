'use strict';

window.GAME_SETTINGS = {
  // 행성 중력은 현재 게임 컨셉과 조작감을 해치므로 기본 비활성화.
  // 나중에 테스트하고 싶으면 true로 바꾸면 된다.
  PLANET_GRAVITY_ENABLED: false,
  PLANET_COLLISION_ENABLED: true,

  // 보급은 행성이 아니라 정거장이 담당한다.
  PLANET_SUPPLY_ENABLED: false,
  STATION_SUPPLY_ENABLED: true,

  // 향후 난이도 조절용
  DEBUG_FAST_TRAVEL_ENABLED: true,
};

window.PLANET_SETTINGS = {
  gravityEnabled: false,
  collisionEnabled: true,
  radiusScale: 1,
  distanceScale: 8,
  enabledBodyIds: ['sun'],
};
