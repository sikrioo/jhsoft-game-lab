const PATTERN_FAMILIES = {
  horizontal: { name: "Horizontal", shortLabel: "H", multiplier: 1, color: "#d4a020", priority: 100 },
  vertical: { name: "Vertical", shortLabel: "V", multiplier: 1, color: "#40c8ff", priority: 100 },
  diagonal: { name: "Diagonal", shortLabel: "D", multiplier: 1, color: "#ff80a0", priority: 100 },
  horizontalL: { name: "Horizontal-L", shortLabel: "HL", multiplier: 2, color: "#9eff40", priority: 200 },
  horizontalXL: { name: "Horizontal-XL", shortLabel: "HXL", multiplier: 3, color: "#ffb347", priority: 300 },
  zig: { name: "Zig", shortLabel: "ZIG", multiplier: 4, color: "#a57cff", priority: 400 },
  jag: { name: "Jag", shortLabel: "JAG", multiplier: 4, color: "#5df2d6", priority: 400 },
  earth: { name: "Earth", shortLabel: "EARTH", multiplier: 7, color: "#ff6b6b", priority: 700 },
  heaven: { name: "Heaven", shortLabel: "HEAVEN", multiplier: 7, color: "#ffe066", priority: 700 },
  eye: { name: "Eye", shortLabel: "EYE", multiplier: 8, color: "#7fb3ff", priority: 800 },
  jackpot: { name: "Jackpot", shortLabel: "JP", multiplier: 10, color: "#ff4020", priority: 1000 },
};

export const GAME_CONFIG = {
  version: "0.7",
  payoutMode: "symbol-pattern-multiplier",
  deadlines: [75, 220, 666, 2200, 12000],
  costs: {
    spin: 5,
  },
  rewards: {
    advanceCoins: 60,
    advanceTickets: 2,
    multiplierGrowth: 1,
    jackpotTickets: 0,
  },
  reels: {
    columns: 5,
    rows: 3,
    rowHeight: 110,
    extraRows: 1,
    stopDurations: [900, 1100, 1300, 1500, 1700],
    rowClasses: ["top", "mid", "bot"],
  },
  ui: {
    lineColors: ["#d4a020", "#40c8ff", "#ff80a0", "#9eff40", "#ffb347", "#a57cff", "#5df2d6", "#ff6b6b", "#ffe066", "#7fb3ff"],
    neutralBurst: "#6a5828",
    jackpotFlash: "#ff4020",
    jackpotBurst: "#d4a020",
    jackpotStars: "#ffdd40",
    devilFlash: "#cc00ff",
    devilTint: "#600030",
    depositBurst: "#30b060",
    gainFloat: "#d4a020",
    comboFloat: "#40c8ff",
    depositFloat: "#30b060",
    overdriveFlash: "#ff8a20",
    feverFlash: "#40c8ff",
    lossFlash: "#c03020",
  },
  items: {
    active: [],
  },
    manager: {
      name: "ALICE",
      role: "Casino Manager AI",
      avatarPath: "./cloverpit_slot_v0.7/assets/images/characters/alice_main.webp",
      descriptor: "Helpful until your appetite becomes interesting.",
      topics: [
        { id: "symbols", label: "SYMBOLS" },
        { id: "patterns", label: "PATTERNS" },
        { id: "odds", label: "ODDS" },
        { id: "jackpot", label: "JACKPOT" },
        { id: "devil", label: "DEVIL" },
        { id: "combo", label: "COMBO" },
      ],
    },
    symbolGuide: [
      { id: "cherry", name: "Cherry", icon: "CHR", multiplier: 2, description: "A common appetite. Low value, easy to assemble, useful for fast shape checks." },
      { id: "lemon", name: "Lemon", icon: "LEM", multiplier: 2, description: "As common as Cherry. Reliable when you only need the room to acknowledge a shape." },
      { id: "clover", name: "Clover", icon: "CLV", multiplier: 3, description: "A rarer green signal. Better value once the board begins to cooperate." },
      { id: "bell", name: "Bell", icon: "BEL", multiplier: 3, description: "Mid-tier and stable. It pays like Clover, but tends to feel louder when it lands." },
      { id: "diamond", name: "Diamond", icon: "GEM", multiplier: 5, description: "High-value and less forgiving. The board rarely offers this shape cheaply." },
      { id: "treasure", name: "Treasure", icon: "TRE", multiplier: 5, description: "A second x5 family. Expensive enough to matter, common enough to tempt you." },
      { id: "jackpot", name: "Seven", icon: "777", multiplier: 7, description: "The premium ordinary symbol. If Seven completes a large pattern, the machine stops pretending to be modest." },
      { id: "devil", name: "Devil", icon: "666", multiplier: 0, multiplierLabel: "VOID", description: "Not a payout symbol. Devil exists to cancel greed, not reward it." },
    ],
    patternGuide: [
      { id: "horizontal", name: "Horizontal", multiplier: 1, description: "The smallest clean line. Three matching cells across one row.", grid: ["00000", "01110", "00000"] },
    { id: "vertical", name: "Vertical", multiplier: 1, description: "A narrow pillar. Three matching cells stacked in one column.", grid: ["00100", "00100", "00100"] },
    { id: "diagonal", name: "Diagonal", multiplier: 1, description: "A slanted run. Three matching cells crossing the board on an angle.", grid: ["00010", "00100", "01000"] },
    { id: "horizontal-l", name: "Horizontal-L", multiplier: 2, description: "A longer row of four. The house pays extra for the stretch.", grid: ["00000", "01111", "00000"] },
    { id: "horizontal-xl", name: "Horizontal-XL", multiplier: 3, description: "A full row of five. Simple, loud, and reliable.", grid: ["00000", "11111", "00000"] },
    { id: "zig", name: "Zig", multiplier: 4, description: "A descending fracture. It cuts from upper center into a split lower spread.", grid: ["00100", "01010", "10001"] },
    { id: "jag", name: "Jag", multiplier: 4, description: "The mirrored fracture. It closes inward toward the lower center.", grid: ["10001", "01010", "00100"] },
    { id: "earth", name: "Earth", multiplier: 7, description: "A grounded crown. Narrow at the top, wide and absolute on the bottom row.", grid: ["00100", "01010", "11111"] },
    { id: "heaven", name: "Heaven", multiplier: 7, description: "The inverted crown. Full pressure above, tapering down to a single point.", grid: ["11111", "01010", "00100"] },
    { id: "eye", name: "Eye", multiplier: 8, description: "A watching pattern. Dense edges, hollow center, difficult to ignore.", grid: ["01110", "11011", "01110"] },
    { id: "jackpot", name: "Jackpot", multiplier: 10, description: "The entire 3x5 board becomes one symbol. This is the shape the room actually wants.", grid: ["11111", "11111", "11111"] },
  ],
  paylines: [],
  patterns: createPatternSet(),
  symbols: [
    { id: "cherry", name: "Cherry", icon: "CHR", baseMultiplier: 2, baseWeight: 30, rarity: "common", family: "fruit" },
    { id: "lemon", name: "Lemon", icon: "LEM", baseMultiplier: 2, baseWeight: 28, rarity: "common", family: "fruit" },
    { id: "clover", name: "Clover", icon: "CLV", baseMultiplier: 3, baseWeight: 16, rarity: "rare", family: "nature" },
    { id: "bell", name: "Bell", icon: "BEL", baseMultiplier: 3, baseWeight: 14, rarity: "rare", family: "treasure" },
    { id: "diamond", name: "Diamond", icon: "GEM", baseMultiplier: 5, baseWeight: 8, rarity: "epic", family: "treasure" },
    { id: "treasure", name: "Treasure", icon: "TRE", baseMultiplier: 5, baseWeight: 8, rarity: "epic", family: "treasure" },
    { id: "jackpot", name: "Seven", icon: "777", baseMultiplier: 7, baseWeight: 3, rarity: "legendary", special: "jackpot", family: "fate" },
    { id: "devil", name: "Devil", icon: "666", baseMultiplier: 0, baseWeight: 5, rarity: "curse", special: "devil", family: "infernal" },
  ],
};

function createPatternSet() {
  return [
    ...createHorizontalPatterns(3, PATTERN_FAMILIES.horizontal),
    ...createVerticalPatterns(PATTERN_FAMILIES.vertical),
    ...createDiagonalPatterns(PATTERN_FAMILIES.diagonal),
    ...createHorizontalPatterns(4, PATTERN_FAMILIES.horizontalL),
    ...createHorizontalPatterns(5, PATTERN_FAMILIES.horizontalXL),
    createPattern("zig-main", PATTERN_FAMILIES.zig, [[2, 0], [1, 1], [3, 1], [0, 2], [4, 2]]),
    createPattern("jag-main", PATTERN_FAMILIES.jag, [[0, 0], [4, 0], [1, 1], [3, 1], [2, 2]]),
    createPattern("earth-main", PATTERN_FAMILIES.earth, [[2, 0], [1, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]]),
    createPattern("heaven-main", PATTERN_FAMILIES.heaven, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1], [3, 1], [2, 2]]),
    createPattern("eye-main", PATTERN_FAMILIES.eye, [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2]]),
    createPattern(
      "jackpot-board",
      PATTERN_FAMILIES.jackpot,
      Array.from({ length: 5 }, (_column, column) =>
        Array.from({ length: 3 }, (_row, row) => [column, row]),
      ).flat(),
    ),
  ];
}

function createHorizontalPatterns(length, family) {
  const patterns = [];
  for (let row = 0; row < 3; row += 1) {
    for (let start = 0; start <= 5 - length; start += 1) {
      const cells = Array.from({ length }, (_value, offset) => [start + offset, row]);
      patterns.push(createPattern(`${family.shortLabel.toLowerCase()}-${length}-r${row}-c${start}`, family, cells));
    }
  }
  return patterns;
}

function createVerticalPatterns(family) {
  const patterns = [];
  for (let column = 0; column < 5; column += 1) {
    const cells = [[column, 0], [column, 1], [column, 2]];
    patterns.push(createPattern(`v-${column}`, family, cells));
  }
  return patterns;
}

function createDiagonalPatterns(family) {
  const patterns = [];
  for (let start = 0; start <= 2; start += 1) {
    patterns.push(createPattern(`diag-down-${start}`, family, [[start, 0], [start + 1, 1], [start + 2, 2]]));
    patterns.push(createPattern(`diag-up-${start}`, family, [[start, 2], [start + 1, 1], [start + 2, 0]]));
  }
  return patterns;
}

function createPattern(id, family, cells) {
  return {
    id,
    familyId: family.shortLabel.toLowerCase(),
    name: family.name,
    shortLabel: family.shortLabel,
    multiplier: family.multiplier,
    color: family.color,
    priority: family.priority + cells.length,
    cells,
  };
}
