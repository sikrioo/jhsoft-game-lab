# LAST BREATH / ZERO-G SURVIVAL Refactor

단일 HTML 프로토타입을 폴더 구조 기반으로 1차 분리한 버전입니다.

## 실행
`index.html`을 브라우저에서 열면 됩니다.

## 주요 변경
- CSS를 `css/main.css`로 분리
- 게임 스크립트를 `js/core/game.js`로 분리
- 전역 설정을 `js/data/game-settings.js`로 분리
- 정거장 데이터를 `js/data/station-data.js`로 분리
- 행성 중력 기본 비활성화
- 행성 보급 제거, 정거장 보급 중심으로 변경

## 중력 ON/OFF
`js/data/game-settings.js`

```js
PLANET_GRAVITY_ENABLED: false
```

Planet gravity and collision can now be controlled separately:

```js
window.PLANET_SETTINGS = {
  gravityEnabled: false,
  collisionEnabled: true,
  radiusScale: 1,
  distanceScale: 8,
  enabledBodyIds: ['sun'],
};
```

## 정거장 추가/수정
`js/data/station-data.js`에 오브젝트를 추가하면 됩니다.
