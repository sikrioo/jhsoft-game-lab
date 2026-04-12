# NEON SURVIVOR Refactor v2

## 변경 사항
1. 레벨업 창이 안 뜨던 문제 수정
- 기존 분리본은 적 처치 후 점수만 오르고, 실제 경험치/레벨업 시스템이 연결되지 않아 스킬 선택 창이 열리지 않았습니다.
- 이번 버전은 적 처치 시 XP를 획득하고, XP가 기준치를 넘으면 즉시 Level Up 카드가 열리도록 수정했습니다.

2. 경험치 HUD 추가
- 상단 HUD에 `Lv`, `XP` 표시를 추가했습니다.

3. 2차 구조 개선
- `core / systems / entities` 구조로 분리했습니다.

## 구조
- `js/core`
  - config.js
  - utils.js
  - state.js
  - boot.js
- `js/systems`
  - ui.js
  - skill.js
  - wave.js
  - enemy.js
  - combat.js
- `js/entities`
  - player.js

## 실행
- `index.html`을 브라우저에서 열면 됩니다.
- CDN으로 PixiJS를 불러오므로 인터넷 연결이 필요합니다.
