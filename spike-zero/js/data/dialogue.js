window.DIALOGUE_LIBRARY = (() => {
  const controllerStageStart = [
    "스테이지 진입.",
    "항로 안정적.",
    "적 신호 증가.",
    "교전 구역 확인.",
    "시야 확보.",
    "변수 없음."
  ];

  const playerStageStart = [
    "좋아, 몸 좀 풀자.",
    "조용하네. 오래가진 않겠지.",
    "또 시작이군.",
    "슬슬 감 잡히네.",
    "이번엔 뭐가 나오려나.",
    "일단 가보자."
  ];

  const controllerBoss = [
    "고위험 개체 감지.",
    "대형 반응 접근.",
    "패턴 변화 확인.",
    "국면 전환 경고.",
    "보스급 신호 포착."
  ];

  const playerBoss = [
    "왔네.",
    "이건 좀 빡센데.",
    "어이, 듣고 있어?",
    "좋아. 크게 놀아보자.",
    "또 하나 들어오네."
  ];

  const controllerClear = [
    "목표 제거.",
    "위협 반응 소멸.",
    "고위험 개체 무력화.",
    "교전 종료 확인.",
    "영역 안정화."
  ];

  const playerClear = [
    "끝났네.",
    "생각보다 빨랐어.",
    "다음은 뭐야?",
    "한숨 돌릴 틈은 있겠지.",
    "이 정도면 됐지."
  ];

  function pick(list, index) {
    return list[Math.abs(index) % list.length];
  }

  function getBossName(bossId) {
    const boss = window.BOSS_DEFINITIONS && window.BOSS_DEFINITIONS[bossId];
    return boss ? boss.name : "대형 목표";
  }

  function stageStart(stage = 1) {
    return [
      { speaker: "controller", text: `스테이지 ${stage} 진입.` },
      { speaker: "controller", text: pick(controllerStageStart, stage - 1) },
      { speaker: "player", text: pick(playerStageStart, stage - 1) }
    ];
  }

  function bossWarning(stage = 1, bossId = "basic") {
    return [
      { speaker: "controller", text: pick(controllerBoss, stage - 1) },
      { speaker: "controller", text: `${getBossName(bossId)} 확인.` },
      { speaker: "player", text: pick(playerBoss, stage - 1) }
    ];
  }

  function bossClear(stage = 1, bossId = "basic") {
    return [
      { speaker: "controller", text: `${getBossName(bossId)} 제거.` },
      { speaker: "controller", text: pick(controllerClear, stage - 1) },
      { speaker: "player", text: pick(playerClear, stage - 1) }
    ];
  }

  return {
    stageStart,
    bossWarning,
    bossClear
  };
})();
