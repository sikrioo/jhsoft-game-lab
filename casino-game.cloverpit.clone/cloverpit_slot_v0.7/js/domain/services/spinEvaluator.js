const STAGE_TITLES = {
  patterns: "STEP 1 - PATTERN CHECK",
  combo: "STEP 2 - COMBO CHECK",
};

export function evaluateSpin({ grid, state, config }) {
  const context = createEvaluationContext(grid, state, config);

  evaluatePatternBoard(context);
  evaluateCombo(context);

  return {
    rowResults: [],
    wins: context.patternWins,
    stages: context.stages,
    totalWin: context.totalCoinDelta,
    devilTriggered: context.devilTriggered,
    summaryRows: buildSummaryRows(context),
  };
}

function createEvaluationContext(grid, state, config) {
  return {
    grid,
    state,
    config,
    betAmount: config.costs.spin,
    stages: [],
    patternWins: [],
    totalCoinDelta: 0,
    devilTriggered: false,
    devilMatches: [],
    comboPlan: {
      reset: false,
      delta: 0,
    },
  };
}

function evaluatePatternBoard(context) {
  const entries = [];
  const devilCandidates = selectDominantPatterns(findPatternCandidates(context.grid, context.config.patterns, "devil"));

  if (devilCandidates.length > 0) {
    context.devilTriggered = true;
    context.devilMatches = devilCandidates;
    entries.push({
      label: "666 VOID",
      text: `${describePatternLabels(devilCandidates)} formed with DEVIL. Normal pattern rewards are voided.`,
      tone: "loss",
      effect: "event-devil",
      color: context.config.ui.devilFlash,
      focus: mergeFocuses(devilCandidates.map((candidate) => createFocus({
        positions: candidate.cells,
        symbolIds: ["devil"],
        color: context.config.ui.devilFlash,
      }))),
    });
    context.stages.push(createStage("patterns", entries));
    return;
  }

  const wins = [];
  const eligibleSymbols = context.config.symbols.filter((symbol) => symbol.special !== "devil");

  for (const symbol of eligibleSymbols) {
    const candidates = findPatternCandidates(context.grid, context.config.patterns, symbol.id);
    const selectedPatterns = selectDominantPatterns(candidates);

    for (const pattern of selectedPatterns) {
      const winAmount = calculatePatternWin({
        betAmount: context.betAmount,
        symbolMultiplier: symbol.baseMultiplier,
        patternMultiplier: pattern.multiplier,
      });

      const win = {
        patternId: pattern.id,
        patternName: pattern.name,
        patternLabel: pattern.shortLabel,
        patternMultiplier: pattern.multiplier,
        symbolId: symbol.id,
        symbolName: symbol.name,
        symbolIcon: symbol.icon,
        symbolMultiplier: symbol.baseMultiplier,
        betAmount: context.betAmount,
        winAmount,
        positions: pattern.cells,
        color: pattern.color,
        emphasis: getWinEmphasis(pattern, symbol),
        focus: createFocus({
          positions: pattern.cells,
          symbolIds: [symbol.id],
          color: pattern.color,
        }),
      };

      wins.push(win);
      context.totalCoinDelta += winAmount;
      entries.push({
        label: `${symbol.icon} ${pattern.shortLabel}`,
        text: `${symbol.name} ${pattern.name} -> ${context.betAmount} x ${symbol.baseMultiplier} x ${pattern.multiplier} = +${winAmount}.`,
        tone: win.emphasis,
        effect: "pattern-win",
        coinDelta: winAmount,
        color: pattern.color,
        focus: win.focus,
        patternName: pattern.name,
        patternLabel: pattern.shortLabel,
        patternMultiplier: pattern.multiplier,
        symbolName: symbol.name,
        symbolIcon: symbol.icon,
        symbolMultiplier: symbol.baseMultiplier,
        betAmount: context.betAmount,
        patternId: pattern.id,
        symbolId: symbol.id,
      });
    }
  }

  entries.sort((left, right) => {
    if (left.effect !== "pattern-win" || right.effect !== "pattern-win") {
      return 0;
    }

    return left.patternMultiplier - right.patternMultiplier
      || left.coinDelta - right.coinDelta
      || left.patternName.localeCompare(right.patternName)
      || left.symbolName.localeCompare(right.symbolName);
  });

  wins.sort((left, right) => right.winAmount - left.winAmount || right.patternMultiplier - left.patternMultiplier);
  context.patternWins = wins;

  if (entries.length === 0) {
    entries.push({
      label: "PATTERNS",
      text: "No valid symbol pattern formed on the board.",
      tone: "neutral",
      effect: "none",
    });
  }

  context.stages.push(createStage("patterns", entries));
}

function evaluateCombo(context) {
  const entries = [];

  if (context.devilTriggered) {
    context.comboPlan = {
      reset: true,
      delta: 0,
    };
    entries.push({
      label: "COMBO",
      text: "666 severs the combo chain. Combo resets, but does not alter this payout.",
      tone: "loss",
      effect: "combo-reset",
      focus: mergeFocuses(context.devilMatches.map((match) => createFocus({
        positions: match.cells,
        symbolIds: ["devil"],
        color: context.config.ui.devilFlash,
      }))),
    });
    context.stages.push(createStage("combo", entries));
    return;
  }

  if (context.patternWins.length === 0) {
    context.comboPlan = {
      reset: true,
      delta: 0,
    };
    entries.push({
      label: "COMBO",
      text: "No pattern payout. Combo resets. Combo still does not alter this spin's coins.",
      tone: "loss",
      effect: "combo-reset",
    });
    context.stages.push(createStage("combo", entries));
    return;
  }

  const highestPatternMultiplier = Math.max(...context.patternWins.map((win) => win.patternMultiplier));
  const singleMinorWin = context.patternWins.length === 1 && highestPatternMultiplier < 7;

  if (singleMinorWin) {
    context.comboPlan = {
      reset: false,
      delta: 0,
    };
    entries.push({
      label: "COMBO",
      text: "A single minor pattern pays coins, but does not build combo. Combo holds where it is.",
      tone: "neutral",
      effect: "combo-hold",
      comboDelta: 0,
      focus: mergeFocuses(context.patternWins.map((win) => win.focus)),
    });
    context.stages.push(createStage("combo", entries));
    return;
  }

  const comboDelta =
    highestPatternMultiplier >= 10
      ? 5
      : highestPatternMultiplier >= 7 || context.patternWins.length >= 3
        ? 2
        : 1;

  context.comboPlan = {
    reset: false,
    delta: comboDelta,
  };
  entries.push({
    label: "COMBO",
    text: `Pattern payout sustains combo +${comboDelta}. Combo is tracked separately and is not included in this spin's coin formula.`,
    tone: "event",
    effect: "combo-gain",
    comboDelta,
    focus: mergeFocuses(context.patternWins.map((win) => win.focus)),
  });
  context.stages.push(createStage("combo", entries));
}

function buildSummaryRows(context) {
  if (context.devilTriggered) {
    return [{
      tag: "666",
      message: "DEVIL PATTERN VOIDED ALL NORMAL WINS",
      className: "devil",
    }];
  }

  if (context.patternWins.length === 0) {
    return [{
      tag: "MISS",
      message: "NO PATTERN WIN",
      className: "lose",
    }];
  }

  return context.patternWins.slice(0, 6).map((win, index) => ({
    tag: win.patternLabel,
    message: `${win.symbolIcon} x${win.symbolMultiplier} x ${win.patternMultiplier} = +${win.winAmount}`,
    className: getSummaryClass(win, index),
  }));
}

function findPatternCandidates(grid, patterns, symbolId) {
  return patterns
    .filter((pattern) => pattern.cells.every(([column, row]) => grid[column][row].id === symbolId))
    .map((pattern) => ({
      ...pattern,
      occupiedKeys: pattern.cells.map(([column, row]) => `${column}:${row}`),
    }));
}

function selectDominantPatterns(candidates) {
  const selected = [];
  const sorted = [...candidates].sort((left, right) =>
    right.priority - left.priority ||
    right.multiplier - left.multiplier ||
    right.cells.length - left.cells.length ||
    left.id.localeCompare(right.id),
  );

  for (const candidate of sorted) {
    const blockedByHigherPattern = selected.some((picked) =>
      picked.priority > candidate.priority &&
      candidate.occupiedKeys.some((key) => picked.occupiedKeys.includes(key)),
    );

    if (blockedByHigherPattern) {
      continue;
    }

    selected.push(candidate);
  }

  return selected;
}

function calculatePatternWin({ betAmount, symbolMultiplier, patternMultiplier }) {
  return Math.floor(betAmount * symbolMultiplier * patternMultiplier);
}

function describePatternLabels(candidates) {
  const labels = [...new Set(candidates.map((candidate) => candidate.name))];
  return labels.join(" + ");
}

function getWinEmphasis(pattern, symbol) {
  if (pattern.multiplier >= 10 || symbol.special === "jackpot") {
    return "event";
  }
  if (pattern.multiplier >= 7) {
    return "gain";
  }
  return "gain";
}

function getSummaryClass(win, index) {
  if (win.patternMultiplier >= 10 || win.symbolId === "jackpot") {
    return "jp";
  }
  return `win${index % 10}`;
}

function createStage(key, entries) {
  return {
    key,
    title: STAGE_TITLES[key],
    entries,
  };
}

function createFocus({ rows = [], positions = [], symbolIds = [], color = "" }) {
  const uniqueRows = [...new Set(rows)].filter((row) => Number.isInteger(row));
  const uniquePositions = dedupePositions(positions);
  const uniqueColumns = [...new Set(uniquePositions.map(([column]) => column))];

  return {
    rows: uniqueRows,
    positions: uniquePositions,
    columns: uniqueColumns,
    symbolIds: [...new Set(symbolIds)],
    color,
  };
}

function mergeFocuses(focuses) {
  const validFocuses = focuses.filter(Boolean);
  if (validFocuses.length === 0) {
    return null;
  }

  return createFocus({
    rows: validFocuses.flatMap((focus) => focus.rows ?? []),
    positions: validFocuses.flatMap((focus) => focus.positions ?? []),
    symbolIds: validFocuses.flatMap((focus) => focus.symbolIds ?? []),
    color: validFocuses.find((focus) => focus.color)?.color ?? "",
  });
}

function dedupePositions(positions) {
  const seen = new Set();
  const uniquePositions = [];

  for (const [column, row] of positions) {
    const key = `${column}:${row}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniquePositions.push([column, row]);
  }

  return uniquePositions;
}
