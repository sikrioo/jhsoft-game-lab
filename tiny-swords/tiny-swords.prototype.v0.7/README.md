# WARRIOR.IO v0.7

## 실행 방법
모듈 JS 구조라서 HTML 더블클릭이 아니라 로컬 서버로 실행하세요.

Windows:
```bat
run_local_server.bat
```

브라우저에서:
```text
http://localhost:8000
```

## 조작

### PC
- 이동: WASD / 방향키
- 방향: 마우스 커서 방향
- 공격: Z 또는 마우스 클릭
- 달리기: Shift
- 가드: X
- 정지: Space 또는 이동키에서 손 떼기

### 모바일
- 왼쪽 가상 조이스틱: 이동
- ATK: 공격
- GUARD: 가드
- RUN: 달리기

## 캐릭터
- Warrior: 근접 공격 + 슬래시
- Archer: 원거리 공격 + Arrow 투사체

## 구조
```text
index.html
css/styles.css
js/config/constants.js
js/core/game.js
js/core/main.js
js/scenes/BattleScene.js
js/entities/PlayerController.js
js/entities/BotFactory.js
js/systems/*
js/ui/Hud.js
assets/sprites/*
```
