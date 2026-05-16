export function createInitialGameState(config) {
  return {
    coins: 120,
    tickets: 5,
    deadlineIndex: 0,
    paid: 0,
    spinning: false,
    combo: 0,
    coinDisplay: 120,
    multipliers: Object.fromEntries(
      config.symbols.map((symbol) => [symbol.id, symbol.baseMultiplier]),
    ),
    grid: Array.from({ length: config.reels.columns }, () =>
      Array(config.reels.rows).fill(config.symbols[0]),
    ),
  };
}
