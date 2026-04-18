window.DIALOGUE_LIBRARY = (() => {
  const STAGE_DIALOGUE = {
    1: {
      intro: [
        { speaker: "controller", text: "스테이지 1 진입." },
        { speaker: "controller", text: "외곽 방어선입니다. 먼저 놈들의 사격 리듬부터 읽으세요." },
        { speaker: "player", text: "좋아, 워밍업으로는 딱이네." }
      ],
      warning: [
        { speaker: "controller", text: "Sentinel Core 확인." },
        { speaker: "controller", text: "정면 화력과 범위 폭발을 섞습니다. 경고 원이 뜨면 바로 이탈하세요." },
        { speaker: "player", text: "기본기 점검용 보스라는 거네. 깔끔하게 정리하지." }
      ],
      clear: [
        { speaker: "controller", text: "Sentinel Core 제거." },
        { speaker: "controller", text: "좋습니다. 이제 근접 압박형 개체에 대비하세요." },
        { speaker: "player", text: "다음은 더 빠르게 들어오겠군." }
      ]
    },
    2: {
      intro: [
        { speaker: "controller", text: "스테이지 2 진입." },
        { speaker: "controller", text: "적 기동성이 올라갑니다. 측면 공간을 넓게 쓰세요." },
        { speaker: "player", text: "좋아, 이제 슬슬 손맛이 나겠어." }
      ],
      warning: [
        { speaker: "controller", text: "Crimson Knight 접근 중." },
        { speaker: "controller", text: "돌진 전에 선행 예고가 있습니다. 한 번 피한 뒤 반격 타이밍을 잡으세요." },
        { speaker: "player", text: "정면 승부라면 오히려 반갑지." }
      ],
      clear: [
        { speaker: "controller", text: "Crimson Knight 제거." },
        { speaker: "controller", text: "마지막 구역입니다. 다음 개체는 전장 분할 패턴을 사용합니다." },
        { speaker: "player", text: "좋네. 마지막답게 조금 거칠어도 괜찮아." }
      ]
    },
    3: {
      intro: [
        { speaker: "controller", text: "스테이지 3 진입." },
        { speaker: "controller", text: "심부 구역입니다. 공간 통제가 어려워질 겁니다." },
        { speaker: "player", text: "좋아, 데모의 마무리답게 크게 가보자." }
      ],
      warning: [
        { speaker: "controller", text: "Gemini Splitter 확인." },
        { speaker: "controller", text: "분열 이후 화력이 양쪽에서 들어옵니다. 중앙 고정은 위험합니다." },
        { speaker: "player", text: "둘로 갈라지면 둘 다 잡으면 되지." }
      ],
      clear: [
        { speaker: "controller", text: "Gemini Splitter 제거." },
        { speaker: "controller", text: "데모 구역 확보 완료. 귀환 경로를 열겠습니다." },
        { speaker: "player", text: "좋아. 이번 시연은 이걸로 충분하겠네." }
      ]
    }
  };

  function getStageDialogue(stage = 1) {
    return STAGE_DIALOGUE[stage] || STAGE_DIALOGUE[3];
  }

  function stageStart(stage = 1) {
    return getStageDialogue(stage).intro;
  }

  function bossWarning(stage = 1) {
    return getStageDialogue(stage).warning;
  }

  function bossClear(stage = 1) {
    return getStageDialogue(stage).clear;
  }

  return {
    stageStart,
    bossWarning,
    bossClear
  };
})();
