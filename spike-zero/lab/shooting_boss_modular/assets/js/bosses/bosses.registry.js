(function() {
  const { canvas, effects, texts, Utils, Spark, RingEffect, PatternLibrary, getBossTuning, distanceToPlayer, countActiveThreats } = window.ShootingGameCore;

const BossRegistry = {
    basic: {
      id: "basic",
      label: "기본형",
      code: "CTRL-A",
      runtimeClass: "pattern",
      radius: 34,
      maxHp: 220,
      colors() {
        return { body: "#79ffbf", glow: "#48ffc5" };
      },
      movement(runtime, dt) {
        runtime.x = Utils.lerp(runtime.x, canvas.width * 0.5, dt * 0.4);
        runtime.y = Utils.lerp(runtime.y, canvas.height * 0.24, dt * 0.4);
      },
      phases: [
        {
          threshold: 1,
          cooldown: (rt) => {
            const tuning = getBossTuning(rt);
            return Utils.rand(tuning.cooldownMin, tuning.cooldownMax);
          },
          actions: [
            { name: "single", weight: 3.2, minInterval: 0.2 },
            { name: "danger", weight: 1.8, minInterval: 0.8, condition: (rt) => distanceToPlayer(rt) > 90 },
            { name: "radial", weight: 1.3, minInterval: 0.8, condition: () => countActiveThreats() < 20 }
          ]
        }
      ],
      panel() {
        return [
          "기본형 컨셉: 움직이면 살고, 멈추면 죽는다",
          "- 공통 베이스 런타임 적용",
          "- 단일 탄 / 위험지대 / 원형탄 수치 데이터화",
          "- 조건형 AI: 화면 탄 수 / 거리 기반 선택",
          "- 가장 단순한 학습형 보스"
        ];
      }
    },

    advanced: {
      id: "advanced",
      label: "강화형",
      code: "CTRL-X",
      runtimeClass: "pattern",
      radius: 42,
      maxHp: 500,
      colors(runtime) {
        if (runtime.phase === 1) return { body: "#7a5cff", glow: "#9a7dff" };
        return { body: "#ff6bb5", glow: "#ff8fab" };
      },
      movement(runtime, dt) {
        const player = runtime.player;
        if (runtime.phase === 1) {
          const orbit = performance.now() / 1000 * 0.65;
          const tx = canvas.width * 0.5 + Math.cos(orbit) * 110;
          const ty = canvas.height * 0.24 + Math.sin(orbit * 2) * 26;
          runtime.x = Utils.lerp(runtime.x, tx, dt * 1.3);
          runtime.y = Utils.lerp(runtime.y, ty, dt * 1.3);
        } else {
          const desired = Utils.angleTo(runtime.x, runtime.y, player.x, player.y) + Math.PI / 2;
          const tx = player.x + Math.cos(desired) * 170;
          const ty = Utils.clamp(player.y + Math.sin(desired) * 110, 80, canvas.height * 0.58);
          runtime.x = Utils.lerp(runtime.x, tx, dt * 1.6);
          runtime.y = Utils.lerp(runtime.y, ty, dt * 1.6);
        }
      },
      onPhaseEnter(runtime, newPhase) {
        if (newPhase !== 2) return;
        runtime.phaseTransition = 1.4;
        runtime.stateText = "PHASE SHIFT";
        for (let i = 0; i < 26; i++) effects.push(new Spark(runtime.x, runtime.y, "#ff6bb5"));
        effects.push(new RingEffect(runtime.x, runtime.y, 18, "#ff6bb5", 0.55));
      },
      duringPhaseTransition(runtime) {
        if (runtime.phaseTransition > 0.7 && runtime.aiTimer <= 0) {
          runtime.aiTimer = 0.22;
          PatternLibrary.single(runtime);
        }
      },
      phases: [
        {
          threshold: 1,
          cooldown: (rt) => getBossTuning(rt).cooldown,
          actions: [
            { name: "rotating", weight: 2.3, minInterval: 0.7, condition: () => countActiveThreats() < 35 },
            { name: "trackingZone", weight: 1.9, minInterval: 1.1, condition: (rt) => distanceToPlayer(rt) > 100 },
            { name: "safeLane", options: { randomize: false }, weight: 3.1, minInterval: 1.0, condition: (rt) => rt.player.dashCooldown > 0.08 || distanceToPlayer(rt) > 140 }
          ]
        },
        {
          threshold: 0.5,
          cooldown: (rt) => getBossTuning(rt).cooldown,
          actions: [
            { name: "doubleRing", weight: 2.0, minInterval: 1.0, condition: () => countActiveThreats() < 55 },
            { name: "safeLane", options: { randomize: true }, weight: 2.8, minInterval: 0.9, condition: (rt) => distanceToPlayer(rt) > 140 },
            { name: "teleportBlast", weight: 2.7, minInterval: 1.3, condition: (rt) => distanceToPlayer(rt) < 260 }
          ]
        }
      ],
      panel(runtime) {
        if (runtime.phase === 1) {
          return [
            "강화형 Phase 1: 조건형 탄막 설계",
            "- 회전 탄막: 화면 여유 있을 때만 선택",
            "- 추적 위험지대: 거리 기반 선택",
            "- 안전지대 탄막: 대시 쿨과 거리 반응",
            "- 순환형 대신 가중치 + 조건형 AI"
          ];
        }
        return [
          "강화형 Phase 2: 조건형 난이도 압박",
          "- 이중 탄막 / 랜덤 안전지대 / 텔포 폭발",
          "- 화면 위협량이 많으면 패턴 자동 조절",
          "- 측면 위치 선정은 유지",
          "- 내부 수치는 BossTunings로 분리"
        ];
      }
    },

    summoner: {
      id: "summoner",
      label: "소환사형",
      code: "SUMM-S",
      runtimeClass: "summoner",
      radius: 30,
      maxHp: 360,
      phases: [
        {
          threshold: 1,
          cooldown: () => 0.9,
          actions: [
            { name: "summonWave", weight: 4.2, minInterval: 1.0, condition: (rt) => rt.minions.length < (rt.tuning.summon?.maxMinions ?? 3) },
            { name: "single", weight: 1.8, minInterval: 0.2, condition: () => true },
            { name: "danger", weight: 1.5, minInterval: 0.9, condition: (rt) => distanceToPlayer(rt) < 240 }
          ]
        },
        {
          threshold: 0.5,
          cooldown: () => 0.72,
          actions: [
            { name: "summonWave", weight: 5.0, minInterval: 0.8, condition: (rt) => rt.minions.length < (rt.tuning.summon?.maxMinions ?? 4) },
            { name: "single", weight: 2.0, minInterval: 0.18, condition: () => true },
            { name: "trackingZone", weight: 1.8, minInterval: 1.0, condition: (rt) => distanceToPlayer(rt) < 260 }
          ]
        }
      ],
      colors(runtime) {
        const inv = runtime.isInvulnerable?.();
        if (runtime.phase === 1) return { body: inv ? "#d8dcff" : "#8a91ff", glow: inv ? "#a2a8ff" : "#6e78ff" };
        return { body: inv ? "#ffd8f6" : "#ff8be4", glow: inv ? "#ff6bd6" : "#d85cf0" };
      },
      panel(runtime) {
        const inv = runtime.isInvulnerable?.() ? "ON" : "OFF";
        return [
          `소환사형: 미니언 우선 처리 유도 (${inv})`,
          `- 현재 미니언 수: ${runtime.minions.length}`,
          "- 미니언 생존 중 본체 무적",
          "- Shooter: 원거리 견제 / Chaser: 추적 압박",
          "- Bomber: 근접 자폭으로 공간 강제",
          "- 전멸시키면 본체가 다시 취약해짐"
        ];
      }
    },

    knight: {
      id: "knight",
      label: "돌진 기사형",
      code: "ELITE-K",
      runtimeClass: "knight",
      radius: 22,
      maxHp: 300,
      phases: [
        { threshold: 1 },
        { threshold: 0.5 }
      ],
      colors(runtime) {
        const tuning = getBossTuning(runtime);
        return { body: tuning.bodyColor || "#7a5cff", glow: tuning.glow || "#9a7dff" };
      },
      panel(runtime) {
        if (runtime.phase === 1) {
          return [
            "기사형 Phase 1: 상태머신 + 데이터 기반 수치",
            "- 접근 / 측면 이동 / 차지 / 공격 / 후딜",
            "- 패턴 선택도 규칙 테이블로 분리",
            "- 예고선, 돌진, 파동 수치 전부 데이터화",
            "- 근접 압박 학습용 보스"
          ];
        }
        return [
          "기사형 Phase 2: 규칙형 패턴 선택 강화",
          "- 크로스 러시 / 버스트 웨이브 비중 증가",
          "- 페이즈 수치를 BossTunings에서 직접 관리",
          "- 공통 BaseBossRuntime 사용",
          "- 고속 돌진형 테스트 보스"
        ];
      }
    },

    split: {
      id: "split",
      label: "분열형",
      code: "GEMINI",
      runtimeClass: "split",
      radius: 38,
      maxHp: 420,
      phases: [
        { threshold: 1 },
        { threshold: 0.5 }
      ],
      colors(runtime) {
        if (runtime.phase === 1) return { body: "#ffd166", glow: "#ffb347" };
        return { body: "#f4f1ff", glow: "#9a7dff" };
      },
      panel(runtime) {
        if (runtime.phase === 1) {
          return [
            "분열형 Phase 1: 단일 코어 압박",
            "- 코어 확산 / 추적지대 / 안전지대 / 단일탄 순환",
            "- 체력 50% 이하에서 자동 분열",
            "- 분열 전까지는 중앙 코어만 타격 가능",
            "- 페이즈 전환 연출 포함"
          ];
        }
        const alive = runtime.children?.filter(child => child.hp > 0 && !child.dead).length ?? 0;
        return [
          `분열형 Phase 2: 청색/적색 분리 전투 (${alive}체 생존)`,
          "- 청색: 원거리 탄막 / 안전지대 압박",
          "- 적색: 돌진 / 추적 폭발로 근접 압박",
          "- 하나 격파 시 남은 쪽 각성",
          "- 분열 직후 짧은 무적 존재"
        ];
      }
    }
  };

  window.ShootingBossRegistry = { BossRegistry };
})();
