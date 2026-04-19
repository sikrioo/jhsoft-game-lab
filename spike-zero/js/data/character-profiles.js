window.CHARACTER_PROFILES = {
  rhea: {
    id: "rhea",
    role: "controller",
    name: "Rhea",
    shortName: "RH",
    avatarSrc: "./resources/avatar-controller.png",
    description: "기본 관제 오퍼레이터. 교전 구역 브리핑과 전술 콜아웃을 담당한다.",
    faction: "Command",
    tags: ["operator", "comms", "support"]
  },
  player: {
    id: "player",
    role: "player",
    name: "Player",
    shortName: "P",
    avatarSrc: null,
    description: "현장 전투 파일럿. 관제와 통신하면서 직접 교전에 투입된다.",
    faction: "Pilot",
    tags: ["pilot", "playable"]
  }
};
