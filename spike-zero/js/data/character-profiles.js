window.CHARACTER_PROFILES = {
  rhea: {
    id: "rhea",
    role: "controller",
    name: "레이",
    shortName: "RH",
    avatarSrc: "./resources/avatar-controller.png",
    description: "기본 관제사. 필요한 정보만 간결하게 전달하며 스테이지 1~2 브리핑을 담당한다.",
    faction: "Command",
    tags: ["operator", "comms", "support"]
  },
  serin: {
    id: "serin",
    role: "controller",
    name: "서린",
    shortName: "SR",
    avatarSrc: "./resources/avatar-controller2.png",
    description: "베테랑 관제사. 짧고 단호한 지시로 전장을 통제하며 스테이지 3 브리핑을 전담한다.",
    faction: "Command",
    tags: ["operator", "comms", "veteran", "control"]
  },
  player: {
    id: "player",
    role: "player",
    name: "스파이크",
    shortName: "SP",
    avatarSrc: null,
    description: "현장 전투 파일럿. 관제사의 지시를 받으며 직접 교전에 투입된다.",
    faction: "Pilot",
    tags: ["pilot", "playable"]
  }
};
