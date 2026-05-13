export function createState() {
  return {
    app: null,
    size: 0,
    cx: 0,
    cy: 0,
    radius: 0,
    sweep: 0,
    targets: [],
    targetSprites: new Map(),
    noisePool: [],
    shockwaves: [],
    lockedId: null,
    scrambleUntil: 0,
    lastTime: performance.now(),
    listTimer: 0,
    logLines: [],
    smoothedHud: null,
    falseContacts: [],
    falseAlarmCharge: 0,
    layers: {},
    controlValues: {
      speed: 1.25,
      range: 720,
      noise: 16,
      angularResolution: 6,
      detectionProbability: 78,
      falseAlarmRate: 8
    },
    sweepGraphic: null,
    lockGraphic: null,
    lockText: null
  };
}
