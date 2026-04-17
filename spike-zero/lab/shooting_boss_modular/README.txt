# Shooting Boss Modular Build

구성:
- `index.html`: 진입점
- `assets/css/styles.css`: 스타일
- `assets/js/engine.js`: 공통 유틸, 이펙트, 플레이어, 패턴 라이브러리, 튜닝 데이터
- `assets/js/bosses.js`: 보스 레지스트리와 런타임 클래스
- `assets/js/app.js`: UI, 입력, 게임 루프, 충돌 처리

추가된 내용:
- `shooting_boss_split_only`의 분열형 보스를 통합
- 보스 선택 목록에 `분열형 (GEMINI)` 추가
- 단축키 `5`로 분열형 바로 시작 가능
- 플레이어 탄 충돌이 분열형의 개별 코어 판정까지 인식하도록 보완


로컬에서 실행할 때는 file:// 대신 간단한 로컬 서버로 여는 것을 권장합니다.
예: VS Code Live Server, 또는 해당 폴더에서 python -m http.server 8000 실행 후 http://localhost:8000 접속

- v3 fix: app.js now calls boss.drawMinions() only when the method exists (split boss compatibility).
