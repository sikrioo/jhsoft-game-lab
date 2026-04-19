window.DIALOGUE_LIBRARY = (() => {
  const CONTROLLER_ID = "rhea";
  const PLAYER_ID = "player";

  function line(speakerId, text) {
    return { speakerId, text };
  }

  const STAGE_DIALOGUE = {
    1: {
      intro: [
        line(PLAYER_ID,      "여어, 안녕 신입."),
        line(CONTROLLER_ID,  "네. 안녕하세요."),
        line(PLAYER_ID,      "수석 졸업에 인기도 많았다는 그 친구구만. 이야기 많이 들었어."),
        line(CONTROLLER_ID,  "네."),
        line(PLAYER_ID,      "앞으로 잘 부탁해. 난 스파이크야."),
        line(CONTROLLER_ID,  "레이입니다."),
        line(PLAYER_ID,      "레이. 어디서 많이 들어본 이름인데... 아, 전에 키우던 물고기."),
        line(CONTROLLER_ID,  "..."),
        line(CONTROLLER_ID,  "브리핑 하겠습니다."),
        line(PLAYER_ID,      "신입, 무리할 거 없어. 첫날이니 지켜만 봐.")
      ],
      warning: [
        line(CONTROLLER_ID,  "Sentinel Core 감지. 정면 화력과 범위 폭발을 혼합 사용합니다. 기체 주변에 원형 범위가 나타나면 이탈하세요."),
        line(CONTROLLER_ID,  "범위 내 잔류 시 손상을 입을 수 있습니다."),
        line(PLAYER_ID,      "생긴 거보단 머리를 쓰네."),
        line(CONTROLLER_ID,  "지원이 필요할까요?"),
        line(PLAYER_ID,      "그럴리가.")
      ],
      clear: [
        line(CONTROLLER_ID,  "Sentinel Core 소멸."),
        line(PLAYER_ID,      "첫날부터 훌륭했어, 이제 쉬자고.")
      ]
    },
    2: {
      intro: [
        line(CONTROLLER_ID,  "스테이지 2. 적 기동성 증가, 측면 기습 패턴 다수. 공간을 넓게 쓰세요."),
        line(PLAYER_ID,      "이제 좀 손맛이 나겠어.")
      ],
      warning: [
        line(CONTROLLER_ID,  "Crimson Knight. 돌진 전 짧은 선행 모션이 있습니다. 한 박자 기다렸다가 이탈, 이후 반격 타이밍."),
        line(PLAYER_ID,      "정면으로 오는 건 오히려 편하지."),
        line(CONTROLLER_ID,  "과신 주의.")
      ],
      clear: [
        line(CONTROLLER_ID,  "Crimson Knight 제거."),
        line(PLAYER_ID,      "정면 승부는 역시 이게 답이야."),
        line(CONTROLLER_ID,  "운도 있었어요."),
        line(PLAYER_ID,      "하.")
      ]
    },
    3: {
      intro: [
        line(CONTROLLER_ID,  "심부 구역. 지형 협소하고 시야 제한됩니다. 공간 통제 어려울 수 있어요."),
        line(PLAYER_ID,      "마지막이니까 좀 거칠어도 괜찮아."),
        line(CONTROLLER_ID,  "많이 거칩니다.")
      ],
      warning: [
        line(CONTROLLER_ID,  "Gemini Splitter. 일정 체력 이하에서 두 개체로 분열, 이후 양방향 동시 공격 패턴으로 전환합니다. 중앙 고정은 위험해요."),
        line(PLAYER_ID,      "둘로 갈라지면 둘 다 잡으면 되는 거 아니야?"),
        line(CONTROLLER_ID,  "이론상으론."),
        line(PLAYER_ID,      "레이, 너 방금 농담한 거야?"),
        line(CONTROLLER_ID,  "집중하세요.")
      ],
      clear: [
        line(CONTROLLER_ID,  "Gemini Splitter 소멸. 구역 확보."),
        line(PLAYER_ID,      "수고했어, 레이."),
        line(CONTROLLER_ID,  "임무 완료입니다."),
        line(PLAYER_ID,      "언젠간 웃는 거 보겠지."),
        line(CONTROLLER_ID,  "기대하지 마세요.")
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
