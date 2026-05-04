# WARRIOR.IO v0.6

## 실행
모듈 JS 구조라서 HTML 더블클릭이 아니라 로컬 서버로 실행하세요.

```bat
run_local_server.bat
```

또는:

```bash
python -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속.

## PC 조작
- WASD / 방향키: 이동
- 마우스: 바라보는 방향
- Shift: 달리기
- Space: 즉시 정지
- Z: 공격
- X: 가드

## 모바일 조작
- 왼쪽 가상 조이스틱: 이동
- 조이스틱을 크게 밀거나 RUN 버튼: 달리기
- ATK 버튼: 공격
- GUARD 버튼: 가드
- 손을 떼면 즉시 정지

## 구조
```text
index.html
css/styles.css
js/config/constants.js
js/core/main.js
js/core/game.js
js/scenes/BattleScene.js
js/entities/PlayerController.js
js/entities/BotFactory.js
js/systems/InputSystem.js
js/systems/TextureSystem.js
js/systems/MapBuilder.js
js/systems/SlashSystem.js
js/systems/DamageSystem.js
js/systems/BotSystem.js
js/ui/Hud.js
assets/sprites/*.png
```

## 변경 요약
- PC: 마우스는 이동이 아니라 방향 전용으로 변경
- PC: 이동은 WASD/방향키, 멈춤은 키에서 손 떼기 또는 Space
- 모바일: 가상 조이스틱 + 공격/가드/달리기 버튼 추가
- 사망 중 추가 피격/히트 연출 방지 유지
- 적 공격 모션 잠금/해제 로직 유지
