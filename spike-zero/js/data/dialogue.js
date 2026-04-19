window.DIALOGUE_LIBRARY = (() => {
  const CONTROLLER_ID = "rhea";
  const PLAYER_ID = "player";
  const SERIN_ID = "serin";

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
        line(PLAYER_ID,      "그럴 리가.")
      ],
      clear: [
        line(CONTROLLER_ID,  "Sentinel Core 소멸."),
        line(PLAYER_ID,      "첫날부터 훌륭했어, 이제 쉬자고.")
      ]
    },

    2: {
      intro: [
        line(PLAYER_ID,      "여어, 신입. 어제는 꽤 괜찮았어."),
        line(CONTROLLER_ID,  "네."),
        line(PLAYER_ID,      "첫날에 그 정도면 상위권이야. 운도 좀 있었고."),
        line(CONTROLLER_ID,  "운도 실력입니다."),
        line(PLAYER_ID,      "오, 그런 말은 또 잘하네."),

        line(PLAYER_ID,      "오늘은 좀 더 어려울 수 있겠네."),
        line(CONTROLLER_ID,  "네. 확인했습니다. 기동성 증가, 측면 기습 다수."),
        line(PLAYER_ID,      "맞아. 그리고 중요한 거 하나 더."),

        line(PLAYER_ID,      "오늘 비가 올것 같은 우주야."),
        line(CONTROLLER_ID,  "..."),
        line(PLAYER_ID,      "지금 느낌 딱 불길한 날이다.")
      ],
      warning: [
        line(CONTROLLER_ID,  "Crimson Knight 감지. 돌진 전 짧은 선행 모션이 있습니다. 한 박자 기다렸다가 이탈, 이후 반격 타이밍입니다."),
        line(PLAYER_ID,      "정면으로 오는 건 오히려 편하지."),
        line(CONTROLLER_ID,  "네.")
      ],
      clear: [
        line(CONTROLLER_ID,  "Crimson Knight 제거."),
        line(PLAYER_ID,      "역시 내 실력."),
        line(CONTROLLER_ID,  "운도 있었습니다."),
        line(PLAYER_ID,      "하하하.")
      ]
    },

    3: {
      intro: [
        line(PLAYER_ID,      "여어 신입—"),
        line(SERIN_ID,       "그동안 잘 지냈어요?"),

        line(PLAYER_ID,      "..."),
        line(PLAYER_ID,      "어?"),
        line(PLAYER_ID,      "레이는?"),

        line(SERIN_ID,       "다른 임무에 투입됐어요."),
        line(PLAYER_ID,      "아… 그렇구만."),

        line(SERIN_ID,       "목소리와 표정이 별로 좋지 않네요."),
        line(PLAYER_ID,      "아니, 뭐... 그런 건 아니고."),

        line(SERIN_ID,       "인사는 그만 됐고. 이제 집중하세요."),
        line(PLAYER_ID,      "...그래.")
      ],
      warning: [
        line(SERIN_ID,       "Gemini Splitter 감지. 일정 체력 이하에서 두 개체로 분열합니다."),
        line(SERIN_ID,       "이후 양방향 동시 공격 패턴으로 전환. 중앙 고정은 위험합니다."),
        line(PLAYER_ID,      "한꺼번에 잡으면 되는 거 아니야?"),
        line(SERIN_ID,       "집중 해서 빨리 해치워주세요."),
      ],
      clear: [
        line(SERIN_ID,       "Gemini Splitter 소멸. 구역 확보."),
        line(SERIN_ID,       "임무 완료입니다."),
        line(PLAYER_ID,      "...오늘은 더 피곤하네.")
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