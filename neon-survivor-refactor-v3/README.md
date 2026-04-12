# NEON SURVIVOR Refactor v3

## 이번 변경
1. HUD 수치 확장
- ATK, DEF, Fire Rate, Pierce 표시 추가
- 기존 Lv / XP / HP / Score / Wave / Combo 유지

2. 우주 배경 강화
- 성운 느낌의 네뷸라
- 2개의 행성 오브젝트
- 별 배경 + 약한 그리드

3. 구조 추가 분리
- data
  - game-balance.js
  - enemy-tiers.js
  - upgrades.js
- render
  - background.js
  - effects.js
- systems
  - ui.js
  - skill.js
  - wave.js
  - enemy.js
  - combat.js
- entities
  - player.js
- core
  - utils.js
  - state.js
  - boot.js

## 메모
- DEF는 적 충돌 데미지 계산에 반영됩니다.
- ATK는 현재 탄환이 적 숫자를 얼마나 줄이는지 의미합니다.
- index.html을 브라우저에서 열면 실행됩니다.
- PixiJS CDN을 사용하므로 인터넷 연결이 필요합니다.
