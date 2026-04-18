window.PlayerFactory = (() => {

  // ── 공통 파츠 ────────────────────────────────────────────

  function makeShield() {
    const shield = new PIXI.Graphics();
    shield.lineStyle(2.5, 0x7fe7ff, 0.72);
    shield.drawCircle(0, 0, 22);
    shield.beginFill(0x7fe7ff, 0.06);
    shield.drawCircle(0, 0, 20);
    shield.endFill();
    shield.alpha = 0;
    return shield;
  }

  function makeCore(cy = 2, color = 0xff3edb) {
    const core = new PIXI.Graphics();
    core.beginFill(color, 1);
    core.drawCircle(0, cy, 3);
    core.endFill();
    core.filters = Effects.asFilters(
      Effects.makeGlowFilter({ color, distance: 20, outerStrength: 3.0, innerStrength: 0.7, quality: 0.3 })
    );
    return core;
  }

  function makeAccentRing(cy = 2, color = 0xa78bfa) {
    const ring = new PIXI.Graphics();
    ring.lineStyle(1, color, 0.45);
    ring.drawCircle(0, cy, 8);
    ring.filters = Effects.asFilters(
      Effects.makeGlowFilter({ color, distance: 9, outerStrength: 1.1, innerStrength: 0.1, quality: 0.2 })
    );
    return ring;
  }

  function makeContainerGlow(c, color, distance = 20, outer = 2.6) {
    c.filters = Effects.asFilters(
      Effects.makeGlowFilter({ color, distance, outerStrength: outer, innerStrength: 0.45, quality: 0.28 })
    );
  }

  // ══════════════════════════════════════════════════════════
  // STANDARD — 청록. 대칭 날개 + 테일핀. 균형형
  // 바운딩: x ±18, y -18~20
  // ══════════════════════════════════════════════════════════
  function buildStandard(c) {
    const C = 0x32f6ff;

    // 좌우 대칭 날개 (동일 좌표, x 부호만 반전)
    const wings = new PIXI.Graphics();
    // 왼쪽
    wings.beginFill(0x07091a, 1);
    wings.lineStyle(1.3, C, 0.58);
    wings.drawPolygon([ -3,-2, -18,12, -12,13, -6,6, -3,3 ]);
    wings.endFill();
    wings.lineStyle(0.85, C, 0.48);
    wings.moveTo(-3, -2);
    wings.lineTo(-18, 12);
    wings.lineStyle(0.6, C, 0.25);
    wings.moveTo(-5, 5);
    wings.lineTo(-14, 11);
    // 오른쪽
    wings.beginFill(0x07091a, 1);
    wings.lineStyle(1.3, C, 0.58);
    wings.drawPolygon([ 3,-2, 18,12, 12,13, 6,6, 3,3 ]);
    wings.endFill();
    wings.lineStyle(0.85, C, 0.48);
    wings.moveTo(3, -2);
    wings.lineTo(18, 12);
    wings.lineStyle(0.6, C, 0.25);
    wings.moveTo(5, 5);
    wings.lineTo(14, 11);

    // 동체
    const body = new PIXI.Graphics();
    body.beginFill(0x080e22, 1);
    body.lineStyle(1.8, C, 0.92);
    body.drawPolygon([ 0,-18, 4,-6, 5,8, 2,16, -2,16, -5,8, -4,-6 ]);
    body.endFill();
    // 캐노피
    body.beginFill(0x141e38, 1);
    body.lineStyle(0.8, 0x7fe7ff, 0.55);
    body.drawPolygon([ 0,-14, 3,-4, 0,2, -3,-4 ]);
    body.endFill();
    // 세로선
    body.lineStyle(0.7, C, 0.22);
    body.moveTo(0, 2);
    body.lineTo(0, 12);

    // 테일핀
    const tail = new PIXI.Graphics();
    tail.beginFill(0x060918, 1);
    tail.lineStyle(1, 0x7fe7ff, 0.5);
    tail.drawPolygon([ -2,13, -5,20, 0,16, 5,20, 2,13 ]);
    tail.endFill();

    // 엔진 노즐
    const nozzle = new PIXI.Graphics();
    nozzle.beginFill(0x0a0c1e, 1);
    nozzle.lineStyle(0.9, C, 0.55);
    nozzle.drawEllipse(0, 17, 3.5, 2);
    nozzle.endFill();
    const nozzleCore = new PIXI.Graphics();
    nozzleCore.beginFill(0xff3edb, 0.9);
    nozzleCore.drawEllipse(0, 17, 2, 1.2);
    nozzleCore.endFill();
    nozzleCore.filters = Effects.asFilters(
      Effects.makeGlowFilter({ color: 0xff3edb, distance: 9, outerStrength: 1.8, innerStrength: 0.3, quality: 0.2 })
    );

    const shield     = makeShield();
    const accentRing = makeAccentRing(0, 0x38bdf8);
    const core       = makeCore(0, C);

    c.addChild(shield, wings, tail, body, nozzle, nozzleCore, accentRing, core);
    makeContainerGlow(c, C, 20, 2.6);

    return { shield, collisionR: 14 };
  }

  // ══════════════════════════════════════════════════════════
  // POWER — 주황-빨강. 넓은 델타 + 트리플 엔진. 중후한 볼륨
  // 바운딩: x ±20, y -18~22
  // ══════════════════════════════════════════════════════════
  function buildPower(c) {
    const C  = 0xff6a1a;
    const C2 = 0xffaa60;

    // 좌우 날개 — 넓고 두꺼운 델타
    const wings = new PIXI.Graphics();
    // 왼쪽
    wings.beginFill(0x120808, 1);
    wings.lineStyle(1.4, C, 0.65);
    wings.drawPolygon([ -4,2, -20,18, -14,19, -8,12, -4,6 ]);
    wings.endFill();
    wings.lineStyle(0.9, C2, 0.52);
    wings.moveTo(-4, 2);
    wings.lineTo(-20, 18);
    wings.lineStyle(0.6, C, 0.28);
    wings.moveTo(-6, 9);
    wings.lineTo(-16, 17);
    // 오른쪽
    wings.beginFill(0x120808, 1);
    wings.lineStyle(1.4, C, 0.65);
    wings.drawPolygon([ 4,2, 20,18, 14,19, 8,12, 4,6 ]);
    wings.endFill();
    wings.lineStyle(0.9, C2, 0.52);
    wings.moveTo(4, 2);
    wings.lineTo(20, 18);
    wings.lineStyle(0.6, C, 0.28);
    wings.moveTo(6, 9);
    wings.lineTo(16, 17);

    // 동체 — 넓고 묵직하게
    const body = new PIXI.Graphics();
    body.beginFill(0x0e0808, 1);
    body.lineStyle(2, C, 0.92);
    body.drawPolygon([ 0,-18, 6,-4, 7,10, 4,18, -4,18, -7,10, -6,-4 ]);
    body.endFill();
    // 캐노피
    body.beginFill(0x1e1010, 1);
    body.lineStyle(0.9, C2, 0.58);
    body.drawPolygon([ 0,-14, 4,-2, 0,4, -4,-2 ]);
    body.endFill();
    // 세로선
    body.lineStyle(0.7, C, 0.28);
    body.moveTo(0, 4);
    body.lineTo(0, 14);

    // 트리플 엔진 포드
    function makeEngPod(ex, ey, col) {
      const pod = new PIXI.Graphics();
      pod.beginFill(0x100606, 1);
      pod.lineStyle(0.9, C, 0.58);
      pod.drawEllipse(ex, ey, 5, 2.8);
      pod.endFill();
      const flame = new PIXI.Graphics();
      flame.beginFill(col, 0.92);
      flame.drawEllipse(ex, ey, 3, 1.6);
      flame.endFill();
      flame.filters = Effects.asFilters(
        Effects.makeGlowFilter({ color: col, distance: 10, outerStrength: 2.0, innerStrength: 0.4, quality: 0.2 })
      );
      return [pod, flame];
    }

    const [podL, flameL] = makeEngPod(-12, 19, 0xff5500);
    const [podR, flameR] = makeEngPod( 12, 19, 0xff5500);
    const [podC, flameC] = makeEngPod(  0, 19, 0xff7700);

    const shield     = makeShield();
    const accentRing = makeAccentRing(2, 0xff8c40);
    const core       = makeCore(2, C);

    c.addChild(shield, wings, body, podL, flameL, podR, flameR, podC, flameC, accentRing, core);
    makeContainerGlow(c, C, 22, 2.8);

    return { shield, collisionR: 16 };
  }

  // ══════════════════════════════════════════════════════════
  // AGILITY — 보라-핑크. 돌고래 유선형. 짧고 부드러운 날개
  // 바운딩: x ±14, y -20~18
  // ══════════════════════════════════════════════════════════
  function buildAgility(c) {
    const C  = 0xc084fc;
    const C2 = 0xe879f9;

    // 유선형 날개 — 짧고 앞뒤로 둥글게 퍼짐 (돌고래 가슴지느러미 느낌)
    const wings = new PIXI.Graphics();
    // 왼쪽: bezier 느낌을 폴리곤으로 근사 — 앞이 둥글고 뒤가 뾰족
    wings.beginFill(0x0a0614, 1);
    wings.lineStyle(1.2, C, 0.62);
    wings.drawPolygon([
      -3, 2,    // 동체 연결점 (앞)
      -8, 0,    // 앞전 볼록
      -14, 5,   // 익단 최대 폭
      -12, 11,  // 뒷전 중간
      -5, 10,   // 동체 연결점 (뒤)
    ]);
    wings.endFill();
    // 앞전 하이라이트 (둥근 느낌 강조)
    wings.lineStyle(0.85, C2, 0.45);
    wings.moveTo(-3, 2);
    wings.lineTo(-14, 5);
    // 오른쪽 (대칭)
    wings.beginFill(0x0a0614, 1);
    wings.lineStyle(1.2, C, 0.62);
    wings.drawPolygon([
       3, 2,
       8, 0,
      14, 5,
      12, 11,
       5, 10,
    ]);
    wings.endFill();
    wings.lineStyle(0.85, C2, 0.45);
    wings.moveTo(3, 2);
    wings.lineTo(14, 5);

    // 동체 — 매우 좁고 유선형
    const body = new PIXI.Graphics();
    body.beginFill(0x080614, 1);
    body.lineStyle(1.7, C, 0.92);
    // 앞이 더 뾰족하고 뒤도 날렵하게
    body.drawPolygon([
       0,-20,   // 기수
       3, -8,
       3,  8,
       2, 16,
      -2, 16,
      -3,  8,
      -3, -8,
    ]);
    body.endFill();
    // 캐노피 — 길고 좁게
    body.beginFill(0x10082a, 1);
    body.lineStyle(0.8, 0xe0b4ff, 0.55);
    body.drawPolygon([ 0,-16, 2,-6, 0,-1, -2,-6 ]);
    body.endFill();
    // 세로선
    body.lineStyle(0.6, C, 0.25);
    body.moveTo(0, -1);
    body.lineTo(0, 12);

    // 측면 소핀 (안정성 핀, 돌고래 등지느러미 느낌)
    const fin = new PIXI.Graphics();
    fin.beginFill(0x080614, 1);
    fin.lineStyle(0.9, C, 0.55);
    fin.drawPolygon([ -1,-4, -5,2, -4,6, -1,3 ]);  // 왼
    fin.endFill();
    fin.beginFill(0x080614, 1);
    fin.lineStyle(0.9, C, 0.55);
    fin.drawPolygon([ 1,-4, 5,2, 4,6, 1,3 ]);       // 오른
    fin.endFill();

    // 엔진 노즐 — 작고 집약적
    const nozzle = new PIXI.Graphics();
    nozzle.beginFill(0x0a0614, 1);
    nozzle.lineStyle(0.9, C, 0.55);
    nozzle.drawEllipse(0, 17, 2.8, 1.6);
    nozzle.endFill();
    const nozzleCore = new PIXI.Graphics();
    nozzleCore.beginFill(C2, 0.9);
    nozzleCore.drawEllipse(0, 17, 1.6, 1);
    nozzleCore.endFill();
    nozzleCore.filters = Effects.asFilters(
      Effects.makeGlowFilter({ color: C2, distance: 10, outerStrength: 2.2, innerStrength: 0.5, quality: 0.2 })
    );

    const shield     = makeShield();
    const accentRing = makeAccentRing(-2, C);
    const core       = makeCore(-2, C2);

    c.addChild(shield, wings, fin, body, nozzle, nozzleCore, accentRing, core);
    makeContainerGlow(c, C, 18, 2.4);

    return { shield, collisionR: 12 };
  }

  // ══════════════════════════════════════════════════════════
  // 진입점
  // shipType: "standard" | "power" | "agility"
  // ══════════════════════════════════════════════════════════
  function makePlayer(shipType = "standard") {
    const S = GameState;
    const c = new PIXI.Container();

    const builders = {
      standard: buildStandard,
      power:    buildPower,
      agility:  buildAgility,
    };

    const build = builders[shipType] ?? buildStandard;
    const { shield, collisionR } = build(c);

    c.x = S.app.renderer.width  / 2;
    c.y = S.app.renderer.height / 2;
    S.uiLayer.addChild(c);

    return {
      type:      "player",
      spr:       c,
      shieldSpr: shield,
      r:         collisionR,
      vx: 0, vy: 0,
      inv:    0,
      fireCd: 0,
      dashT:  0,
    };
  }

  return { makePlayer };
})();